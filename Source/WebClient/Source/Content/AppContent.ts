import * as Content from "../Namespaces/Content";
import { Common } from "../Namespaces/Helper";

declare var appLoadState: {
	filesDownloaded: number,
	bytesDownloaded: number
};

export default class AppContent {

	private _manager: Content.Manager;
	private _list: Content.List;

	/**
	 * Constructs the app content.
	 * @param gl The GL context used for constructing GL resources.
	 */
	constructor(gl: WebGLRenderingContext, onLoad?: Content.LoadCallback) {
		this._manager = new Content.Manager(gl);

		this.downloadAssets().then(() => {
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

	private async downloadAssets(onLoad?: () => void) {
		const progressBar = document.getElementById("loading-bar-percentage");
		const progressSpan = progressBar.getElementsByTagName("span")[0];

		let assetsDownloaded = 0;
		let status: Content.DownloadStatus = null;

		const assetDownloads = await this._manager.downloadAsync(
			this._list,
			() => {
				assetsDownloaded++;
			},
			(s) => {
				status = s;

				const filesToDownload = s.totalFiles + appLoadState.filesDownloaded;
				const filesDownloaded = assetsDownloaded + appLoadState.filesDownloaded;
				progressSpan.innerText = `${filesDownloaded}/${filesToDownload}`;
				
				const appLoadPercentagePart = appLoadState.filesDownloaded / filesToDownload;
				const assetPercentagePart = s.percentage * assetsDownloaded / filesToDownload;
				const percentage = appLoadPercentagePart + assetPercentagePart;
				progressBar.style.width = (Math.round(percentage * 1000) / 10) + "%";
			}
		);

		const size = Common.bytesToReadable(status.bytesDownloaded);
		console.log(`Downloaded ${assetDownloads} out of ${status.totalFiles} assets, ${size}`);

		const loader = document.getElementById("initial-loader");
		loader.addEventListener("transitionend", () => loader.remove(), false);
		loader.classList.add("hidden");

		// for browsers that don't support transitionend
		window.setTimeout(() => loader.remove(), 1000);
	}
}