type TextureZoneCallback = (gl: WebGLRenderingContext, texture: WebGLTexture) => void;

export default class GLHelper {
	
	public static setBufferLength(
		gl: WebGLRenderingContext,
		target: number,
		buffer: WebGLBuffer,
		size: number,
		usage: number) {

		gl.bindBuffer(target, buffer);
		gl.bufferData(target, size, usage);
	}

	public static createBufferWithLength(
		gl: WebGLRenderingContext,
		target: number,
		size: number,
		usage: number): WebGLBuffer {

		const buffer = gl.createBuffer();
		GLHelper.setBufferLength(gl, target, buffer, size, usage);
		return buffer;
	}

	/**
	 * Unbinds the currently bound texture and binds the provided texture.
	 * Then after the callback, the previously bound texture is rebound.
	 * (The provided texture will be unbound regardless of there being any texture previously bound.)
	 * @param gl The WebGL context.
	 * @param texture The WebGL texture object.
	 * @param callback The callback to call after binding the texture.
	 */
	public static zoneTexture2D(
		gl: WebGLRenderingContext,
		texture: WebGLTexture,
		callback: TextureZoneCallback)
	{
		GLHelper.zoneTexture(gl, gl.TEXTURE_2D, gl.TEXTURE_BINDING_2D, texture, callback);
	}

	/**
	 * Unbinds the currently bound texture and binds the provided texture.
	 * Then after the callback, the previously bound texture is rebound.
	 * (The provided texture will be unbound regardless of there being any texture previously bound.)
	 * @param gl The WebGL context.
	 * @param target The WebGL texture target.
	 * @param binding The WebGL texture binding.
	 * @param texture The WebGL texture object.
	 * @param callback The callback to call after binding the texture.
	 */
	public static zoneTexture(
		gl: WebGLRenderingContext,
		target: number,
		binding: number,
		texture: WebGLTexture,
		callback: TextureZoneCallback)
	{
		if (texture == null)
			throw new SyntaxError("'texture' may not be null.");

		// get the currently bound texture so we can rebind later
		const previousBound = gl.getParameter(binding);

		// now we can safely bind our texture
		gl.bindTexture(target, texture);

		try {
			// let the user do some work
			callback(gl, texture);
		}
		finally {
			// and rebind the previous texture
			// (previousBound can be null so it unbinds our texture regardless)
			gl.bindTexture(target, previousBound);
		}
	}
}