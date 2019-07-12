import Constants from "../Constants";
import { mat4, vec3 } from "gl-matrix";
import GLResource from "../../Graphics/GLResource";

/**
 * Data container for a 2D map segment.
 * */
export class Segment extends GLResource {

	public static readonly size = Constants.segmentSize;

	private _texCoordBuffer: WebGLBuffer;

	public readonly tiles: Uint16Array;
	public readonly position: SegmentPosition;
	public readonly matrix: mat4;

	public hasTexCoords: boolean;

	constructor(gl: WebGLRenderingContext, position: SegmentPosition, tiles: Uint16Array) {
		super(gl);
		this._texCoordBuffer = gl.createBuffer();

		this.tiles = tiles;
		this.position = position;
		this.matrix = mat4.create();

		mat4.translate(this.matrix, this.matrix, vec3.fromValues(
			this.position.x * Segment.size, this.position.z * Segment.size, 0));

		this.hasTexCoords = false;
	}

	public get texCoordBuffer(): WebGLBuffer {
		this.assertNotDisposed();
		return this._texCoordBuffer;
	}

	protected destroy() {
		this._texCoordBuffer = null;
	}
}

/**
 * Segment position without the default base offset.
 * */
export class SegmentPosition {

	/** The x coordinate of the segment (minus default base offset).*/
	public readonly x: number;

	/** The y coordinate of the segment (minus default base offset).*/
	public readonly y: number;

	/** The z coordinate of the segment (minus default base offset).*/
	public readonly z: number;

	/**
	 * Constructs the position from non-offsetted coordinates.
	 * @param x Can be a number or Array. An Array needs to contain at least 2 elements.
	 * @param y May not be null if x is a number.
	 * @param z May not be null if x is a number.
	 */
	constructor(x: number | number[], y?: number, z?: number) {
		if (x instanceof Array) {
			if (x.length == 3) {
				this.x = x[0];
				this.y = x[1];
				this.z = x[2];
			}
			else if (x.length == 2) {
				this.x = x[0];
				this.z = x[1];
				this.y = 0;
			}
			else
				throw new SyntaxError("The 'x' Array may only contain 2 or 3 elements.");
		}
		else {
			if (y == null || z == null) {
				throw new SyntaxError("'y' and 'z' may not be null if 'x' is not an Array.");
			}
			else {
				this.x = x;
				this.y = y;
				this.z = z;
			}
		}
	}
}