"use strict";
importScripts("/constants.js");
importScripts("/helper.js");
importScripts("/EventEmitter.js");
importScripts("/ChannelSocket.js");

const canvas = new OffscreenCanvas(segmentResolution, segmentResolution);
const ctx = canvas.getContext("2d");

const segmentChannel = new ChannelSocket("segment");
segmentChannel.subscribeToEvent("message", handleSegmentChannelMessage);
segmentChannel.connect();

self.onmessage = (e) => {
	const intervalID = setInterval(() => {
		if (!segmentChannel.isConnected)
			return;
		clearInterval(intervalID);

		const position = segmentKeyToCoords(e.data);
		segmentChannel.sendRequest("get", { position });
	}, 50);
};

function handleSegmentChannelMessage(msg) {
	const response = JSON.parse(msg.data);
	renderSegment(response.data);

	const result = canvas.transferToImageBitmap();
	const key = coordsToSegmentKey(response.position.x, response.position.y);
	postMessage({ key, result }, [result]);
}

function renderSegment(dataArray) {
	ctx.clearRect(0, 0, segmentResolution, segmentResolution);
	for (let x = 0; x < 16; x++) {
		for (let y = 0; y < 16; y++) {
			const value = dataArray[x + y * 16];
			
			switch (value) {
				case 0:
					ctx.fillStyle = "red";
					break;

				case 1:
					ctx.fillStyle = "green";
					break;

				case 2:
					ctx.fillStyle = "blue";
					break;

				case 3:
					ctx.fillStyle = "yellow";
					break;
			}

			ctx.fillRect(x * tileResolution, y * tileResolution, tileResolution, tileResolution);
		}
	}
}