import Mathx from "../Utility/Mathx";
import { Rectangle } from "../Utility/Shapes";
import GLResource from "./GLResource";
import GLHelper from "./GLHelper";

/**
 * Wrapper of WebGLTexture for simpler texture management.
 * This texture's dimensions can only be set at construction time.
 * */
export default class Texture2D extends GLResource {

	private _texture: WebGLTexture;
	private _format: TextureFormat;
	private _dataWidth: number;
	private _dataHeight: number;

	public readonly width: number;
	public readonly height: number;

	/**
	 * Constructs the texture. Dimensions cannot be changed later.
	 * @param gl The GL context.
	 * @param format The format specifying WebGL parameters.
	 * @param width The width of the texture. Cannot be changed later.
	 * @param height The height of the texture. Cannot be changed later.
	 */
	constructor(
		gl: WebGLRenderingContext,
		width: number,
		height: number,
		format?: TextureFormat)
	{
		if (width <= 0)
			throw new Error("'width' must be greater than 0.");
		if (height <= 0)
			throw new Error("'height' must be greater than 0.");

		super(gl);

		// We can't cache the format as it needs a GL context.
		// We could make the format independent of a context
		// but that would require a lot of enums.
		if (format == null)
			format = TextureFormat.createDefault(this.gl);

		this.width = width;
		this.height = height;
		this._format = format;

		// init the texture
		this._texture = this.gl.createTexture();
		GLHelper.zoneTexture2D(this.gl, this._texture, (gl) => {
			// init texture memory
			gl.texImage2D(
				gl.TEXTURE_2D,
				0, // level
				format.dataFormat,
				this.width,
				this.height,
				0, // border
				format.dataFormat,
				gl.UNSIGNED_BYTE,
				null // pixels
			);
		});
	}

	/** Gets the GL texture object. */
	public get glTexture(): WebGLTexture {
		this.assertNotDisposed();
		return this._texture;
	}

	/** Gets the texture's dimensions as a rectangle. */
	public get bounds(): Rectangle {
		return new Rectangle(0, 0, this.width, this.height);
	}

	/** Gets the width of the currently uploaded texture data. */
	public get dataWidth(): number {
		this.assertNotDisposed();
		return this._dataWidth;
	}
	
	/** Gets the height of the currently uploaded texture data. */
	public get dataHeight(): number {
		this.assertNotDisposed();
		return this._dataHeight;
	}

	/**
	 * Uploads data to the GL texture.
	 * @param data The texture data.
	 * @param format The format specifying WebGL parameters. Defaults to the current format.
	 * @param rect The dimensions of the texture data. Defaults to texture bounds.
	 * @param rect Ignored if ImageBitmap is passed as data.
	 */
	public setData(data: ArrayBufferView | ImageBitmap, format?: TextureFormat, rect?: Rectangle) {
		this.assertNotDisposed();

		if (rect == null)
			rect = this.bounds;

		if (format != null)
			this._format = format;

		if (data instanceof ImageBitmap)
			this._format = TextureFormat.createBitmapFormat(
				this.gl, this._format.filter, this._format.generateMipmaps);

		const glFormat = this._format.dataFormat;
		if (!TextureFormat.isValidDataFormat(this.gl, glFormat))
			throw new TypeError(`Invalid texture format (${glFormat}).`);

		const type = this._format.dataType;
		const formatSize = TextureFormat.getFormatSize(this.gl, glFormat, type);
		if (formatSize == -1)
			throw new TypeError(`Invalid texture format (${glFormat} + ${type})`);

		GLHelper.zoneTexture2D(this.gl, this._texture, (gl) => {
			const level = 0;
			if (data instanceof ImageBitmap) {
				this._dataWidth = Texture2D.checkImageDimension("width", rect.width, data.width);
				this._dataHeight = Texture2D.checkImageDimension("height", rect.height, data.height);
				gl.texImage2D(gl.TEXTURE_2D, level, glFormat, glFormat, type, data);
			}
			else {
				if (rect.width * rect.height * formatSize > data.byteLength)
					throw new RangeError("Not enough bytes for the given format.");

				this._dataWidth = rect.width;
				this._dataHeight = rect.height;
				gl.texImage2D(gl.TEXTURE_2D, level, glFormat, rect.width, rect.height, 0, glFormat, type, data);
			}

			if (this._format.generateMipmaps &&
				Mathx.isPowerOf2(this.width) &&
				Mathx.isPowerOf2(this.height)) {
				gl.generateMipmap(gl.TEXTURE_2D);
			}
			else {
				if (this._format.generateMipmaps)
					console.warn("Failed to generate mipmaps as texture is not power of two.");
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this._format.filter);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, this._format.filter);
			}
		});
	}

	protected destroy() {
		this.gl.deleteTexture(this._texture);

		this._dataWidth = 0;
		this._dataHeight = 0;
	}

	private static checkImageDimension(dimName: string, source: number, dim?: number): number {
		if (dim) {
			if (dim > source)
				throw new RangeError(`Image ${dimName} exceeds the texture's ${dimName}.`);
			return dim;
		}
		return source;
	}
}

/** 
 *  Settings object containing WebGL parameters for textures.
 *  */
class TextureFormat {

	public readonly dataType: number;
	public readonly dataFormat: number;
	public readonly filter: number;
	public readonly generateMipmaps: boolean;

	constructor(type: number, format: number, filter: number, mipmaps: boolean) {
		this.dataType = type;
		this.dataFormat = format;
		this.filter = filter;
		this.generateMipmaps = mipmaps;
	}

	public static createDefault(
		gl: WebGLRenderingContext,
		mipmaps: boolean = false
	): TextureFormat {
		return new TextureFormat(
			gl.UNSIGNED_BYTE,
			gl.RGBA,
			gl.LINEAR,
			mipmaps);
	}

	public static createBitmapFormat(
		gl: WebGLRenderingContext,
		filter: number = 0,
		mipmaps: boolean = false
	): TextureFormat {
		return new TextureFormat(
			gl.UNSIGNED_BYTE,
			gl.RGBA,
			filter == 0 ? gl.LINEAR : filter,
			mipmaps);
	}

	public static getFormatSize(gl: WebGLRenderingContext, format: number, type: number): number {
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

	public static isValidDataFormat(gl: WebGLRenderingContext, format: number): boolean {
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