import Mathx from "../../Utility/Mathx";
import { Segment, SegmentPosition } from "./Map";

type BigNumber = number | bigint;
type BigNumberOrPosition = BigNumber | SegmentPosition;

/** Row containing segments indexed by their X coordinate. */
type Row = Map<bigint, Segment>;

/**
 * Collection optimized for storing segments in rows.
 * */
export class SegmentCollection {
	private _rows: Map<bigint, Row>;
	private _version: number;

	// iterators can apparently have keys deleted and still continue iterating
	// making this version number only useful for debugging at most ;/
	public get version(): number { return this._version; }

	public get rowCount(): number { return this._rows.size; }
	public get count(): number {
		let c = 0;
		for (let row of this._rows.values())
			c += row.size;
		return c;
	}

	constructor() {
		this._rows = new Map<bigint, Row>();
		this._version = 0;
	}

	public has(x: BigNumberOrPosition, z: BigNumber): boolean {
		const callback = (xx: bigint, zz: bigint): boolean => {
			let row = this.getRowInternal(zz);
			if (!row)
				return false;
			return row.has(xx);
		}
		return SegmentCollection.validateCoords(callback, x, z);
	}

	public get(x: BigNumberOrPosition, z?: BigNumber): Segment {
		const callback = (xx: bigint, zz: bigint): Segment => {
			let row = this.getRowInternal(zz);
			if (!row)
				return null;
			return row.get(xx);
		}
		return SegmentCollection.validateCoords(callback, x, z);
	}

	public set(segment: Segment, x: BigNumberOrPosition, z?: BigNumber) {
		const callback = (xx: bigint, zz: bigint) => {
			let row = this.getRowInternal(zz);
			if (!row) {
				row = new Map<bigint, Segment>();
				this._rows.set(zz, row);
			}
			row.set(xx, segment);
			this._version++;
		}
		return SegmentCollection.validateCoords(callback, x, z);
	}

	public delete(x: BigNumberOrPosition, z?: BigNumber): boolean {
		const callback = (xx: bigint, zz: bigint) => {
			let row = this.getRowInternal(zz);
			if (row && row.delete(xx)) {
				this._version++;
				return true;
			}
			return false;
		}
		return SegmentCollection.validateCoords(callback, x, z);
	}

	/** Removes empty rows from the collection. */
	public trim() {
		for (const [z, row] of this._rows) {
			if (row.size == 0)
				this._rows.delete(z);
		}
	}

	/**
	 * Helper for type-checking/validating the coordinates.
	 * @param x The X coordinate or a MapSegmentPosition. 
	 * @param z The Z coordinate. May not be null if 'x' is not a MapSegmentPosition.
	 * @param callback The callback to call with the checked coordinates.
	 */
	private static validateCoords<TResult>(
		callback: (x: bigint, z: bigint) => TResult,
		x: BigNumberOrPosition,
		z?: BigNumber): TResult {
		if (x instanceof SegmentPosition)
			return callback(x.x, x.z);
		else if (z != null)
			return callback(Mathx.toBigInt(x), Mathx.toBigInt(z));
		else
			throw new SyntaxError("'z' cannot be null if 'x' is not a MapSegmentPosition.");
	}

	private getRowInternal(z: bigint): Row {
		return this._rows.get(z);
	}

	public getRow(z: BigNumber): Row {
		z = Mathx.toBigInt(z);
		return this.getRowInternal(z);
	}
}