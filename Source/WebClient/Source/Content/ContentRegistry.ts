import { TextureQuality } from "../Content/TextureQuality";
import { Type } from "./ContentType";
import { List } from "./ContentList";
import { getDescription } from "./ContentDescriptions";

declare let appContentList: List;

export function getAppContentList(): List {
	return appContentList;
}

export default class ContentRegistry {

	public static readonly TerrainTexture = TextureQuality.Low + "/TB_diffuse";

	public static readonly textures = [
		ContentRegistry.TerrainTexture
	];

	public static readonly shaders = [
		"mapsegment-colored",
		"mapsegment-textured"
	];

	public static readonly blobs = [
		"TerrainUV"
	];

	public static toList(): List {
		const list = new List();

		for (const texture of ContentRegistry.textures) {
			const texDesc = getDescription(Type.Texture);
			list.push(`${texDesc.path}/${texture}${texDesc.extension}`);
		}

		for (const shader of ContentRegistry.shaders) {
			const vsDesc = getDescription(Type.VertexShader);
			const fsDesc = getDescription(Type.FragmentShader);
			list.push(`${vsDesc.path}/${shader}${vsDesc.extension}`);
			list.push(`${fsDesc.path}/${shader}${fsDesc.extension}`);
		}

		for (const binData of ContentRegistry.blobs) {
			const binDesc = getDescription(Type.MessagePack);
			list.push(`${binDesc.path}/${binData}${binDesc.extension}`);
		}

		return list;
	}
}

appContentList = ContentRegistry.toList();