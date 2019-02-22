"use strict";
importScripts("/constants.js");
importScripts("/helper.js");
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

				const pos = segmentKeyToCoords(e.data.key);
				segmentChannel.sendRequest("get", { pos });
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
	postMessage({ type: "segment", position: response.pos, tiles: response.data });
}