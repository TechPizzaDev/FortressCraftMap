import Disposable from "../Utility/Disposable";

/**
 * Helper for holding a GL context and disposing the resource.
 * */
export default abstract class GLResource extends Disposable {

	private _gl: WebGLRenderingContext;

	/**
	 * Constructs the resource.
	 * @param gl The GL context.
	 */
	constructor(gl: WebGLRenderingContext) {
		super();

		if (gl == null)
			throw new SyntaxError("'gl' may not be null.");
		this._gl = gl;
	}

	/** Gets the GL context that this object was constructed with. */
	public get glContext(): WebGLRenderingContext {
		this.assertNotDisposed();
		return this._gl;
	}
}