import GLResource from "./../GLResource";
import Shader from "./Shader";

/**
 * Wrapper of WebGLShaderProgram for simpler shader setup.
 * */
export default class ShaderProgram extends GLResource {

	private _program: WebGLProgram;
	private _isLinked: boolean;

	/**
	 * Constructs and links the shader program.
	 * @param gl The GL context.
	 * @param vertexShader The vertex shader to link. Can be disposed after construction.
	 * @param fragmentShader The fragment shader to link. Can be disposed after construction.
	 */
	constructor(gl: WebGLRenderingContext) {
		super(gl);

		this._program = gl.createProgram();
		this._isLinked = false;
	}

	/** Gets the GL shader program object. */
	public get glProgram(): WebGLProgram {
		this.assertNotDisposed();
		return this._program;
	}

	/** Gets if the shader program is linked with shaders. */
	public get isLinked(): boolean {
		this.assertNotDisposed();
		return this._isLinked;
	}

	/**
	 * Links the shader program with a vertex and fragment shader.
	 * Given shaders can be disposed after construction.
	 * @param vertexShader The vertex shader. Can be disposed after construction.
	 * @param fragmentShader The fragment shader. Can be disposed after construction.
	 */
	public link(vertexShader: Shader, fragmentShader: Shader) {
		this.assertNotDisposed();

		if (this._isLinked)
			throw new Error("This shader program has already been linked.");

		if (vertexShader.type != ShaderType.Vertex)
			throw new SyntaxError("The 'vertexShader' must be of ShaderType Vertex.");

		if (fragmentShader.type != ShaderType.Fragment)
			throw new SyntaxError("The 'fragmentShader' must be of ShaderType Fragment.");

		const gl = this.glContext;
		gl.attachShader(this._program, vertexShader.glShader);
		gl.attachShader(this._program, fragmentShader.glShader);
		gl.linkProgram(this._program);

		const log = gl.getProgramInfoLog(this._program);

		// LINK_STATUS returns false if linking failed
		if (!gl.getProgramParameter(this._program, gl.LINK_STATUS)) {
			console.error("Failed to link shader program:\n", log);
		}
		else {
			if (log.length > 0)
				console.warn("Shader program link log:\n", log);
			this._isLinked = true;
		}
	}

	protected destroy() {
		this.glContext.deleteProgram(this._program);
		this._isLinked = false;
	}
}