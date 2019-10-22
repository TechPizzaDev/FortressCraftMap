import RenderSegment from "./RenderSegment";

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
		for (const row of this._rows.values())
			c += row.size;
		return c;
	}

	public get segmentCount(): number {
		let c = 0;
		for (const row of this._rows.values())
			for (const rs of row.values())
				c += rs.segmentCount;
		return c;
	}

	constructor() {
		this._rows = new Map<number, Row>();
		this._version = 0;
	}

	public rows(): IterableIterator<Row> {
		return this._rows.values();
	}

	public entries(): IterableIterator<[number, Row]> {
		return this._rows.entries();
	}

	public has(x: number, z: number): boolean {
		let row = this.getRow(z);
		if (!row)
			return false;
		return row.has(x);
	}

	public get(x: number, z: number): RenderSegment {
		let row = this.getRow(z);
		if (!row)
			return null;
		return row.get(x);
	}

	public set(x: number, z: number, segment: RenderSegment) {
		let row = this.getRow(z);
		if (!row) {
			row = new Map<number, RenderSegment>();
			this._rows.set(z, row);
		}
		row.set(x, segment);
		this._version++;
	}

	public delete(x: number, z: number): boolean {
		let row = this.getRow(z);
		if (row && row.delete(x)) {
			this._version++;
			return true;
		}
		return false;
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

	///**
	// * MapSegmentPos' are used as "MapSegment coordinates", use this to narrow down a RenderSegment that contains the wanted MapSegment.
	// * Numbers are used as "RenderSegment coordinates", use this to get RenderSegments.
	// * @param callback
	// * @param x
	// * @param z
	// */
	//public static getInnerCoords<TResult>(
	//	callback: (x: number, z: number) => TResult,
	//	x: NumberOrPos,
	//	z?: number): TResult {
	//	return MapSegmentPos.getCoords((xx, zz) => {
	//		if (x instanceof MapSegmentPos) {
	//			return callback(x.renderX, x.renderZ);
	//		}
	//		else {
	//			return callback(xx, zz);
	//		}
	//	}, x, z);
	//}
}