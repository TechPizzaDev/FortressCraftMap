import { Web } from "../Utility/Helper";

/** Callback giving the caller access to download statistics. */
export type StatusCallback = (status: DownloadStatus) => void;

/** Callback for an either successful or failed resource download. */
export type DownloadCallback = (uri: string, response: Web.HttpResponse) => void;

/** Statistics used to observe download progress. */
export interface DownloadStatus {

	/** Gets the progress percentage of the request. */
	readonly percentage: number;

	/** Gets the total amount of bytes that the request has downloaded. */
	readonly totalBytesDownloaded: number;

	/** Gets the total amount of files that the request will download. */
	readonly totalFiles: number;
}

// Content directory paths;
//  * should only use forward slash for path separation.
//  * should begin with a slash.
//  * may not end with a slash.

export const TextureExtension = ".png";
export const TexturePath = "/Textures";

export const ShaderExtension = ".glsl";
export const VertexShaderPath = "/Shaders/Vertex";
export const FragmentShaderPath = "/Shaders/Fragment";

/**
 * Gets the needed response type for the corresponding file type.
 * @param extension The file extension.
 */
export function getXHRType(extension: string): XMLHttpRequestResponseType {
	switch (extension) {
		case ".json":
			return "json";

		case TextureExtension:
			return "blob";

		case ShaderExtension:
			return "text";
	}
	throw new Error(`Failed to get response type for '${extension}'.`);
}

export * from "./Content/ContentManager";
export * from "./Content/ContentList";