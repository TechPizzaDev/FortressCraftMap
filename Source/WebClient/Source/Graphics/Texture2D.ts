
export default class Texture2D {
	private static _textures = new Map<number, Texture2D>();
	private static _freeIDs = new Array<number>();
	private static _idCounter = 0;

	private _id: number;
	private _gl: GLContext;
	private _texture: WebGLTexture;
	private _width: number;
	private _height: number;

	constructor(gl: GLContext) {
		this._gl = gl;
		this._texture = this._gl.createTexture();

		this._id = Texture2D.rentID();
		Texture2D._textures.set(this._id, this);

		this.setData(Texture2D.createOpaquePixel(), Texture2DFormat.createDefault(this._gl), 1, 1);
	}

	public get isDisposed(): boolean {
		return this._id == -1;
	}

	public get glContext(): GLContext {
		return this._gl;
	}

	public get glTexture(): WebGLTexture {
		return this._texture;
	}

	public get width(): number {
		return this._width;
	}

	public get height(): number {
		return this._height;
	}

	public setData(
		data: Uint8Array | ImageBitmap,
		format: Texture2DFormat,
		width?: number,
		height?: number) {

		if (data instanceof Uint8Array && (!width || !height))
			throw new Error("Width and height is required for Uint8Array.");

		const gl = this._gl;
		const glFormat = format.format;
		if (!Texture2D.isValidFormat(gl, glFormat))
			throw new TypeError(`Invalid texture format (${glFormat}).`);

		const type = format.type;
		const formatSize = Texture2D.getFormatSize(gl, glFormat, type);
		if (formatSize == -1)
			throw new TypeError(`Invalid texture format (${glFormat} + ${type})`);

		const level = 0;
		gl.bindTexture(gl.TEXTURE_2D, this._texture);

		if (data instanceof Uint8Array) {
			if (width * height * formatSize > data.length)
				throw new RangeError("Not enough data for the given format.");
			this._width = width;
			this._height = height;
			gl.texImage2D(gl.TEXTURE_2D, level, glFormat, width, height, 0, glFormat, type, data);
		}
		else if (data instanceof ImageBitmap) {
			this._width = this.checkImageDimension(width, data.width);
			this._height = this.checkImageDimension(height, data.height);
			gl.texImage2D(gl.TEXTURE_2D, level, glFormat, glFormat, type, data);
		}

		if (format.generateMipmaps &&
			Mathx.isPowerOf2(this._width) &&
			Mathx.isPowerOf2(this._height)) {
			gl.generateMipmap(gl.TEXTURE_2D);
		}
		else {
			if (format.generateMipmaps)
				console.warn("Failed to generate mipmaps as texture is not power of two.");
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, format.filter);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, format.filter);
		}

		gl.bindTexture(gl.TEXTURE_2D, null);
	}

	private checkImageDimension(source: number, dim?: number): number {
		if (dim) {
			if (dim > source)
				throw new RangeError("Image dimension exceeds source dimension.");
			return dim;
		}
		return source;
	}

	public dispose() {
		this._gl.deleteTexture(this._texture);
		this._gl = null;

		Texture2D._textures.delete(this._id);
		Texture2D._freeIDs.push(this._id);
		this._id = -1;
	}

	public static getLoadedTextures(): IterableIterator<Texture2D> {
		return Texture2D._textures.values();
	}

	private static rentID(): number {
		if (Texture2D._freeIDs.length > 0)
			return Texture2D._freeIDs.pop();
		return Texture2D._idCounter++;
	}

	public static createOpaquePixel(): Uint8Array {
		return new Uint8Array([0, 0, 0, 255]);
	}

	public static getFormatSize(gl: GLContext, format: number, type: number): number {
		switch (format) {
			case gl.ALPHA:
			case gl.LUMINANCE:
				if (type == gl.UNSIGNED_BYTE)
					return 1;
				break;

			case gl.LUMINANCE_ALPHA:
				if (type == gl.UNSIGNED_BYTE)
					return 2;
				break;

			case gl.RGB:
				switch (type) {
					case gl.UNSIGNED_SHORT_5_6_5: return 2;
					case gl.UNSIGNED_BYTE: return 3;
				}
				break;

			case gl.RGBA:
				switch (type) {
					case gl.UNSIGNED_SHORT_4_4_4_4: return 2;
					case gl.UNSIGNED_SHORT_5_5_5_1: return 2;
					case gl.UNSIGNED_BYTE: return 4;
				}
				break;
		}
		return -1;
	}

	public static isValidFormat(gl: GLContext, format: number): boolean {
		switch (format) {
			case gl.ALPHA:
			case gl.LUMINANCE:
			case gl.LUMINANCE_ALPHA:
			case gl.RGB:
			case gl.RGBA:
				return true;

			default:
				return false;
		}
	}
}

/** Settings object for Texture2D.setData() */
class Texture2DFormat {
	public type: number;
	public format: number;
	public filter: number;
	public generateMipmaps: boolean;

	public static createDefault(gl: GLContext): Texture2DFormat {
		const f = new Texture2DFormat();
		f.type = gl.UNSIGNED_BYTE;
		f.format = gl.RGBA;
		f.filter = gl.LINEAR;
		f.generateMipmaps = false;
		return f;
	}
}