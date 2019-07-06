type BigNumber = number | bigint;

import Mathx from "../../Utility/Mathx";
import Constants from "../Constants";

/**
 * Data container for a 2D map segment.
 * */
export class Segment {

	public static readonly size = Constants.segmentSize;

	private _tiles: Uint16Array;

	public readonly position: SegmentPosition;

	constructor(position: SegmentPosition, tiles: Uint16Array) {
		this._tiles = tiles;
		this.position = position;
	}
}

/**
 * Segment position without the default base offset.
 * */
export class SegmentPosition {

	public static readonly baseOffset = Constants.segmentBaseOffset;

	/** The x coordinate of the segment (minus default base offset).*/
	public readonly x: bigint;

	/** The y coordinate of the segment (minus default base offset).*/
	public readonly y: bigint;

	/** The z coordinate of the segment (minus default base offset).*/
	public readonly z: bigint;

	/**
	 * Constructs the position from non-offsetted coordinates.
	 * @param x Can be a BigNumber or Array. An Array needs to contain at least 3 elements.
	 * @param y May not be null if x is a BigNumber.
	 * @param z May not be null if x is a BigNumber.
	 */
	constructor(x: BigNumber | BigNumber[], y?: BigNumber, z?: BigNumber) {
		if (x instanceof Array) {
			if (x.length == 3) {
				this.x = Mathx.toBigInt(x[0]);
				this.y = Mathx.toBigInt(x[1]);
				this.z = Mathx.toBigInt(x[2]);
			}
			else if (x.length == 2) {
				this.x = Mathx.toBigInt(x[0]);
				this.z = Mathx.toBigInt(x[1]);
				this.y = BigInt(0);
			}
			else
				throw new SyntaxError("The 'x' Array may only contain 2 or 3 elements.");
		}
		else {
			if (y == null || z == null) {
				throw new SyntaxError("'y' and 'z' may not be null if 'x' is not an Array.");
			}
			else {
				this.x = Mathx.toBigInt(x);
				this.y = Mathx.toBigInt(y);
				this.z = Mathx.toBigInt(z);
			}
		}
	}

	/**
	 * Constructs the position from offsetted coordinates.
	 */
	public static fromOffseted(baseX: BigNumber, baseY: BigNumber, baseZ: BigNumber) {
		baseX = Mathx.toBigInt(baseX) - SegmentPosition.baseOffset;
		baseY = Mathx.toBigInt(baseY) - SegmentPosition.baseOffset;
		baseZ = Mathx.toBigInt(baseZ) - SegmentPosition.baseOffset;
		return new SegmentPosition(baseX, baseY, baseZ);
	}
}