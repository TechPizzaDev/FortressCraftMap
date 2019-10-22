import MainFrame from "../../Core/MainFrame";
import RendererBase from "./RendererBase";
import TimeEvent from "../../Utility/TimeEvent";
import { Rectangle } from "../../Utility/Shapes";
import { mat4, vec3, vec2 } from "gl-matrix";
import * as Content from "../../Namespaces/Content";
import ShaderProgram, { ShaderAttribPointer } from "../Shaders/ShaderProgram";
import ShapeGenerator, { QuadDataMetrics } from "../ShapeGenerator";
import Texture2D from "../Texture2D";
import RenderSegmentCollection from "../RenderSegmentCollection";
import MapSegment from "../../Core/World/MapSegment";
import RenderSegment from "../RenderSegment";
import ContentRegistry from "../../Content/ContentRegistry";

/**
 * Renders map segments that are currently visible through the viewport.
 * */
export default class MapSegmentRenderer extends RendererBase {

	private _frame: MainFrame;

	private _coloredShader: ShaderProgram;
	private _coloredPosAttribPtr: ShaderAttribPointer;
	private _coloredDataAttribPtr: ShaderAttribPointer;

	private _texturedShader: ShaderProgram;
	private _texturedPosAttribPtr: ShaderAttribPointer;
	private _texturedDataAttribPtr: ShaderAttribPointer;

	private _tbDiffuseTexture: Texture2D;

	private _bakedSegmentQuads: BakedRenderSegmentQuads;
	//private _texCoordDataBuffer: Float32Array;
	//private _colorDataBuffer: Float32Array;
	private _renderDataBuffer: Float32Array;
	private _indexDataBuffer: Uint16Array;
	
	private _terrainUVMap: Map<number, TileDescription>;
	private _defaultTileDescription: TileDescription;

	private _renderSegments: RenderSegmentCollection;
	private _viewport: Rectangle;

	private _segmentsDrawn = 0;
	private _renderSegmentsDrawn = 0;

	// TODO: texture-to-color threshold should be around less than 6 pixels per quad
	public readonly _zoom = 1 / 0.75    * (4 / 3) * 1;
	public _mapTranslation = vec3.create();

	private _viewMatrix = mat4.create();
	private _projMatrix = mat4.create();
	private _projViewMatrix = mat4.create();
	private _mvpMatrix = mat4.create();

	constructor(frame: MainFrame) {
		super(frame.glCtx);
		this._frame = frame;

		this._renderSegments = new RenderSegmentCollection();
	}

	public get segments(): RenderSegmentCollection { return this._renderSegments; }
	public get viewport(): Rectangle { return this._viewport; }

	public get viewMatrix(): mat4 { return this._viewMatrix; }
	public get projMatrix(): mat4 { return this._projMatrix; }
	public get projViewMatrix(): mat4 { return this._projViewMatrix; }

	public get segmentsDrawnLastFrame(): number { return this._segmentsDrawn; }
	public get renderSegmentsDrawnLastFrame(): number { return this._renderSegmentsDrawn; }

