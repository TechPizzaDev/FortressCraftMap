import MainFrame from "../../Core/MainFrame";
import RendererBase from "./RendererBase";
import TimedEvent from "../../Utility/TimingEvent";
import Mathx from "../../Utility/Mathx";
import { Rectangle } from "../../Utility/Shapes";
import { mat4, vec3 } from "gl-matrix";
import * as Map from "../../Core/World/Map";
import * as Content from "../../Namespaces/Content";
import ShaderProgram from "../Shaders/ShaderProgram";
import QuadGenerator from "../QuadGenerator";
import Texture2D from "../Texture2D";

/**
 * Renders map segments that are currently visible through the viewport.
 * */
export default class MapSegmentRenderer extends RendererBase {

	private _coloredShader: ShaderProgram;
	private _terrainTexture: Texture2D;
	private _staticSegmentQuads: StaticSegmentQuads;

	private _segments: Map.SegmentCollection;
	private _viewport: Rectangle;

	private _viewMatrix: mat4;
	private _projMatrix: mat4;
	private _projViewMatrix: mat4;

	private _colorBuffer: WebGLBuffer;

	constructor(frame: MainFrame) {
		super(frame.glContext);
		
		this._segments = new Map.SegmentCollection();

		this._viewMatrix = mat4.create();
		this._projMatrix = mat4.create();
		this._projViewMatrix = mat4.create();
	}

	public get segments(): Map.SegmentCollection { return this._segments; }
	public get viewport(): Rectangle { return this._viewport; }

	public get viewMatrix(): mat4 { return this._viewMatrix; }
	public get projMatrix(): mat4 { return this._projMatrix; }
	public get projViewMatrix(): mat4 { return this._projViewMatrix; }

