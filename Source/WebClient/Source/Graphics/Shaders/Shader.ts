import GLResource from "./../GLResource";

/**
 * Wrapper of WebGLShader for simpler shader compilation.
 * This shader object can be disposed after being linked to a shader program.
 * */
export default class Shader extends GLResource {

	private _shader: WebGLShader;
	private _type: ShaderType;
	private _isCompiled: boolean;
	private _source: string;

	/**
	 * Constructs the shader.
	 * @param gl The GL context.
	 * @param type The shader type.
	 */
	constructor(gl: WebGLRenderingContext, type: ShaderType) {
		super(gl);

		const glType = Shader.getShaderTypeId(this.gl, type);
		this._shader = this.gl.createShader(glType);
		this._type = type;
		this._isCompiled = false;
		this._source = null;
	}

	/** Gets the GL shader object. */
	public get glShader(): WebGLShader {
		this.assertNotDisposed();
		return this._shader;
	}

	/** Gets the shader's type. */
	public get type(): ShaderType {
		this.assertNotDisposed();
		return this._type;
	}

	/** Gets if the shader is compiled. */
	public get isCompiled(): boolean {
		this.assertNotDisposed();
		return this._isCompiled;
	}

	/** Gets the source code from a successfully compiled shader. */
	public get source(): string {
		this.assertNotDisposed();
		return this._source;
	}

	/**
	 * Compiles the shader from source code.
	 * The shader can be disposed after being linked to a shader program.
	 * @param source The shader source code.
	 */
	public compile(source: string) {
		this.assertNotDisposed();

		if (this._isCompiled)
			throw new Error("This shader has already been compiled.");

		const gl = this.gl;
		gl.shaderSource(this._shader, source);
		gl.compileShader(this._shader);

		const log = gl.getShaderInfoLog(this._shader);

		// COMPILE_STATUS returns false if compilation completely failed
		if (!gl.getShaderParameter(this._shader, gl.COMPILE_STATUS)) {
			console.error(`Failed to compile ${this._type} shader:\n`, log);
		}
		else {
			if (log.length > 0)
				console.warn(`${this._type} shader compile log:\n`, log);
			this._source = source;
			this._isCompiled = true;
		}
	}

	protected destroy() {
		this.gl.deleteShader(this._shader);
		this._isCompiled = false;
		this._source = null;
	}

	private static getShaderTypeId(
		gl: WebGLRenderingContext,
		type: ShaderType
	): number {
		switch (type) {
			case ShaderType.Vertex: return gl.VERTEX_SHADER;
			case ShaderType.Fragment: return gl.FRAGMENT_SHADER;

			default:
				throw new SyntaxError(`Unsupported 'type' ${type}.`);
		}
	}
}