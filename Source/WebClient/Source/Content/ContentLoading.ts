import { DownloadStatus } from "./ContentInterfaces";

declare const appLoadingProgressBar: HTMLDivElement;
declare const appLoadingProgressSpan: HTMLSpanElement;

declare const appLoadState: {
	readonly files: number,
	readonly bytesDownloaded: number
}

export function updateLoadingProgress(status: DownloadStatus) {
	const filesToDownload = status.totalFiles + appLoadState.files;
	const filesDownloaded = status.files + appLoadState.files;
	appLoadingProgressSpan.innerText = `${filesDownloaded}/${filesToDownload}`;

	const appLoadPercentagePart = appLoadState.files / filesToDownload;
	const assetPercentagePart = status.percentage * status.files / filesToDownload;
	const percentage = appLoadPercentagePart + assetPercentagePart;
	appLoadingProgressBar.style.width = (Math.round(percentage * 1000) / 10) + "%";
}

declare let appUpdateLoadingProgress: (status: DownloadStatus) => void;
appUpdateLoadingProgress = updateLoadingProgress;