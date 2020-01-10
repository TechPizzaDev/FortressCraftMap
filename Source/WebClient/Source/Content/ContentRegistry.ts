import * as Content from "../Namespaces/Content";
import { TextureQuality } from "./TextureQuality";

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
	
	public static toList(): Content.List {
		const list = new Content.List();

		for (const texture of ContentRegistry.textures) {
			const texDesc = Content.getDescription(Content.Type.Texture);
			list.push(`${texDesc.path}/${texture}${texDesc.extension}`);
		}

		for (const shader of ContentRegistry.shaders) {
			const vsDesc = Content.getDescription(Content.Type.VertexShader);
			const fsDesc = Content.getDescription(Content.Type.FragmentShader);
			list.push(`${vsDesc.path}/${shader}${vsDesc.extension}`);
			list.push(`${fsDesc.path}/${shader}${fsDesc.extension}`);
		}

		for (const binData of ContentRegistry.blobs) {
			const binDesc = Content.getDescription(Content.Type.MessagePack);
			list.push(`${binDesc.path}/${binData}${binDesc.extension}`);
		}

		return list;
	}
}