	public prepare(content: Content.Manager) {
		this.prepareShaders(content);
		this._tbDiffuseTexture = content.getTexture2D(ContentRegistry.TerrainTexture);

		this._bakedSegmentQuads = this.bakeSegmentQuads();
		//this._texCoordDataBuffer = new Float32Array(this._bakedSegmentQuads.metricsPerSegment.vertexCount * 2 * RenderSegment.blockSize);
		// buffer size should suffice for both 
		this._renderDataBuffer = new Float32Array(this._bakedSegmentQuads.metricsPerSegment.vertexCount * 3 * RenderSegment.blockSize);
		this._indexDataBuffer = new Uint16Array(this._bakedSegmentQuads.metricsPerSegment.indexCount * RenderSegment.blockSize);
		this.loadTerrainUV(content);
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

	private loadTerrainUV(content: Content.Manager) {
		this._defaultTileDescription = {
			color: vec3.fromValues(0, 0, 0),
			corners: this.createCorners(0, 0, 0, 0)
		};;

		const terrainUV = content.getMessagePack("TerrainUV");
		const indices = terrainUV[0] as ArrayLike<number>;
		const rects = terrainUV[1] as ArrayLike<number>;
		this._terrainUVMap = new Map<number, TileDescription>();

		const entryCount = indices.length;
		for (let i = 0; i < entryCount; i++) {
			const x = rects[i];
			const y = rects[i + entryCount];
			const z = rects[i + entryCount * 2];
			const w = rects[i + entryCount * 3];

			const desc: TileDescription = {
				color: vec3.fromValues(Math.random(), Math.random(), Math.random()),
				corners: this.createCorners(x, y, z, w)
			};
			this._terrainUVMap.set(indices[i], desc);
		}
		console.log("Parsed UV:", this._terrainUVMap);
	}

	public onViewportChanged(viewport: Rectangle) {
		this.assertNotDisposed();

		this._viewport = viewport;
		this.glContext.viewport(0, 0, viewport.width, viewport.height);

		//const s = 1 / zoom; i don't really have access to a zoom value yet ;/
		
		const w = viewport.width;
		const h = viewport.height;
		mat4.ortho(this._projMatrix,
			this._zoom * -w / 2,
			this._zoom * w / 2,
			this._zoom * h / 2,
			this._zoom * -h / 2,
			0.001, 10);
	}

	public draw(time: TimeEvent) {

		const gl = this.glContext;
		gl.clearColor(0, 0, 0, 0);
		gl.clear(this.glContext.COLOR_BUFFER_BIT);

		this.updateMatrices();
		this.drawSegments(time);
	}

	private updateMatrices() {
		// _viewMatrix = identity
		mat4.identity(this._viewMatrix);

		const scale = vec3.fromValues(1, 1, 1);
		mat4.scale(this._viewMatrix, this._viewMatrix, scale);

		mat4.translate(this._viewMatrix, this._viewMatrix, this._mapTranslation);

		// _projViewMatrix = _projMatrix * _viewMatrix
		mat4.multiply(this._projViewMatrix, this._projMatrix, this._viewMatrix);
	}

	private isTextured = false;

	private drawSegments(time: TimeEvent) {
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

		this._segmentsDrawn = 0;
		this._renderSegmentsDrawn = 0;
		
		const gl = this.glContext;
		const shader = this.isTextured ? this.bindTexturedShader() : this.bindColoredShader();
		const posAttribPtr = this.isTextured ? this._texturedPosAttribPtr : this._coloredPosAttribPtr;
		const dataAttribPtr = this.isTextured ? this._texturedDataAttribPtr : this._coloredDataAttribPtr;

		posAttribPtr.enable(gl);
		dataAttribPtr.enable(gl);

		shader.uniform4fv("uTint", [1.0, 1.0, 1.0, 1.0]);

		// vertices are constant and only need this single bind
		gl.bindBuffer(gl.ARRAY_BUFFER, this._bakedSegmentQuads.vertexBuffer);
		posAttribPtr.apply(gl);

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

	private clearDrawCtx() {
		this._frame.drawCtx.setTransform(1, 0, 0, 1, 0, 0);

		this._frame.drawCtx.clearRect(
			this._viewport.x, this._viewport.y, this._viewport.width, this._viewport.height);

		this._frame.drawCtx.translate(
			Math.round(this._viewport.width / 2) + 0.5 + this._mapTranslation[0] / this._zoom,
			Math.round(this._viewport.height / 2) + 0.5 + this._mapTranslation[1] / this._zoom);
	}

	private drawVisibleSegments(view: Rectangle, shader: ShaderProgram, pointer: ShaderAttribPointer) {
		// TODO: fix counts, they are just randomly half-hardcoded right now :/

		//this.clearDrawCtx();

		// TODO: currently draws every render segment
		for (const rowMap of this._renderSegments.rows()) {
			for (const renderSegment of rowMap.values())
				this.drawRenderSegment(renderSegment, shader, pointer);
		}

		return;

		const rowOffset = Math.ceil(view.y / MapSegment.size);
		const rowCount = Math.ceil(view.height / 4 / MapSegment.size);

		const columnOffset = Math.ceil(view.x / MapSegment.size);
		const columnCount = Math.ceil(view.width / 4 / MapSegment.size);

		for (let i = 0; i < rowCount; i++) {
			const segmentZ = i + rowOffset - 5;
			const row = this._renderSegments.getRow(segmentZ);
			if (!row)
				continue;

			for (let j = 0; j < columnCount; j++) {
				const segmentX = j + columnOffset - 5;
				const segment = row.get(segmentX);
				if (segment != null) {
					// we finally have the visible segments here
					this.drawRenderSegment(segment, shader, pointer);
				}
			}
		}
	}

	private x = 0;

	private drawRenderSegment(renderSegment: RenderSegment, shader: ShaderProgram, dataPointer: ShaderAttribPointer) {
		const gl = this.glContext;
		const metricsPS = this._bakedSegmentQuads.metricsPerSegment;
		const indicesPerSegment = metricsPS.indexCount;

		//const drawing = this._frame.drawCtx;
		//drawing.lineWidth = 1;
		//drawing.beginPath();
		//drawing.strokeStyle = "rgba(0, 255, 0, 1)";
		//for (let z = 0; z < RenderSegment.size; z++) {
		//	for (let x = 0; x < RenderSegment.size; x++) {
		//		const segment = renderSegment.getSegment(x, z);
		//		if (segment == null)
		//			continue;
		//
		//		drawing.rect(
		//			(x * MapSegment.size + renderSegment.x * RenderSegment.size * MapSegment.size) / this._zoom + 2,
		//			(z * MapSegment.size + renderSegment.z * RenderSegment.size * MapSegment.size) / this._zoom + 2,
		//			16 / this._zoom - 4,
		//			16 / this._zoom - 4);
		//	}
		//}
		//drawing.closePath();
		//drawing.stroke();

		if (!renderSegment.isUpToDate) {
			renderSegment.genCount = 0;

			for (let z = 0; z < RenderSegment.size; z++) {
				for (let x = 0; x < RenderSegment.size; x++) {
					const segment = renderSegment.getSegment(x, z);
					if (segment == null)
						continue;

					const bakedSegmentIndex = x + z * RenderSegment.size;
					const tileOffset = bakedSegmentIndex * MapSegment.blocks;

					// generate render data for this segment
					if (this.isTextured) {
						this.generateTexCoords(segment.tiles, MapSegment.size, tileOffset, this._renderDataBuffer);
					}
					else {
						this.generateColors(segment.tiles, MapSegment.size, tileOffset, this._renderDataBuffer);
					}

					// copy baked indices for this segment
					const bakedIndexBegin = bakedSegmentIndex * indicesPerSegment;
					const indexSlice = this._bakedSegmentQuads.indexData.subarray(bakedIndexBegin, bakedIndexBegin + indicesPerSegment);

					const resultIndexOffset = renderSegment.genCount * indicesPerSegment;
					this._indexDataBuffer.set(indexSlice, resultIndexOffset);

					const vertexOffset = bakedSegmentIndex * metricsPS.vertexCount;
					for (let j = 0; j < indicesPerSegment; j++)
						this._indexDataBuffer[j + resultIndexOffset] += vertexOffset;

					renderSegment.genCount++;
				}
			}
			this._frame._fastPendingDebugInfo.segmentsBuilt += renderSegment.genCount;
			this._frame._fastPendingDebugInfo.segmentBatchesBuilt++;

			// only update buffers when there is segment data
			if (renderSegment.genCount > 0) {
				gl.bindBuffer(gl.ARRAY_BUFFER, renderSegment.renderDataBuffer);
				gl.bufferData(gl.ARRAY_BUFFER, this._renderDataBuffer, gl.DYNAMIC_DRAW);

				const indexSlice = this._indexDataBuffer.subarray(0, renderSegment.genCount * indicesPerSegment);
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderSegment.indexBuffer);
				gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexSlice, gl.DYNAMIC_DRAW);
			}
			renderSegment.isUpToDate = true;
		}

		// only draw if there are segments in the batch
		const hideFull = renderSegment.genCount != RenderSegment.blockSize;
		if (renderSegment.genCount > 0 && hideFull) {
			mat4.multiply(this._mvpMatrix, this._projViewMatrix, renderSegment.matrix);
			shader.uniformMatrix4fv("uModelViewProjection", this._mvpMatrix);
			shader.uniform4f("uTint", 0.5, 0.5, 1, 1);

			gl.bindBuffer(gl.ARRAY_BUFFER, renderSegment.renderDataBuffer);
			dataPointer.apply(gl);

			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderSegment.indexBuffer);
			gl.drawElements(gl.TRIANGLES, renderSegment.genCount * indicesPerSegment, gl.UNSIGNED_SHORT, 0);

			this._segmentsDrawn += renderSegment.genCount;
			this._renderSegmentsDrawn++;
		}

