"use strict";
importScripts("/Constants.js");
importScripts("/Helper.js");
importScripts("/EventEmitter.js");
importScripts("/ChannelSocket.js");

const segmentChannel = new ChannelSocket("segment");
segmentChannel.subscribeToEvent("message", handleSegmentChannelMessage);
segmentChannel.connect();

self.onmessage = (e) => {
	switch (e.data.type) {
		case "request":
			const intervalID = setInterval(() => {
				if (!segmentChannel.isConnected) {
					// repeat until we're connected
					return;
				}
				clearInterval(intervalID);

				const position = segmentKeyToCoords(e.data.key);
				segmentChannel.sendRequest("get", { position });
			}, 25 + Math.floor(Math.random() * 25));
			break;

		default:
			if (!e.data.type)
				throw new Error(`Missing property 'type' on event data.`);
			throw new Error(`Unknown message type '${e.data.type}'.`);
	}
};

function handleSegmentChannelMessage(msg) {
	const response = JSON.parse(msg.data);
	switch (response.type) {
		case "segment":
		case "blockorders":
			postMessage(response);
			break;

		default:
			console.warn(`Unknown message type '${response.type}'.`, response);
			break;
	}
}