
export class Size {
	public readonly width: number;
	public readonly height: number;

	constructor(width: number, height: number) {
		this.width = width;
		this.height = height;
	}
}

export class Rectangle {

	public static get empty(): Rectangle {
		return new Rectangle(0, 0, 0, 0);
	}

	public readonly x: number;
	public readonly y: number;
	public readonly width: number;
	public readonly height: number;

	constructor(x: number, y: number, width: number, height: number) {
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
	}
}