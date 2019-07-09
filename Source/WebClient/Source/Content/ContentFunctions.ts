import { Type } from "./ContentType";
import { TypeDescription } from "./ContentInterfaces";

export const ShaderPath = "/Shaders";

const Descriptions = new Map<Type, TypeDescription>([
	[Type.Texture, { path: "/Textures", extension: ".png" }],
	[Type.VertexShader, { path: `${ShaderPath}/Vertex`, extension: ".glsl" }],
	[Type.FragmentShader, { path: `${ShaderPath}/Fragment`, extension: ".glsl" }]
]);

export function getDescription(type: Type): TypeDescription {
	if (Descriptions.has(type))
		return Descriptions.get(type);
	throw new Error(`Failed to get description for type '${type}'.`);
}

export function getRootPath(type: Type): string {
	return getDescription(type).path;
}

export function getExtension(type: Type): string {
	return getDescription(type).extension;
}

export function getType(uri: string): Type {
	for (const [type, desc] of Descriptions) {
		if (uri.startsWith(desc.path) && uri.endsWith(desc.extension))
			return type;
	}
	throw new Error(`Failed to identify content type from URI '${uri}'.`);
}

/**
 * Gets the needed response type for the content type.
 * @param source The content type or content URI.
 */
export function getXHRType(source: Type | string): XMLHttpRequestResponseType {
	if (typeof (source) == "string")
		source = getType(source);

	switch (source) {
		case Type.Texture:
			return "blob";

		case Type.VertexShader:
		case Type.FragmentShader:
			return "text";

		default:
			throw new Error(`Failed to get response type for '${source}'.`);
	}
}