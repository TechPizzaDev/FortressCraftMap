import { Web } from "../Namespaces/Helper";

/** Callback giving the caller access to download statistics. */
export type StatusCallback = (status: DownloadStatus) => void;

/** Callback for an either successful or failed resource download. */
export type DownloadCallback = (uri: string, response: Web.HttpResponse) => void;

/** Statistics used to observe download progress. */
export interface DownloadStatus {

	/** Gets the progress percentage of the request. */
	readonly percentage: number;

	/** Gets the total amount of bytes that have been downloaded. */
	readonly bytesDownloaded: number;

	/** Gets the amount of files that have been downloaded. */
	readonly files: number;

	/** Gets the total amount of files that the request will download. */
	readonly totalFiles: number;
}