import MapSegment, { MapSegmentPos, NumberOrPos } from "../Core/World/MapSegment";
import { mat4, vec3 } from "gl-matrix";
import GLResource from "../Graphics/GLResource";

export default class RenderSegment extends GLResource {

	/** The dimensions of a RenderSegment. */
	public static readonly size = 8;

	/** The amount of segments that can be stored in a RenderSegment. */
	public static readonly blockSize = RenderSegment.size * RenderSegment.size;

	private _segments: MapSegment[];
	private _segmentCount: number;

	private _texCoordBuffer: WebGLBuffer;
	private _indexBuffer: WebGLBuffer;
	public readonly matrix: mat4;

	public readonly x: number;
	public readonly z: number;

	public isUpToDate: boolean;
	public genCount: number;

	constructor(gl: WebGLRenderingContext, x: number | MapSegmentPos, z?: number) {
		if (!(x instanceof MapSegmentPos) && z == null)
			throw new SyntaxError("'z' may not be null if 'x' is a MapSegmentPos.");

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
		this._texCoordBuffer = gl.createBuffer();
		this._indexBuffer = gl.createBuffer();

		this.matrix = mat4.create();
		mat4.translate(this.matrix, this.matrix, vec3.fromValues(
			this.x * MapSegment.size * RenderSegment.size,
			this.z * MapSegment.size * RenderSegment.size,
			0));

		this.isUpToDate = true;
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
		this.isUpToDate = false;
	}

	public setSegment(x: number, z: number, segment: MapSegment) {
		const i = RenderSegment.getIndex(x, z);
		this.setSegmentAt(i, segment);
	}

	/**
	 * Gets a MapSegment by coordinates or an index.
	 * @param x The x coordinate.
	 * @param z The z coordinate.
	 */
	public getSegment(x: number, z: number): MapSegment {
		const i = RenderSegment.getIndex(x, z);
		return this._segments[i];
	}

	private static getIndex(x: number, z: number): number {
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
		return this._texCoordBuffer;
	}

	public get indexBuffer(): WebGLBuffer {
		this.assertNotDisposed();
		return this._indexBuffer;
	}

	protected destroy() {
		this.glContext.deleteBuffer(this._texCoordBuffer);
		this.glContext.deleteBuffer(this._indexBuffer);
	}

	public static createCoordKey(x: number, y: number): string {
		return x + "," + y;
	}

	public static parseCoordKey(value: string): number[] {
		const split = value.split(",");
		if (split.length < 2)
			throw new SyntaxError("Not enough coordinates in 'value'.");
		return [parseInt(split[0]), parseInt(split[1])];
	}
}