import * as Content from "../Namespaces/Content";
import { Web, Common } from "../Namespaces/Helper";

interface ListObject {
	readonly uri: string;
	readonly type: XMLHttpRequestResponseType;
}

/**
 * List of content URIs that can be downloaded in batch later.
 * */
export class List {

	private _items: ListObject[];

	/** 
	 *  This number allows multiple downloads to occur concurrently.
	 *  There's probably no reason to download the same list multiple times concurrently, 
	 *  but the functionality is here.
	 */
	private _lockCount: number;

	/** Used to disallow further pushing of URIs after a download starts. */
	public get isLocked(): boolean {
		return this._lockCount > 0;
	}

	constructor() {
		this._items = [];
		this._lockCount = 0;
	}

	/**
	 * Adds a content URI to the list.
	 * @param uri The content URI.
	 */
	public push(uri: string) {
		this.assertNotLocked();
		List.assertValidUri(uri);

		const type = Content.getXHRType(uri);
		this._items.push({ uri, type });
	}

	public clear() {
		this.assertNotLocked();

		Common.clearArray(this._items);
	}

	/**
	 * Downloads the list asynchronously.
	 * @param onDownload Callback for an both successful and failed resource downloads.
	 * @param onProgress Callback that gives access to download statistics.
	 * @returns Promise that resolves into the amount of successfully downloaded resources.
	 */
	public async downloadAsync(
		onDownload: Content.DownloadCallback,
		onProgress?: Content.StatusCallback
	): Promise<number> {
		this._lockCount++;

		return new Promise<number>(async (resolve) => {
			const status = {
				percentage: 0,
				totalBytesDownloaded: 0,
				totalFiles: this._items.length
			};
			// give the caller early access to the status
			const reportProgress = () => {
				if (onProgress)
					onProgress(status);
			};
			reportProgress();

			const progressMul = 1 / this._items.length;
			let successCount = 0;

			for (let i = 0; i < this._items.length; i++) {
				const state = {
					uri: this._items[i].uri,
					type: this._items[i].type,
					lastLoaded: 0,
					hasLength: false
				};

				const onHandle = (request: XMLHttpRequest) => {
					request.responseType = state.type;
					request.onprogress = (ev: ProgressEvent) => {
						const loadDiff = ev.loaded - state.lastLoaded;
						state.lastLoaded = ev.loaded;
						status.totalBytesDownloaded += loadDiff;

						if (ev.lengthComputable) {
							state.hasLength = true;
							status.percentage += loadDiff / ev.total * progressMul;
						}

						reportProgress();
					};
				};

				// the requestPromise should return a HttpResponse on rejection
				const onFinish = (result: Web.HttpResponse) => {
					if (!state.hasLength)
						status.percentage += progressMul;

					if (onDownload)
						onDownload(state.uri, result);

					reportProgress();
				};

				const onSuccess = (result: Web.HttpResponse) => {
					successCount++;
					onFinish(result);
				};

				const requestPromise = Web.requestAsync(state.uri, null, null, onHandle);
				await requestPromise.then(onSuccess, onFinish);
			}

			reportProgress();
			resolve(successCount);

		}).finally(() => {
			this._lockCount--;
		});
	}

	protected assertNotLocked() {
		if (this.isLocked)
			throw new Error("This list is locked because of an ongoing download.");
	}

	/**
	 * Throws if the name:
	 *  - ends with a slash.
	 * @param name
	 */
	public static assertValidUri(name: string) {
		if (name.endsWith("/") || name.endsWith("\\"))
			throw new Error("Name may not end with '/' nor '\\'.");
	}
}