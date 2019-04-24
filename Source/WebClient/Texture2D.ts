type WebGLContext = WebGLRenderingContext;

class Texture2D {
	private static _textures = new Map<number, Texture2D>();
	private static _freeIDs = new Array<number>();
	private static _idCounter = 0;
	public static readonly BlackPixel = new Uint8Array([0, 0, 0, 255]);

	private _id: number;
	private _isLoaded: boolean;
	private _gl: WebGLContext;
	private _texture: WebGLTexture;
	private _width: number;
	private _height: number;

	constructor(gl: WebGLContext) {
		this._gl = gl;
		this._texture = this._gl.createTexture();

		this._id = Texture2D.getID();
		Texture2D._textures.set(this._id, this);
	}

	public get isDisposed(): boolean {
		return this._id == -1;
	}

	public get isLoaded(): boolean {
		return this._isLoaded;
	}

	public get texture(): WebGLTexture {
		return this._texture;
	}

	public get width(): number {
		return this._width;
	}

	public get height(): number {
		return this._height;
	}

	public setData() {

	}

	public static getActiveTextures(): IterableIterator<Texture2D> {
		return Texture2D._textures.values();
	}

	private static getID(): number {
		if (Texture2D._freeIDs.length > 0)
			return Texture2D._freeIDs.pop();
		return Texture2D._idCounter++;
	}

	public dispose() {
		Texture2D._textures.delete(this._id);
		Texture2D._freeIDs.push(this._id);
		this._id = -1;

		this._gl.deleteTexture(this._texture);
		this._gl = null;
	}
}