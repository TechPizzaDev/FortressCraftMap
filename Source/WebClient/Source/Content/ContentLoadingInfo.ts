import { DownloadStatus } from "./ContentInterfaces";

declare const appLoadStatus: DownloadStatus;

export function updateLoadingProgress(status: DownloadStatus) {
	updateLoadingProgressCore([appLoadStatus, status]);
}

function updateLoadingProgressCore(statuses: DownloadStatus[]) {
	const appLoadingProgressBar = document.getElementById("loading-bar-percentage");
	const appLoadingProgressSpan = appLoadingProgressBar.getElementsByTagName("span")[0];

	const filesToDownload = statuses.map(x => x.totalFiles).reduce((total, x) => total + x);
	const filesDownloaded = statuses.map(x => x.files).reduce((total, x) => total + x);
	appLoadingProgressSpan.innerText = `${filesDownloaded}/${filesToDownload}`;

	const percentageParts = statuses.map(x => x.percentage * x.totalFiles / filesToDownload);
	const percentage = percentageParts.reduce((total, x) => total + x);

	appLoadingProgressBar.style.width = (Math.round(percentage * 1000) / 10) + "%";
}

declare let appUpdateLoadingProgress: (statuses: DownloadStatus[]) => void;
appUpdateLoadingProgress = updateLoadingProgressCore;