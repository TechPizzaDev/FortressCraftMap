import MainFrame from "../../Core/MainFrame";
import RendererBase from "./RendererBase";
import TimedEvent from "../../Utility/TimingEvent";
import Mathx from "../../Utility/Mathx";
import { Rectangle } from "../../Utility/Shapes";
import { mat4, vec3, vec2 } from "gl-matrix";
import * as Map from "../../Core/World/Map";
import * as Content from "../../Namespaces/Content";
import ShaderProgram, { ShaderAttribPointer } from "../Shaders/ShaderProgram";
import QuadGenerator from "../QuadGenerator";
import Texture2D from "../Texture2D";

/**
 * Renders map segments that are currently visible through the viewport.
 * */
export default class MapSegmentRenderer extends RendererBase {

	private _coloredShader: ShaderProgram;
	private _coloredPosAttribPtr: ShaderAttribPointer;
	private _coloredDataAttribPtr: ShaderAttribPointer;

	private _texturedShader: ShaderProgram;
	private _texturedPosAttribPtr: ShaderAttribPointer;
	private _texturedDataAttribPtr: ShaderAttribPointer;

	private _terrainTexture: Texture2D;

	private _staticSegmentQuads: StaticSegmentQuads;
	private _terrainDataMap: Map<number, TileDescription>;
	private _defaultTileDescription: TileDescription;
	private _terrainTextureScale: number;

	private _segments: Map.SegmentCollection;
	private _viewport: Rectangle;

	private _viewMatrix = mat4.create();
	private _projMatrix = mat4.create();
	private _projViewMatrix = mat4.create();
	private _mvpMatrix = mat4.create();

	private _colorBuffer: WebGLBuffer;
	private _texCoordBuffer: WebGLBuffer;

	constructor(frame: MainFrame) {
		super(frame.glContext);

		this._segments = new Map.SegmentCollection();
	}

	public get segments(): Map.SegmentCollection { return this._segments; }
	public get viewport(): Rectangle { return this._viewport; }

	public get viewMatrix(): mat4 { return this._viewMatrix; }
	public get projMatrix(): mat4 { return this._projMatrix; }
	public get projViewMatrix(): mat4 { return this._projViewMatrix; }

	public prepare(content: Content.Manager) {
		this.prepareShaders(content);
		this._terrainTexture = content.getTexture2D("TerrainTexture");

		this._staticSegmentQuads = this.createSegmentQuads();
		this.loadTerrainData(content);

		// this is just for testing
		const colorData = new Float32Array(16 * 16 * 3 * 4);
		for (let i = 0; i < 16 * 16; i++) {
			for (let j = 0; j < 4; j++) {
				colorData[i * 12 + j * 3 + 0] = (Math.sin(i / (16.0 * 16.0) * 4) + 1) / 2;
				colorData[i * 12 + j * 3 + 1] = (Math.cos(i / (16.0 * 16.0) * 2 + j * 4) + 1) / 2;
				colorData[i * 12 + j * 3 + 2] = 1 - i / (16.0 * 16.0);
			}
		}

		const gl = this.glContext;
		this._colorBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this._colorBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, colorData, gl.STREAM_DRAW);

