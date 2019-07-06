
/**
 * Helper for holding a GL context and disposing the resource.
 * */
export default abstract class GLResource {

	private _gl: WebGLRenderingContext;

	/**
	 * Constructs the resource.
	 * @param gl The GL context.
	 */
	constructor(gl: WebGLRenderingContext) {
		if (gl == null)
			throw new SyntaxError("'gl' may not be null.");
		this._gl = gl;
	}

	/** Gets if this object is disposed and unusable. */
	public get isDisposed(): boolean {
		return this._gl == null;
	}

	/** Gets the GL context that this object was constructed with. */
	public get glContext(): WebGLRenderingContext {
		this.assertNotDisposed();
		return this._gl;
	}

	/** Throws an error if this resource is disposed. */
	protected assertNotDisposed() {
		if (this.isDisposed)
			throw new Error("The resource is disposed and therefore unusable.");
	}

	/**
	 * Used for destroying GL objects and making the object unusable.
	 * This is only called once, but dispose() can be called multiple times.
	 * */
	protected abstract destroy(): void;

	/** 
	 * Calls destroy() and clears the reference to the GL context.
	 * This can be called multiple times, but destroy() is only called once.
	 * */
	public dispose() {
		if (!this.isDisposed) {
			this.destroy();
			this._gl = null;
		}
	}
}