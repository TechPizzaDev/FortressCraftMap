import Disposable from "../Utility/Disposable";

/**
 * Helper for holding a GL context and disposing the resource.
 * */
export default abstract class GLResource extends Disposable {

	/** The GL context that this object was constructed with. */
	public readonly gl: WebGLRenderingContext;

	/**
	 * Constructs the resource.
	 * @param gl The GL context.
	 */
	constructor(gl: WebGLRenderingContext) {
		super();

		if (gl == null)
			throw new SyntaxError("'gl' may not be null.");
		this.gl = gl;
	}
}