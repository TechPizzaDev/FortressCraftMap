import MapSegment, { MapSegmentPos, NumberOrPos } from "../Core/World/MapSegment";
import { mat4, vec3 } from "gl-matrix";
import GLResource from "../Graphics/GLResource";
import GLHelper from "./GLHelper";
import { BakedRenderSegmentQuads } from "./Renderers/MapSegmentRenderer";

export default class RenderSegment extends GLResource {

	/** The dimensions of a RenderSegment. */
	public static readonly size = 8;

	/** The amount of segments that can be stored in a RenderSegment. */
	public static readonly blockSize = RenderSegment.size * RenderSegment.size;

	private _segments: MapSegment[];
	private _segmentCount: number;

	private _vertexBuffer: WebGLBuffer;
	private _renderDataBuffer: WebGLBuffer;

	public readonly matrix: mat4;
	public readonly x: number;
	public readonly z: number;

	public isDirty: boolean;
	public genCount: number;

	constructor(
		gl: WebGLRenderingContext,
		quads: BakedRenderSegmentQuads,
		x: number | MapSegmentPos,
		z?: number) {

		if (!(x instanceof MapSegmentPos) && z == null)
			throw new SyntaxError("'z' may not be null if 'x' is not a MapSegmentPos.");

		super(gl);
		if (x instanceof MapSegmentPos) {
			this.x = x.renderX;
			this.z = x.renderZ;
		}
		else {
			this.x = x;
			this.z = z;
		}

		this._segments = [];
		this._segmentCount = 0;

		this.isDirty = false;
		this.genCount = 0;

		const vertexBytes = RenderSegment.blockSize * quads.metricsPerSegment.vertexCount * 2 * Float32Array.BYTES_PER_ELEMENT;
		this._vertexBuffer = GLHelper.createBufferWithLength(gl, gl.ARRAY_BUFFER, vertexBytes, gl.DYNAMIC_DRAW);
		const renderDataBytes = RenderSegment.blockSize * quads.metricsPerSegment.vertexCount * 3 * Float32Array.BYTES_PER_ELEMENT;
		this._renderDataBuffer = GLHelper.createBufferWithLength(gl, gl.ARRAY_BUFFER, renderDataBytes, gl.DYNAMIC_DRAW);
		
		this.matrix = mat4.create();
		mat4.translate(this.matrix, this.matrix, vec3.fromValues(
			this.x * MapSegment.size * RenderSegment.size,
			this.z * MapSegment.size * RenderSegment.size,
			0));
	}

	public get segmentCount(): number {
		return this._segmentCount;
	}

	public setSegmentAt(index: number, segment: MapSegment) {
		const existing = this._segments[index];
		if (existing != null && segment == null)
			this._segmentCount--;
		else if (existing == null && segment != null)
			this._segmentCount++;

		this._segments[index] = segment;
		this.isDirty = true;
	}

	public setSegment(x: number, z: number, segment: MapSegment) {
		const i = RenderSegment.getIndex(x, z);
		this.setSegmentAt(i, segment);
	}

	public getSegmentAt(index: number): MapSegment {
		return this._segments[index];
	}

	/**
	 * Gets a MapSegment by coordinates.
	 * @param x The x coordinate.
	 * @param z The z coordinate.
	 */
	public getSegment(x: number, z: number): MapSegment {
		const i = RenderSegment.getIndex(x, z);
		return this.getSegmentAt(i);
	}

	public static getIndex(x: number, z: number): number {
		const rMinOne = RenderSegment.size - 1;
		if (x < 0)
			x = rMinOne - Math.abs(x - rMinOne) % RenderSegment.size;
		else
			x = Math.abs(x) % RenderSegment.size;

		if (z < 0)
			z = rMinOne - Math.abs(z - rMinOne) % RenderSegment.size;
		else
			z = Math.abs(z) % RenderSegment.size;

		return x + z * RenderSegment.size;
	}

	//private static getIndex(x: NumberOrPos, z?: number): number {
	//	return MapSegmentPos.getCoords((xx, zz) => {
	//		if (x instanceof MapSegmentPos) {
	//			return this.getIndexOf(xx, zz);
	//		}
	//		else {
	//			if (xx < 0 || xx > RenderSegment.size)
	//				throw new RangeError("'x' is either zero or above the allowed size.");
	//			if (zz < 0 || zz > RenderSegment.size)
	//				throw new RangeError("'z' is either zero or above the allowed size.");
	//			return xx + zz * RenderSegment.size;
	//		}
	//	}, x, z);
	//}

	public get renderDataBuffer(): WebGLBuffer {
		this.assertNotDisposed();
		return this._renderDataBuffer;
	}

	public get vertexBuffer(): WebGLBuffer {
		this.assertNotDisposed();
		return this._vertexBuffer;
	}

	protected destroy() {
		this.glContext.deleteBuffer(this._vertexBuffer);
		this.glContext.deleteBuffer(this._renderDataBuffer);
	}

	/*
	public static createCoordKey(x: number, y: number): string {
		return x + "," + y;
	}

	public static parseCoordKey(value: string): number[] {
		const split = value.split(",");
		if (split.length < 2)
			throw new SyntaxError("Not enough coordinates in 'value'.");
		return [parseInt(split[0]), parseInt(split[1])];
	}
	*/
}