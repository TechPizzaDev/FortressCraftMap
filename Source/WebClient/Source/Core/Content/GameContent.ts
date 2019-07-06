import * as Content from "../Content";
import { Common } from "../../Utility/Helper";
import ContentRegistry from "./ContentRegistry";

export default class GameContent {

	private _manager: Content.Manager;
	private _list: Content.List;

	/**
	 * Constructs the game content.
	 * @param gl The GL context used for constructing GL resources.
	 */
	constructor(gl: WebGLRenderingContext, onLoad?: () => void) {
		this._manager = new Content.Manager(gl);

		this.initializeContentList();
		this.downloadContent().then(
			() => {
				this._manager.linkShaderPairs();

				if (onLoad)
					onLoad();
			},
			(reason) => {
			console.error("Failed to load content:", reason);
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

		// delay the fade animation slightly
		window.setTimeout(() => {
			const loader = document.getElementById("initial-loader");
			loader.addEventListener("transitionend", () => loader.remove(), false);
			loader.classList.add("fadeaway");

			// for browsers that don't support transitionend
			window.setTimeout(() => loader.remove(), 1000);
		}, 50);
	}

	private pushShader(name: string) {
		this._list.push(`${Content.VertexShaderPath}/${name}.glsl`);
		this._list.push(`${Content.FragmentShaderPath}/${name}.glsl`);
	}

	private pushTexture(name: string) {
		this._list.push(`${Content.TexturePath}/${name}.png`);
	}
}