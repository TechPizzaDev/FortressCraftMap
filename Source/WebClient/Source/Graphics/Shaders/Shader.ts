import GLResource from "./../GLResource";

/**
 * Wrapper of WebGLShader for simpler shader compilation.
 * This shader object can be disposed after being linked to a shader program.
 * */
export default class Shader extends GLResource {

	private _shader: WebGLShader;
	private _isCompiled: boolean;
	private _type: ShaderType;

	/**
	 * Constructs the shader.
	 * @param gl The GL context.
	 * @param type The shader type.
	 */
	constructor(gl: WebGLRenderingContext, type: ShaderType) {
		super(gl);

		const glType = Shader.getShaderTypeId(this.glContext, type);
		this._shader = this.glContext.createShader(glType);
		this._isCompiled = false;
		this._type = type;
	}

	/** Gets the GL shader object. */
	public get glShader(): WebGLShader {
		this.assertNotDisposed();
		return this._shader;
	}

	/** Gets if the shader is compiled. */
	public get isCompiled(): boolean {
		this.assertNotDisposed();
		return this._isCompiled;
	}

	/** Gets the shader's type. */
	public get type(): ShaderType {
		this.assertNotDisposed();
		return this._type;
	}

	public compile(source: string) {
		this.assertNotDisposed();

		if (this._isCompiled)
			throw new Error("This shader has already been compiled.");

		const gl = this.glContext;
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
			this._isCompiled = true;
		}
	}

	protected destroy() {
		this.glContext.deleteShader(this._shader);
		this._isCompiled = false;
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