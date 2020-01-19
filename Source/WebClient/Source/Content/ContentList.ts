import { Web, Common } from "../Namespaces/Helper";
import { DownloadStatus, DownloadCallback, StatusCallback } from "./ContentInterfaces";
import { getXHRType } from "./ContentDescriptions";

interface ListObject {
	readonly uri: string;
	readonly type: XMLHttpRequestResponseType;
}

/**
 * List of content URIs that can be downloaded in batch.
 * */
export class List {

	private _items: ListObject[];

	/** 
	 *  This number allows multiple downloads to occur concurrently.
	 *  There's probably no reason to download the same list multiple times concurrently, 
	 *  but the functionality is here.
	 */
	private _lockCount: number;

	/** Gets whether further pushing of URIs is disallowed after a download starts. */
	public get isLocked(): boolean {
		return this._lockCount > 0;
	}

	public get count(): number {
		return this._items.length;
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

		const type = getXHRType(uri);
		this._items.push({ uri, type });
	}

	public clear() {
		this.assertNotLocked();

		Common.clearArray(this._items);
	}

	/**
	 * Downloads the list asynchronously.
	 * @param onDownload Callback for both successful and failed resource downloads.
	 * @param onProgress Callback that gives access to download statistics.
	 * @returns Promise that resolves into the amount of successfully downloaded resources.
	 */
	public async downloadAsync(
		onDownload: DownloadCallback,
		onProgress?: StatusCallback
	): Promise<DownloadStatus> {

		this._lockCount++;

		return new Promise<DownloadStatus>(async (resolve) => {

			const status = {
				percentage: 0,
				bytesDownloaded: 0,
				files: 0,
				totalFiles: this._items.length
			};

			const reportProgress = () => {
				if (onProgress)
					onProgress(status);
			};
			// give the caller early access to the status
			reportProgress();

			const progressMul = 1 / this._items.length;

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
						status.bytesDownloaded += loadDiff;

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
					status.files++;
					onFinish(result);
				};

				const requestPromise = Web.requestAsync(state.uri, null, null, onHandle);
				await requestPromise.then(onSuccess, onFinish);
			}

			reportProgress();
			resolve(status);

		}).finally(() => {
			this._lockCount--;
		});
	}

	protected assertNotLocked() {
		if (this.isLocked)
			throw new Error(
				"This list is locked because of an ongoing download and can not be modified.");
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