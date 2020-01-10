
/** Statistics used to observe download progress. */
export interface DownloadStatus {

	/** Gets the progress percentage of the request. */
	readonly percentage: number;

	/** Gets the total amount of bytes that the request has downloaded. */
	readonly bytesDownloaded: number;

	/** Gets the total amount of files that the request will download. */
	readonly totalFiles: number;
}

/** Defines attributes about a content type. */
export interface TypeDescription {

	/** Gets the root path to the content.
	 * Content root paths should;
	 *  * use forward slash for path separation.
	 *  * begin with a slash.
	 *  * not end with a slash.
	 */
	readonly path: string;

	/** Gets the file extension used by the content type. */
	readonly extension: string;
}