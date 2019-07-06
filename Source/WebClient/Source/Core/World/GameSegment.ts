type BigNumber = number | bigint;

import Mathx from "../../Utility/Mathx";
import Constants from "../Constants";

/**
 * Data container for a 3D game segment.
 * */
export class Segment {

	public static readonly size = 16;

	private _tiles: Uint16Array;

	public readonly position: SegmentPosition;

	constructor(position: SegmentPosition, tiles: Uint16Array) {
		this._tiles = tiles;
		this.position = position;
	}
}

/**
 * Segment position with the default base offset.
 * */
export class SegmentPosition {

	public static readonly baseOffset = Constants.segmentBaseOffset;

	protected _baseX: bigint;
	protected _baseY: bigint;
	protected _baseZ: bigint;

	/** The x coordinate of the segment (plus default base offset).*/
	public get baseX(): bigint {
		return this._baseX;
	}

	/** The y coordinate of the segment (plus default base offset).*/
	public get baseY(): bigint {
		return this._baseY;
	}

	/** The z coordinate of the segment (plus default base offset).*/
	public get baseZ(): bigint {
		return this._baseZ;
	}

	/**
	 * Constructs the position from offsetted coordinates.
	 * @param baseX Can be a BigNumber or Array. An Array needs to contain at least 3 elements.
	 * @param baseY May not be null if 'x' is a BigNumber.
	 * @param baseZ May not be null if 'x' is a BigNumber.
	 */
	constructor(baseX: BigNumber | BigNumber[], baseY?: BigNumber, baseZ?: BigNumber) {
		if (baseX instanceof Array) {
			if (baseX.length == 3) {
				this._baseX = Mathx.toBigInt(baseX[0]);
				this._baseY = Mathx.toBigInt(baseX[1]);
				this._baseZ = Mathx.toBigInt(baseX[2]);
			}
			else if (baseX.length == 2) {
				this._baseX = Mathx.toBigInt(baseX[0]);
				this._baseZ = Mathx.toBigInt(baseX[1]);
				this._baseY = SegmentPosition.baseOffset;
			}
			else
				throw new SyntaxError("The 'baseX' Array may only contain 2 or 3 elements.");
		}
		else {
			if (baseY == null || baseZ == null) {
				throw new SyntaxError("'baseY' and 'baseZ' may not be null if 'baseX' is not an Array.");
			}
			else {
				this._baseX = Mathx.toBigInt(baseX);
				this._baseY = Mathx.toBigInt(baseY);
				this._baseZ = Mathx.toBigInt(baseZ);
			}
		}
	}

	/**
	 * Constructs the position from non-offsetted coordinates.
	 */
	public static fromNonOffseted(x: BigNumber, y: BigNumber, z: BigNumber) {
		const baseX = Mathx.toBigInt(x) + SegmentPosition.baseOffset;
		const baseY = Mathx.toBigInt(y) + SegmentPosition.baseOffset;
		const baseZ = Mathx.toBigInt(z) + SegmentPosition.baseOffset;
		return new SegmentPosition(baseX, baseY, baseZ);
	}
}
