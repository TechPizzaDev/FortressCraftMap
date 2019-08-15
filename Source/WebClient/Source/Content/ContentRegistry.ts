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

	public static readonly messagePacks = [
		"TerrainUV"
	];

}