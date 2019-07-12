import Disposable from "../../Utility/Disposable";
import ShaderProgram, { ShaderAttribPointer } from "./ShaderProgram";
import { Common } from "../../Namespaces/Helper";

// these types are ordered the way the are so linting hover-over is well sorted

export type ShaderVaryingType =
	"float" | "mat2" | "mat3" | "mat4" | "vec2" | "vec3" | "vec4";

export type ShaderDataType =
	"int" | "bool" | ShaderVaryingType;

export type ShaderUniformType =
	"sampler2D" | "samplerCube" | ShaderDataType |
	"ivec2" | "ivec3" | "ivec4" |
	"bvec2" | "bvec3" | "bvec4";

type ShaderAttribute = ShaderField<GLint, ShaderDataType>;
type ShaderUniform = ShaderField<WebGLUniformLocation, ShaderUniformType>;
type ShaderVarying = ShaderField<void, ShaderVaryingType>;

export default class ShaderDescription extends Disposable {

	private _attributes = new Map<string, ShaderAttribute>();
	private _uniforms = new Map<string, ShaderUniform>();
	private _varyings = new Map<string, ShaderVarying>();

	private constructor() {
		super();
	}

	public get attributes(): IterableIterator<ShaderAttribute> {
		this.assertNotDisposed();
		return this._attributes.values();
	}

	public get uniforms(): IterableIterator<ShaderUniform> {
		this.assertNotDisposed();
		return this._uniforms.values();
	}

	public get varyings(): IterableIterator<ShaderVarying> {
		this.assertNotDisposed();
		return this._varyings.values();
	}

	public getUniformField(name: string): ShaderUniform {
		this.assertNotDisposed();
		return this._uniforms.get(name);
	}

	/**
	 * Returns a cached uniform location.
	 * @param name The name of the uniform.
	 */
	public getUniformLocation(name: string): WebGLUniformLocation {
		return this.getUniformField(name).location;
	}

	public getAttributeField(name: string): ShaderAttribute {
		this.assertNotDisposed();
		return this._attributes.get(name);
	}

	/**
	 * Returns a cached attribute location.
	 * @param name The name of the attribute.
	 */
	public getAttributeLocation(name: string): GLint {
		return this.getAttributeField(name).location;
	}

	protected destroy() {
		this._attributes = null;
		this._uniforms = null;
		this._varyings = null;
	}

	/**
	 * Match helper for finding '[keyword] [type] [name];' fields in shader source code.
	 * @param source
	 */
	public static matchFields(source: string): RegExpMatchArray {
		return source.match(/(?:\w+\s){2}\w+(?=;)/gm);
	}

	/**
	 * Merges multiple shader descriptions into one.
	 * @param descriptions The shader descriptions to merge.
	 */
	public static merge(...descriptions: ShaderDescription[]) {
		if (descriptions.length < 2)
			throw new SyntaxError("At least 2 descriptions are required.");

		const result = new ShaderDescription();
		for (const desc of descriptions) {
			if (result._attributes.size > 0 && desc._attributes.size > 0)
				throw new Error("Only one description may have attribute fields.");

			Common.copyMapTo(desc._attributes, result._attributes);
			Common.copyMapTo(desc._uniforms, result._uniforms);
			Common.copyMapTo(desc._varyings, result._varyings);
		}

		return result;
	}
	
	/**
	 * Creates a shader description.
	 * @param program The shader program used to get locations.
	 * @param shaderSource The shader source code to parse for fields.
	 */
	public static create(program: ShaderProgram, shaderSource: string): ShaderDescription {
		const result = new ShaderDescription();
		const fields = ShaderDescription.matchFields(shaderSource);
		for (const field of fields) {
			const words = field.split(" ");
			const key = words[0];
			const name = words[2];

			// we can ignore checks on the type as the shader 
			// wouldn't compile with wrong types anyways
			const type = words[1];

			switch (key) {
				case "attribute":
					result._attributes.set(name, new ShaderField<GLint, ShaderDataType>(
						program.getAttribLocation(name), <ShaderDataType>type, name));
					break;

				case "uniform":
					result._uniforms.set(name, new ShaderField<WebGLUniformLocation, ShaderUniformType>(
						program.getUniformLocation(name), <ShaderUniformType>type, name));
					break;

				case "varying":
					result._varyings.set(name, new ShaderField<void, ShaderVaryingType>(
						null, <ShaderVaryingType>type, name));
					break;

				case "precision":
					continue;

				default:
					console.warn(`Unrecognized shader field keyword '${key}'.`);
			}
		}
		return result;
	}
}

/** Generic object for some shader fields. */
export class ShaderField<TLocation, TType>
{
	/** The location of the shader field. */
	public readonly location: TLocation;

	/** The data type of the shader field. */
	public readonly type: TType;

	/** The name of the shader field. */
	public readonly name: string;

	/**
	 * Constructs the field description.
	 * @param name The name of the shader field.
	 */
	constructor(location: TLocation, type: TType, name: string) {
		this.location = location;
		this.type = type;
		this.name = name;
	}

	/**
	 * Checks if the other field has the same type and name.
	 * @param other The other field to compare to this one.
	 */
	public definitionEquals(other: ShaderField<TLocation, TType>): boolean {
		return this.type == other.type && this.name == other.name;
	}
}