	public prepare(content: Content.Manager) {
		this._coloredShader = content.getShader("mapsegment-colored");
		this._terrainTexture = content.getTexture2D("TB_diffuse_64"); // TODO: change texture path and name on the server

		this._staticSegmentQuads = this.createSegmentQuads();

		const colorData = new Float32Array(16 * 16 * 3 * 4);
		for (let i = 0; i < 16 * 16; i++) {
			for (let j = 0; j < 4; j++) {
				colorData[i * 12 + j * 3 + 0] = i / (16.0 * 16.0);
				colorData[i * 12 + j * 3 + 1] = i / (16.0 * 16.0);
				colorData[i * 12 + j * 3 + 2] = i / (16.0 * 16.0);
			}
		}
		const gl = this.glContext;
		this._colorBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this._colorBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, colorData, gl.STREAM_DRAW);
	}

	public onViewportChanged(viewport: Rectangle) {
		this.assertNotDisposed();

		this._viewport = viewport;
		this.glContext.viewport(0, 0, viewport.width, viewport.height);

		//const s = 1 / zoom; i don't really have access to a zoom value yet ;/
		const scale = 2;
		const w = viewport.width;
		const h = viewport.height;
		mat4.ortho(this._projMatrix,
			scale * -w / 2,
			scale * w / 2,
			scale * h / 2,
			scale * -h / 2,
			0.001, 10);
	}

	private translation = vec3.create();

	public draw(time: TimedEvent) {
		this.assertNotDisposed();

		this.updateMatrices();

		const gl = this.glContext;
		gl.clearColor(0, 0, 0, 0);
		gl.clear(this.glContext.COLOR_BUFFER_BIT);

		const shader = this.bindColoredShader();

		// bind indices
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._staticSegmentQuads.indexBuffer);

		this.translation[0] = Math.sin(time.total * 0.5) * 256;
		this.translation[1] = -256;
		this.translation[2] = 0;

		const segmentMatrix = mat4.create();
		mat4.fromTranslation(segmentMatrix, this.translation);

		const mvpMatrix = mat4.create();
		mat4.multiply(mvpMatrix, this._projViewMatrix, segmentMatrix);

		gl.uniformMatrix4fv(
			shader.description.getUniform("uModelViewProjection"), false, mvpMatrix);

		gl.uniform4f(
			shader.description.getUniform("uTint"), 0.5, 0.5, 1, 1);

		gl.bindBuffer(gl.ARRAY_BUFFER, this._colorBuffer);

		const colorLocation = shader.description.getAttribute("aColor");
		gl.enableVertexAttribArray(colorLocation);
		gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 0);

		gl.drawElements(gl.TRIANGLES, this._staticSegmentQuads.indexCount, gl.UNSIGNED_SHORT, 0);

		//this.drawSegments(time);
	}

	private updateMatrices() {
		// _viewMatrix = identity
		mat4.identity(this._viewMatrix);

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

		//const shader = isTextured ? bindTexturedSegmentShader() : bindColoredSegmentShader();
		//const locationName = isTextured ? "texCoord" : "color";
		//GL.enableVertexAttribArray(shader.locations[locationName]);

		this.drawVisibleSegments(this._viewport);

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

	private drawVisibleSegments(view: Rectangle) {
		// TODO: fix counts, they are just randomly half-hardcoded right now :/

		const rowOffset = Mathx.toBigInt(Math.ceil(view.y / Map.Segment.size));
		const rowCount = Math.ceil(view.height / 4 / Map.Segment.size);

		const columnOffset = Mathx.toBigInt(Math.ceil(view.x / Map.Segment.size));
		const columnCount = Math.ceil(view.width / 4 / Map.Segment.size);

		for (let i = 0; i < rowCount; i++) {
			const segmentZ = Mathx.toBigInt(i) + rowOffset;
			const row = this._segments.getRow(segmentZ);
			if (!row)
				continue;

			for (let j = 0; j < columnCount; j++) {
				const segmentX = Mathx.toBigInt(j) + columnOffset;
				const segment = row.get(segmentX);
				if (segment != null) {
					// we finally have the visible segments here

					//console.log("seg pos:", segment.position);
				}
			}
		}
	}

	
	private bindTexturedShader() {

		//// bind tile texture
		//GL.activeTexture(GL.TEXTURE0);
		//GL.bindTexture(GL.TEXTURE_2D, tileTexture.texture);
		//
		//// prepare shader
		//GL.useProgram(texturedSegmentShader.program);
		//GL.uniform4fv(texturedSegmentShader.uniforms.tint, [1.0, 1.0, 1.0, 1.0]);
		//GL.uniform1i(texturedSegmentShader.uniforms.textureSampler, 0); // texture unit 0
		//
		//// bind vertices
		//GL.bindBuffer(GL.ARRAY_BUFFER, staticSegmentQuads.vertexBuffer);
		//GL.enableVertexAttribArray(texturedSegmentShader.locations.vertexPosition);
		//GL.vertexAttribPointer(texturedSegmentShader.locations.vertexPosition, 2, GL.FLOAT, false, 0, 0);
		//
		//return texturedSegmentShader;
	}

	/** Prepares uniforms and binds the shader program for colored segments. */
	private bindColoredShader(): ShaderProgram {
		// prepare shader
		const shader = this._coloredShader;
		shader.useProgram();
		shader.uniform4fv("uTint", [1.0, 1.0, 1.0, 1.0]);
		
		// bind vertices
		const gl = shader.glContext;
		const positionLocation = shader.description.getAttribute("aPosition");
		gl.bindBuffer(gl.ARRAY_BUFFER, this._staticSegmentQuads.vertexBuffer);
		gl.enableVertexAttribArray(positionLocation);
		gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

		return shader;
	}

	private createSegmentQuads(): StaticSegmentQuads {
		const quadData = QuadGenerator.generatePlane(Map.Segment.size, Map.Segment.size, 64);

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
}

interface StaticSegmentQuads {

	readonly vertexBuffer: WebGLBuffer,

	readonly indexBuffer: WebGLBuffer,

	readonly indexCount: number
}