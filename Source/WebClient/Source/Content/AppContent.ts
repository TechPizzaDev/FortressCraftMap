import * as Content from "../Namespaces/Content";
import { Common } from "../Namespaces/Helper";
import { getAppContentList } from "../Content/ContentRegistry";
import { updateLoadingProgress } from "./ContentLoading";

export default class AppContent {

	private _manager: Content.Manager;

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

	private async downloadAssets() {
		const result = await this._manager.downloadAsync(
			getAppContentList(), null, updateLoadingProgress);

		const size = Common.bytesToReadable(result.bytesDownloaded);
		console.log(`Downloaded ${result.files} out of ${result.totalFiles} assets, ${size}`);

		const loader = document.getElementById("initial-loader");
		loader.addEventListener("transitionend", () => loader.remove(), false);
		loader.classList.add("hidden");

		// for browsers that don't support transitionend
		window.setTimeout(() => loader.remove(), 1000);
	}
}