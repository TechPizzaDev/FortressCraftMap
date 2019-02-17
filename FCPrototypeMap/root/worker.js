﻿"use strict";
importScripts("/constants.js");
importScripts("/helper.js");

const canvas = new OffscreenCanvas(segmentResolution, segmentResolution);
const ctx = canvas.getContext("2d");

let offset = 100;

self.onmessage = async (e) => {
	doHttpRequest({ url: "/randombuffer", type: "arraybuffer" }).then(response => {
		if (response.status === 200) {
			const dataArray = new Uint16Array(response.data);

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
					}

					ctx.fillRect(x * tileResolution, y * tileResolution, tileResolution, tileResolution);
				}
			}

			const result = canvas.transferToImageBitmap();
			postMessage({ key: e.data, result }, [result]);
		}
		else {
			console.warn("Failed to get random data:", response);
		}
	}).catch(err => {
		console.warn("Rendering segment failed:", err);
	});
};