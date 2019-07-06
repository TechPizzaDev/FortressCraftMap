import MainFrame from "../../Core/MainFrame";
import RendererBase from "./RendererBase";
import TimedEvent from "../../Utility/TimingEvent";
import Mathx from "../../Utility/Mathx";
import { Rectangle } from "../../Utility/Shapes";
import { mat4 } from "gl-matrix";
import * as Map from "../../Core/World/Map";

/**
 * Renders map segments that are currently visible through the viewport.
 * */
export default class MapSegmentRenderer extends RendererBase {

	private _segments: Map.SegmentCollection;
	private _viewport: Rectangle;

	private _viewMatrix: mat4;
	private _projMatrix: mat4;
	private _projViewMatrix: mat4;

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

	public onViewportChanged(viewport: Rectangle) {
		this.assertNotDisposed();

		this._viewport = viewport;
		this.glContext.viewport(0, 0, viewport.width, viewport.height);

		//const z = 1 / zoom; i don't really have access to a zoom value yet ;/
		const z = 1;
		const w = viewport.width;
		const h = viewport.height;
		mat4.ortho(this._projMatrix,
			z * -w / 2,
			z * w / 2,
			z * h / 2,
			z * -h / 2,
			0.001, 10);
	}

	public draw(time: TimedEvent) {
		this.assertNotDisposed();

		this.glContext.clearColor(0, 0, 0, 0);
		this.glContext.clear(this.glContext.COLOR_BUFFER_BIT);



		this.updateMatrices();
		this.drawSegments(time);
	}

	private updateMatrices() {
		// _viewMatrix = identity
		mat4.identity(this._viewMatrix);

		// _projViewMatrix = projection * view
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

	protected destroy() {

	}
}