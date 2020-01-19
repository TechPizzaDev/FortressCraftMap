"use strict";

const scriptPath = "Webpack/";
const scriptsToLoad = [
	scriptPath + "dependencies.js",
	scriptPath + "main.js"
];
const resourcesToLoad = [...scriptsToLoad];

const assetStatus = {
	percentage: 0,
	bytesDownloaded: 0,
	files: 0,
	totalFiles: appContentList.count
};
const appLoadStatus = {
	percentage: 0,
	bytesDownloaded: 0,
	files: 0,
	totalFiles: resourcesToLoad.length
};
appUpdateLoadingProgress([appLoadStatus, assetStatus]);

resourcesToLoad.map(resource => {
	if (resource.startsWith(scriptPath)) {
		const scriptNode = document.createElement("script");
		scriptNode.src = resource;
		scriptNode.onload = () => {
			appLoadStatus.percentage += 1 / resourcesToLoad.length;
			appLoadStatus.files++;
			appUpdateLoadingProgress([appLoadStatus, assetStatus]);
		};
		document.documentElement.appendChild(scriptNode);
	}
	else {
		throw new Error(`Could not determine resource type from "${resource}"`);
	}
});