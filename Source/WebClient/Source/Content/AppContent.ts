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
	constructor(gl: WebGLRenderingContext, onLoad?: Content.LoadCallback) {
		this._manager = new Content.Manager(gl);

		this.initializeContentList();
		this.downloadContent().then(() => {
			this._manager.linkShaderPairs();

			try {
				if (onLoad)
					onLoad(this._manager);
			}
			catch (e) {
				console.error("'onLoad' callback threw an error:\n", e);
			}

		}).catch((reason) => {
			console.error("Failed to load content:\n", reason)
		});
	}

	public get manager(): Content.Manager {
		return this._manager;
	}

	private initializeContentList() {
		this._list = new Content.List();

		for (const texture of ContentRegistry.textures) {
			const tDesc = Content.getDescription(Content.Type.Texture);
			this._list.push(`${tDesc.path}/${texture}${tDesc.extension}`);
		}

		for (const shader of ContentRegistry.shaders) {
			const vsDesc = Content.getDescription(Content.Type.VertexShader);
			const fsDesc = Content.getDescription(Content.Type.FragmentShader);
			this._list.push(`${vsDesc.path}/${shader}${vsDesc.extension}`);
			this._list.push(`${fsDesc.path}/${shader}${fsDesc.extension}`);
		}

		for (const binData of ContentRegistry.messagePacks) {
			const bdDesc = Content.getDescription(Content.Type.MessagePack);
			this._list.push(`${bdDesc.path}/${binData}${bdDesc.extension}`);
		}
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
		loader.classList.add("hidden");

		// for browsers that don't support transitionend
		window.setTimeout(() => loader.remove(), 1000);
	}
}