		this._texCoordBuffer = gl.createBuffer();
	}

	private prepareShaders(content: Content.Manager) {
		const gl = this.glContext;
		this._coloredShader = content.getShader("mapsegment-colored");
		const coloredDesc = this._coloredShader.description;
		this._coloredPosAttribPtr = ShaderAttribPointer.createFrom(gl, coloredDesc.getAttributeField("aPosition"), 2);
		this._coloredDataAttribPtr = ShaderAttribPointer.createFrom(gl, coloredDesc.getAttributeField("aColor"), 3);

		this._texturedShader = content.getShader("mapsegment-textured");
		const texturedDesc = this._texturedShader.description;
		this._texturedPosAttribPtr = ShaderAttribPointer.createFrom(gl, texturedDesc.getAttributeField("aPosition"), 2);
		this._texturedDataAttribPtr = ShaderAttribPointer.createFrom(gl, texturedDesc.getAttributeField("aTexCoord"), 2);
	}

	private loadTerrainData(content: Content.Manager) {
		this._defaultTileDescription = {
			color: vec3.fromValues(0, 0, 0),
			corners: this.cornersFromRect(0, 0, 0, 0)
		};;

		const terrainData = content.getBinaryData("TerrainData");
		const info = terrainData[0];
		this._terrainTextureScale = info.terrainTextureScale;

		const indices = terrainData[1] as ArrayLike<number>;
		const rects = terrainData[2] as ArrayLike<number>;
		this._terrainDataMap = new global.Map<number, TileDescription>();

		const entryCount = indices.length;
		for (let i = 0; i < entryCount; i++) {
			const x = rects[i];
			const y = rects[i + entryCount];
			const w = rects[i + entryCount * 2];
			const h = rects[i + entryCount * 3];

			const desc: TileDescription = {
				color: vec3.fromValues(1, 1, 1),
				corners: this.cornersFromRect(x, y, w, h)
			};
			this._terrainDataMap.set(indices[i], desc);
		}

		console.log(this._terrainDataMap);
	}

	public onViewportChanged(viewport: Rectangle) {
		this.assertNotDisposed();

		this._viewport = viewport;
		this.glContext.viewport(0, 0, viewport.width, viewport.height);

		//const s = 1 / zoom; i don't really have access to a zoom value yet ;/
		const scale = 1;
		const w = viewport.width;
		const h = viewport.height;
		mat4.ortho(this._projMatrix,
			scale * -w / 2,
			scale * w / 2,
			scale * h / 2,
			scale * -h / 2,
			0.001, 10);
	}

	public draw(time: TimedEvent) {

		const gl = this.glContext;
		gl.clearColor(0, 0, 0, 0);
		gl.clear(this.glContext.COLOR_BUFFER_BIT);

		this.updateMainMatrices();
		this.drawSegments(time);
	}

	private updateMainMatrices() {
		// _viewMatrix = identity
		mat4.identity(this._viewMatrix);

		const scale = vec3.fromValues(1, 1, 1);
		mat4.scale(this._viewMatrix, this._viewMatrix, scale);

		const translation = vec3.fromValues(0, -8, 0);
		mat4.translate(this._viewMatrix, this._viewMatrix, translation);

		// _projViewMatrix = _projMatrix * _viewMatrix
		mat4.multiply(this._projViewMatrix, this._projMatrix, this._viewMatrix);
	}

	private drawSegments(time: TimedEvent) {
		//let chunkUploadsLeft = currentSegmentUploadsPerFrame;
		//const isTextured = zoom > 1 / 12 && tileTexture.isLoaded;
		//if (isMapTextured !== isTextured) {
		//	isMapTextured = isTextured;
		//	for (const segment of segmentMap.values()) {
		//		if (immediateUploadsOnDetailChange) {
		//			if (!segment.isDirty)
		//				buildAndUploadSegment(segment, isTextured);
		//		}
		//		else
		//			segment.markDirty(true);
		//	}
		//
		//	// skip building more chunks this frame
		//	if (immediateUploadsOnDetailChange)
		//		chunkUploadsLeft = 0;
		//}

		const gl = this.glContext;
		const isTextured = true;
		const shader = isTextured ? this.bindTexturedShader() : this.bindColoredShader();
		const posAttribPtr = isTextured ? this._texturedPosAttribPtr : this._coloredPosAttribPtr;
		const dataAttribPtr = isTextured ? this._texturedDataAttribPtr : this._coloredDataAttribPtr;

		shader.uniform4fv("uTint", [1.0, 1.0, 1.0, 1.0]);

		// vertices are constant and only need this single bind
		gl.bindBuffer(gl.ARRAY_BUFFER, this._staticSegmentQuads.vertexBuffer);
		posAttribPtr.enable(gl);
		posAttribPtr.apply(gl);

		// indices are also constant
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._staticSegmentQuads.indexBuffer);

		dataAttribPtr.enable(gl);
		this.drawVisibleSegments(this._viewport, shader, dataAttribPtr);

		//if (segment.isDirty && chunkUploadsLeft > 0) {
		//	buildAndUploadSegment(segment, isTextured);
		//	chunkUploadsLeft--;
		//}
		//
		//if (!segment.isDirty) {
		//	segment.alpha += delta / fadeDuration;
		//	drawSegment(segment, shader, locationName);
		//}
	}

	private drawVisibleSegments(view: Rectangle, shader: ShaderProgram, pointer: ShaderAttribPointer) {
		// TODO: fix counts, they are just randomly half-hardcoded right now :/

		for (const pair of this._segments.rows()) {
			for (const segment of pair[1].values())
				// we finally have the visible segments here
				this.drawSegment(segment, shader, pointer);
		}

		return;
		const rowOffset = Math.ceil(view.y / Map.Segment.size);
		const rowCount = Math.ceil(view.height / 4 / Map.Segment.size);

		const columnOffset = Math.ceil(view.x / Map.Segment.size);
		const columnCount = Math.ceil(view.width / 4 / Map.Segment.size);

		for (let i = 0; i < rowCount; i++) {
			const segmentZ = i + rowOffset - 5;
			const row = this._segments.getRow(segmentZ);
			if (!row)
				continue;

			for (let j = 0; j < columnCount; j++) {
				const segmentX = j + columnOffset - 5;
				const segment = row.get(segmentX);
				if (segment != null) {
					// we finally have the visible segments here
					this.drawSegment(segment, shader, pointer);
				}
			}
		}
	}

	private tmpTexCoordData = new Float32Array(16 * 16 * 2 * 4);

	private drawSegment(segment: Map.Segment, shader: ShaderProgram, pointer: ShaderAttribPointer) {
		const gl = this.glContext;
		gl.bindBuffer(gl.ARRAY_BUFFER, segment.texCoordBuffer);

		if (!segment.hasTexCoords) {
			this.generateTexCoords(segment.tiles, 16, this.tmpTexCoordData);
			gl.bufferData(gl.ARRAY_BUFFER, this.tmpTexCoordData, gl.STREAM_DRAW);
			segment.hasTexCoords = true;
		}

		mat4.multiply(this._mvpMatrix, this._projViewMatrix, segment.matrix);
		shader.uniformMatrix4fv("uModelViewProjection", this._mvpMatrix);
		shader.uniform4f("uTint", 0.5, 0.5, 1, 1);

		pointer.apply(gl);
		gl.drawElements(gl.TRIANGLES, this._staticSegmentQuads.indexCount, gl.UNSIGNED_SHORT, 0);
	}

	/** Prepares the needed texture and binds the shader program for textured segments. */
	private bindTexturedShader(): ShaderProgram {
		const gl = this.glContext;
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this._terrainTexture.glTexture);

		const shader = this._texturedShader;
		shader.useProgram();
		shader.uniform1i("uTexture", 0); // texture unit 0
		return shader;
	}

	/** Binds the shader program for colored segments. */
	private bindColoredShader(): ShaderProgram {
		const shader = this._coloredShader;
		shader.useProgram();
		return shader;
	}

	private createSegmentQuads(): StaticSegmentQuads {
		const quadData = QuadGenerator.generatePlane(Map.Segment.size, Map.Segment.size);

		const gl = this.glContext;
		const vertexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, quadData.vertices, gl.STATIC_DRAW);

		const indexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, quadData.indices, gl.STATIC_DRAW);

		return {
			vertexBuffer,
			indexBuffer,
			indexCount: quadData.indices.length
		};
	}

	protected destroy() {

	}

	private _tileDescGetFailures = new global.Map<number, void>();

	private getTileDescription(tile: number): TileDescription {
		if (!this._terrainDataMap.has(tile)) {
			if (!this._tileDescGetFailures.has(tile)) {
				console.warn(`Failed to get description for tile '${tile}'.`);
				this._tileDescGetFailures.set(tile, null);
			}
			return this._defaultTileDescription;
		}
		return this._terrainDataMap.get(tile);
	}

	private generateTexCoords(tiles: Uint16Array, size: number, output: Float32Array) {
		for (let y = 0; y < size; y++) {
			for (let x = 0; x < size; x++) {
				const i = x + y * size;
				const tileDesc = this.getTileDescription(tiles[i]);
				this.writeCornersToOutput(output, i * 8, tileDesc.corners);
			}
		}
	}

	private writeCornersToOutput(output: Float32Array, offset: number, corners: Corners) {
		// top left
		output[offset + 0] = corners.TL[0];
		output[offset + 1] = corners.TL[1];

		// top right
		output[offset + 2] = corners.BR[0];
		output[offset + 3] = corners.TL[1];

		// bottom right
		output[offset + 4] = corners.TL[0];
		output[offset + 5] = corners.BR[1];

		// bottom left
		output[offset + 6] = corners.BR[0];
		output[offset + 7] = corners.BR[1];
	}

	private cornersFromRect(x: number, y: number, w: number, h: number): Corners {
		// remember to scale down coordinates as they are
		// for the full-res terrain texture but the server
		// may serve us a different size
		const texelW = 1.0 / this._terrainTexture.width * this._terrainTextureScale;
		const texelH = 1.0 / this._terrainTexture.height * this._terrainTextureScale;

		x *= texelW;
		y *= texelH;
		w *= texelW;
		h *= texelH;

		return {
			TL: vec2.fromValues(x, y),
			BR: vec2.fromValues(x + w, y + h)
		};
	}
}

interface Corners {
	readonly TL: vec2;
	readonly BR: vec2;
}

interface TileDescription {

	readonly color: vec3;
	readonly corners: Corners;
}

interface StaticSegmentQuads {

	readonly vertexBuffer: WebGLBuffer,

	readonly indexBuffer: WebGLBuffer,

	readonly indexCount: number
}