import * as Content from "../Namespaces/Content";
import { Common } from "../Namespaces/Helper";
import { getAppContentList } from "../Content/ContentRegistry";
import { updateLoadingProgress } from "./ContentLoadingInfo";

export default class AppContent {

	public readonly manager: Content.Manager;

	/**
	 * Constructs the app content.
	 * @param gl The GL context used for constructing GL resources.
	 */
	constructor(gl: WebGLRenderingContext, onLoad?: Content.LoadCallback) {
		this.manager = new Content.Manager(gl);

		this.downloadAssets().then(() => {
			this.manager.linkShaderPairs();

			try {
				if (onLoad)
					onLoad(this.manager);
			}
			catch (e) {
				console.error("'onLoad' callback threw an error:\n", e);
			}

		}).catch((reason) => {
			console.error("Failed to load content:\n", reason)
		});
	}

	private async downloadAssets() {
		const result = await this.manager.downloadAsync(
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