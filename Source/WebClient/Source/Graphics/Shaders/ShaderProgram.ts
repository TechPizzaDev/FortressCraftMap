import GLResource from "./../GLResource";
import Shader from "./Shader";
import ShaderDescription from "./ShaderDescription";

export type ShaderAttribDataType = "float" | "byte" | "ubyte" | "short" | "ushort";

/**
 * Wrapper of WebGLShaderProgram for simpler shader setup.
 * */
export default class ShaderProgram extends GLResource {

	private _program: WebGLProgram;
	private _isLinked: boolean;
	private _description: ShaderDescription;

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
		this.assertLinked();
		return this._program;
	}

	/** Gets if the shader program is linked with shaders. */
	public get isLinked(): boolean {
		this.assertNotDisposed();
		return this._isLinked;
	}

	public get description(): ShaderDescription {
		this.assertLinked();
		return this._description;
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

		const gl = this.gl;
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

			const vsDesc = ShaderDescription.create(this, vertexShader.source);
			const fsDesc = ShaderDescription.create(this, fragmentShader.source);
			this._description = ShaderDescription.merge(vsDesc, fsDesc);
		}
	}

	/**
	 * Gets the uniform location from the shader program.
	 * @param name The name of the uniform.
	 */
	public getUniformLocation(name: string): WebGLUniformLocation {
		this.assertLinked();
		return this.gl.getUniformLocation(this.glProgram, name);
	}

	/**
	 * Gets the attribute location from the shader program.
	 * @param name The name of the attribute.
	 */
	public getAttribLocation(name: string): GLint {
		this.assertLinked();
		return this.gl.getAttribLocation(this.glProgram, name);
	}

	public useProgram() {
		this.assertLinked();
		return this.gl.useProgram(this.glProgram);
	}

	public uniform1i(name: string, x: number) {
		this.gl.uniform1i(this._description.getUniformLocation(name), x);
	}

	public uniform4f(name: string, x: number, y: number, z: number, w: number) {
		this.gl.uniform4f(this._description.getUniformLocation(name), x, y, z, w);
	}

	public uniform4fv(name: string, value: Float32List) {
		this.gl.uniform4fv(this._description.getUniformLocation(name), value);
	}

	public uniformMatrix4fv(name: string, value: Float32List, transpose: boolean = false) {
		this.gl.uniformMatrix4fv(this._description.getUniformLocation(name), transpose, value);
	}

	protected assertLinked() {
		this.assertNotDisposed();
		if (!this._isLinked)
			throw new Error("The shader program has not been linked with shaders.");
	}

	protected destroy() {
		this._description.dispose();
		this.gl.deleteProgram(this._program);
		this._isLinked = false;
	}
}

