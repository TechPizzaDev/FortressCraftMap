import * as Content from "../Namespaces/Content";
import { Common } from "../Namespaces/Helper";
import ContentRegistry from "./ContentRegistry";

export default class AppContent {

	private _manager: Content.Manager;
	private _list: Content.List;

	/**
	 * Constructs the app content.
	 * @param gl The GL context used for constructing GL resources.
	 */
	constructor(gl: WebGLRenderingContext, onLoad?: () => void) {
		this._manager = new Content.Manager(gl);

		this.initializeContentList();
		this.downloadContent().then(() => {

			this._manager.linkShaderPairs();

			if (onLoad)
				onLoad();

		}).catch((reason) => {
			console.error("Failed to load content:\n", reason)
		});
	}

	private initializeContentList() {
		this._list = new Content.List();

		for(const texture of ContentRegistry.textures)
			this.pushTexture(texture);

		for (const shader of ContentRegistry.shaders)
			this.pushShader(shader);
	}

	private async downloadContent(onLoad?: () => void) {
		const progressBar = document.getElementById("loading-bar-percentage");
		const progressSpan = progressBar.getElementsByTagName("span")[0];

		let downloadCount = 0;
		let status: Content.DownloadStatus = null;

		const successCount = await this._manager.downloadAsync(
			this._list,
			() => {
				downloadCount++;
			},
			(s) => {
				status = s;
				progressBar.style.width = (Math.round(s.percentage * 1000) / 10) + "%";
				progressSpan.innerText = `${downloadCount}/${s.totalFiles}`;
			}
		);

		const size = Common.bytesToReadable(status.totalBytesDownloaded);
		console.log(`Downloaded ${successCount} out of ${status.totalFiles} assets, ${size}`);

		const loader = document.getElementById("initial-loader");
		loader.addEventListener("transitionend", () => loader.remove(), false);
		loader.classList.add("fadeaway");

		// for browsers that don't support transitionend
		window.setTimeout(() => loader.remove(), 1000);
	}

	private pushShader(name: string) {
		const vsDesc = Content.getDescription(Content.Type.VertexShader);
		const fsDesc = Content.getDescription(Content.Type.FragmentShader);
		this._list.push(`${vsDesc.path}/${name}${vsDesc.extension}`);
		this._list.push(`${fsDesc.path}/${name}${fsDesc.extension}`);
	}

	private pushTexture(name: string) {
		const tDesc = Content.getDescription(Content.Type.Texture);
		this._list.push(`${tDesc.path}/${name}${tDesc.extension}`);
	}
}