		//drawing.strokeStyle = "rgba(200, 0, 0, 0.5)";
		//drawing.strokeRect(
		//	renderSegment.x * RenderSegment.size * MapSegment.size / this._zoom,
		//	renderSegment.z * RenderSegment.size * MapSegment.size / this._zoom,
		//	16 / this._zoom * RenderSegment.size, 16 / this._zoom * RenderSegment.size);
	}

	/** Prepares the needed texture and binds the shader program for textured segments. */
	private bindTexturedShader(): ShaderProgram {
		const gl = this.glContext;
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this._tbDiffuseTexture.glTexture);

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

	private bakeSegmentQuads(): BakedRenderSegmentQuads {
		const gl = this.glContext;
		const metricsPerSegment = ShapeGenerator.getQuadMetrics(MapSegment.size, MapSegment.size);
		const vertexData = new Float32Array(metricsPerSegment.vertexCount * 2 * RenderSegment.blockSize);
		const indexData = new Uint16Array(metricsPerSegment.indexCount * RenderSegment.blockSize);

		const planeBuffer = ShapeGenerator.createPlane(MapSegment.size, MapSegment.size);
		for (let z = 0; z < RenderSegment.size; z++) {
			for (let x = 0; x < RenderSegment.size; x++) {
				const posOffset = vec2.fromValues(x * MapSegment.size, z * MapSegment.size);
				const plane = ShapeGenerator.generatePlane(MapSegment.size, MapSegment.size, posOffset, 1, planeBuffer);

				const i = x + z * RenderSegment.size;
				vertexData.set(plane.vertices, i * metricsPerSegment.vertexCount * 2);
				indexData.set(plane.indices, i * metricsPerSegment.indexCount);
			}
		}

		const vertexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

		return {
			vertexBuffer,
			indexData,
			metricsPerSegment: metricsPerSegment
		};
	}

	protected destroy() {

	}

	private _tileDescGetFailures = new Map<number, void>();

	private getTileDescription(tile: number): TileDescription {
		if (!this._terrainUVMap.has(tile)) {
			if (!this._tileDescGetFailures.has(tile)) {
				console.warn(`Failed to get description for tile '${tile}'.`);
				this._tileDescGetFailures.set(tile, null);
			}
			return this._defaultTileDescription;
		}
		return this._terrainUVMap.get(tile);
	}

	/**
	 * Used to generate texture coordinates for a square array of tiles.
	 * @param tiles The tiles used to determine texture coordinates.
	 * @param size The dimensions of the tiles.
	 * @param offset The offset in quads for texture coordinates.
	 * @param output The output for texture coordinates.
	 */
	private generateTexCoords(tiles: Uint16Array, size: number, offset: number, output: Float32Array) {
		const texCoordsPerQuad = 2 * 4;
		for (let y = 0; y < size; y++) {
			for (let x = 0; x < size; x++) {
				const i = x + y * size;
				const tileDesc = this.getTileDescription(tiles[i]);

				const dataOffset = (i + offset) * texCoordsPerQuad;
				this.writeTexCoordCornersToOutput(dataOffset, tileDesc.corners, output);
			}
		}
	}

	/**
	 * Used to generate colors for a square array of tiles.
	 * @param tiles The tiles used to determine colors.
	 * @param size The dimensions of the tiles.
	 * @param offset The offset in quads for colors.
	 * @param output The output for colors.
	 */
	private generateColors(tiles: Uint16Array, size: number, offset: number, output: Float32Array) {
		const colorsPerQuad = 3 * 4;
		for (let y = 0; y < size; y++) {
			for (let x = 0; x < size; x++) {
				const i = x + y * size;
				const tileDesc = this.getTileDescription(tiles[i]);

				const dataOffset = (i + offset) * colorsPerQuad;
				this.writeColorCornersToOutput(dataOffset, tileDesc.color, output);
			}
		}
	}

	private writeColorCornersToOutput(offset: number, color: vec3, output: Float32Array) {
		for (let i = 0; i < 4; i++) {
			output[offset + i * 3 + 0] = color[0];
			output[offset + i * 3 + 1] = color[1];
			output[offset + i * 3 + 2] = color[2];
		}
	}

	private writeTexCoordCornersToOutput(offset: number, corners: UVCorners, output: Float32Array) {
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

	private createCorners(x: number, y: number, z: number, w: number): UVCorners {
		return {
			TL: vec2.fromValues(x, y),
			BR: vec2.fromValues(z, w)
		};
	}

	private createCornersFromRect(x: number, y: number, w: number, h: number): UVCorners {
		const texelW = 1.0 / this._tbDiffuseTexture.width;
		const texelH = 1.0 / this._tbDiffuseTexture.height;

		x *= texelW;
		y *= texelH;
		w *= texelW;
		h *= texelH;

		return this.createCorners(x, y, x + w, y + h);
	}
}

interface UVCorners {
	readonly TL: vec2;
	readonly BR: vec2;
}

interface TileDescription {
	readonly color: vec3;
	readonly corners: UVCorners;
}

interface BakedRenderSegmentQuads {

	readonly vertexBuffer: WebGLBuffer,

	readonly indexData: Uint16Array,

	readonly metricsPerSegment: QuadDataMetrics
}