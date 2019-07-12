import Mathx from "../../Utility/Mathx";
import { Segment, SegmentPosition } from "./Map";

type NumberOrPosition = number | SegmentPosition;

/** Row containing segments indexed by their X coordinate. */
type Row = Map<number, Segment>;

/**
 * Collection optimized for storing segments in rows.
 * */
export class SegmentCollection {
	private _rows: Map<number, Row>;
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
		this._rows = new Map<number, Row>();
		this._version = 0;
	}

	public rows(): IterableIterator<[number, Row]> {
		return this._rows.entries();
	}

	public has(x: NumberOrPosition, z: number): boolean {
		const callback = (xx: number, zz: number): boolean => {
			let row = this.getRow(zz);
			if (!row)
				return false;
			return row.has(xx);
		}
		return SegmentCollection.validateCoords(callback, x, z);
	}

	public get(x: NumberOrPosition, z?: number): Segment {
		const callback = (xx: number, zz: number): Segment => {
			let row = this.getRow(zz);
			if (!row)
				return null;
			return row.get(xx);
		}
		return SegmentCollection.validateCoords(callback, x, z);
	}

	public set(segment: Segment, x: NumberOrPosition, z?: number) {
		const callback = (xx: number, zz: number) => {
			let row = this.getRow(zz);
			if (!row) {
				row = new Map<number, Segment>();
				this._rows.set(zz, row);
			}
			row.set(xx, segment);
			this._version++;
		}
		return SegmentCollection.validateCoords(callback, x, z);
	}

	public delete(x: NumberOrPosition, z?: number): boolean {
		const callback = (xx: number, zz: number) => {
			let row = this.getRow(zz);
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
	 * @param x The X coordinate or a SegmentPosition.
	 * @param z The Z coordinate. May not be null if 'x' is not a SegmentPosition.
	 * @param callback The callback to call with the checked coordinates.
	 */
	private static validateCoords<TResult>(
		callback: (x: number, z: number) => TResult,
		x: NumberOrPosition,
		z?: number): TResult {
		if (x instanceof SegmentPosition)
			return callback(x.x, x.z);
		else if (z != null)
			return callback(x, z);
		else
			throw new SyntaxError("'z' cannot be null if 'x' is not a SegmentPosition.");
	}

	public getRow(z: number): Row {
		return this._rows.get(z);
	}
}