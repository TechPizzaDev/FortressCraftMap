import RenderSegment from "./RenderSegment";
import { MapSegmentPos, NumberOrPos } from "../Core/World/MapSegment";

/** Row containing segments indexed by their X coordinate. */
type Row = Map<number, RenderSegment>;

/**
 * Collection used for storing render segments in rows.
 * */
export default class RenderSegmentCollection {
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

	public has(x: NumberOrPos, z: number): boolean {
		const callback = (xx: number, zz: number): boolean => {
			let row = this.getRow(zz);
			if (!row)
				return false;
			return row.has(xx);
		}
		return RenderSegmentCollection.getInnerCoords(callback, x, z);
	}

	public get(x: NumberOrPos, z?: number): RenderSegment {
		const callback = (xx: number, zz: number): RenderSegment  => {
			let row = this.getRow(zz);
			if (!row)
				return null;
			return row.get(xx);
		}
		return RenderSegmentCollection.getInnerCoords(callback, x, z);
	}

	public set(segment: RenderSegment, x: NumberOrPos, z?: number) {
		const callback = (xx: number, zz: number) => {
			let row = this.getRow(zz);
			if (!row) {
				row = new Map<number, RenderSegment>();
				this._rows.set(zz, row);
			}
			row.set(xx, segment);
			this._version++;
		}
		return RenderSegmentCollection.getInnerCoords(callback, x, z);
	}

	public delete(x: NumberOrPos, z?: number): boolean {
		const callback = (xx: number, zz: number) => {
			let row = this.getRow(zz);
			if (row && row.delete(xx)) {
				this._version++;
				return true;
			}
			return false;
		}
		return RenderSegmentCollection.getInnerCoords(callback, x, z);
	}

	/** Removes empty rows from the collection. */
	public trim() {
		for (const [z, row] of this._rows) {
			if (row.size == 0)
				this._rows.delete(z);
		}
	}

	public getRow(z: number): Row {
		return this._rows.get(z);
	}

	/**
	 * MapSegmentPos' are used as "MapSegment coordinates", use this to narrow down a RenderSegment that contains the wanted MapSegment.
	 * Numbers are used as "RenderSegment coordinates", use this to get RenderSegments.
	 * @param callback
	 * @param x
	 * @param z
	 */
	public static getInnerCoords<TResult>(
		callback: (x: number, z: number) => TResult,
		x: NumberOrPos,
		z?: number): TResult {
		return MapSegmentPos.getCoords((xx, zz) => {
			if (x instanceof MapSegmentPos) {
				return callback(x.renderX, x.renderZ);
			}
			else {
				return callback(xx, zz);
			}
		}, x, z);
	}
}