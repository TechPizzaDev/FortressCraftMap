import GLResource from "./../GLResource";
import { ShaderField, ShaderDataType } from "./ShaderDescription";
import { ShaderAttribDataType } from "./ShaderProgram";

export class ShaderAttribPointer extends GLResource {

    public location: GLint;
    public size: number;
    public type: number;
    public normalized: boolean;
    public stride: number;
    public offset: number;

    private constructor(gl: WebGLRenderingContext) {
        super(gl);
        this.location = -1;
        this.size = -1;
        this.type = -1;
        this.normalized = false;
        this.stride = 0;
        this.offset = 0;
    }

    /**
     * Enables the attribute location for this pointer.
     */
    public enable() {
        this.assertNotDisposed();
        this.gl.enableVertexAttribArray(this.location);
    }

    /**
     * Disables the attribute location for this pointer.
     */
    public disable() {
        this.assertNotDisposed();
        this.gl.disableVertexAttribArray(this.location);
    }

    /**
     * Applies the vertex attribute pointer.
     */
    public apply() {
        this.assertNotDisposed();
        this.gl.vertexAttribPointer(this.location, this.size, this.type, this.normalized, this.stride, this.offset);
    }

    public static createFrom(
        gl: WebGLRenderingContext,
        field: ShaderField<GLint, ShaderDataType>,
        size: number,
        type?: ShaderAttribDataType)
        : ShaderAttribPointer {

        const ptr = new ShaderAttribPointer(gl);
        ptr.location = field.location;
        ptr.size = size;
        ptr.type = type ? this.getDataType(gl, type) : this.guessDataType(gl, field.type);
        return ptr;
    }

    protected destroy() {
        this.location = -1;
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
