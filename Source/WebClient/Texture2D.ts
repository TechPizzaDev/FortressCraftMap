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
		this._width = 0;
		this._height = 0;

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

	public setData(
		data: Uint8Array | ImageBitmap,
		format: Texture2DFormat,
		width?: number,
		height?: number) {

		if (data instanceof Uint8Array && (!width || !height))
			throw new Error("Width and height is required for Uint8Array.");

		const gl = this._gl;
		const glFormat = format.format;
		if (!Texture2D.isValidTextureFormat(gl, glFormat))
			throw new TypeError(`Invalid texture format (${glFormat}).`);

		const type = format.type;
		const formatSize = Texture2D.getSizeOfFormat(gl, glFormat, type);
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
	}

	private checkImageDimension(source: number, dim?: number): number {
		if (dim) {
			if (dim > source)
				throw new RangeError("Given image dimension exceeds source dimension.");
			return dim;
		}
		return source;
	}

	public dispose() {
		Texture2D._textures.delete(this._id);
		Texture2D._freeIDs.push(this._id);
		this._id = -1;

		this._gl.deleteTexture(this._texture);
		this._gl = null;
	}

	public static getActiveTextures(): IterableIterator<Texture2D> {
		return Texture2D._textures.values();
	}

	private static getID(): number {
		if (Texture2D._freeIDs.length > 0)
			return Texture2D._freeIDs.pop();
		return Texture2D._idCounter++;
	}

	public static getSizeOfFormat(gl: WebGLContext, format: number, type: number): number {
		switch (format) {
			case gl.ALPHA:
			case gl.LUMINANCE:
				if (type == gl.UNSIGNED_BYTE)
					return 1;

			case gl.LUMINANCE_ALPHA:
				if (type == gl.UNSIGNED_BYTE)
					return 2;

			case gl.RGB:
				switch (type) {
					case gl.UNSIGNED_SHORT_5_6_5:
						return 2;

					case gl.UNSIGNED_BYTE:
						return 3;
				}

			case gl.RGBA:
				switch (type) {
					case gl.UNSIGNED_SHORT_4_4_4_4:
						return 2;

					case gl.UNSIGNED_SHORT_5_5_5_1:
						return 2;

					case gl.UNSIGNED_BYTE:
						return 4;
				}

			default:
				return -1;
		}
	}

	public static isValidTextureFormat(gl: WebGLContext, format: number): boolean {
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

class Texture2DFormat {
	public type: number;
	public format: number;
	public filter: number;
	public generateMipmaps: boolean;

	public static createDefault(gl: WebGLContext): Texture2DFormat {
		const f = new Texture2DFormat();
		f.type = gl.UNSIGNED_BYTE;
		f.format = gl.RGBA;
		f.filter = gl.LINEAR;
		f.generateMipmaps = false;
		return f;
	}
}