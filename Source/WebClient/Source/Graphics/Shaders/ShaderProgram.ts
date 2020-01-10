import GLResource from "./../GLResource";
import Shader from "./Shader";
import ShaderDescription, { ShaderField, ShaderDataType } from "./ShaderDescription";

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
		return this.glContext.getUniformLocation(this.glProgram, name);
	}

	/**
	 * Gets the attribute location from the shader program.
	 * @param name The name of the attribute.
	 */
	public getAttribLocation(name: string): GLint {
		this.assertLinked();
		return this.glContext.getAttribLocation(this.glProgram, name);
	}

	public useProgram() {
		this.assertLinked();
		return this.glContext.useProgram(this.glProgram);
	}

	public uniform1i(name: string, x: number) {
		this.glContext.uniform1i(this.description.getUniformLocation(name), x);
	}

	public uniform4f(name: string, x: number, y: number, z: number, w: number) {
		this.glContext.uniform4f(this.description.getUniformLocation(name), x, y, z, w);
	}

	public uniform4fv(name: string, value: Float32List) {
		this.glContext.uniform4fv(this.description.getUniformLocation(name), value);
	}

	public uniformMatrix4fv(name: string, value: Float32List, transpose: boolean = false) {
		this.glContext.uniformMatrix4fv(this.description.getUniformLocation(name), transpose, value);
	}

	protected assertLinked() {
		this.assertNotDisposed();
		if (!this._isLinked)
			throw new Error("The shader program has not been linked with shaders.");
	}

	protected destroy() {
		this.glContext.deleteProgram(this._program);
		this._isLinked = false;
	}
}

export class ShaderAttribPointer {

	public location: GLint;
	public size: number;
	public type: number;
	public normalized: boolean;
	public stride: number;
	public offset: number;

	constructor() {
		this.location = -1;
		this.size = -1;
		this.type = -1;
		this.normalized = false;
		this.stride = 0;
		this.offset = 0;
	}

	/**
	 * Enables the attribute location for this pointer.
	 * @param gl
	 */
	public enable(gl: WebGLRenderingContext) {
		gl.enableVertexAttribArray(this.location);
	}

	/**
	 * Disables the attribute location for this pointer.
	 * @param gl
	 */
	public disable(gl: WebGLRenderingContext) {
		gl.disableVertexAttribArray(this.location);
	}

	/**
	 * Applies the vertex attribute pointer.
	 * @param gl The GL context.
	 */
	public apply(gl: WebGLRenderingContext) {
		gl.vertexAttribPointer(
			this.location, this.size, this.type, this.normalized, this.stride, this.offset);
	}

	public static createFrom(
		gl: WebGLRenderingContext,
		field: ShaderField<GLint, ShaderDataType>,
		size: number,
		type?: ShaderAttribDataType
	): ShaderAttribPointer {
		const ptr = new ShaderAttribPointer();
		ptr.location = field.location;
		ptr.size = size;
		ptr.type = type ? this.getDataType(gl, type) : this.guessDataType(gl, field.type);
		return ptr;
	}

	public static getDataType(gl: WebGLRenderingContext, type: ShaderAttribDataType): number {
		switch (type) {
			case "float": return gl.FLOAT;
			case "byte": return gl.BYTE;
			case "ubyte": return gl.UNSIGNED_BYTE;
			case "short": return gl.SHORT;
			case "ushort": return gl.UNSIGNED_SHORT;

			default:
				throw new Error(`Invalid 'type' '${type}'.`);
		}
	}

	public static guessDataType(gl: WebGLRenderingContext, type: ShaderDataType): number {
		switch (type) {
			case "int":
			case "bool":
				return gl.BYTE;

			case "float":
			case "mat2": 
			case "mat3": 
			case "mat4":
			case "vec2": 
			case "vec3": 
			case "vec4":
				return gl.FLOAT;

			default:
				throw new Error(`Invalid 'type' '${type}'.`);
		}
	}
}