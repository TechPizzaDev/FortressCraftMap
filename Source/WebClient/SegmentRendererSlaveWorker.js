"use strict";
importScripts("/Constants.js");
importScripts("/Helper.js");
importScripts("/VertexDataGen.js");

self.onmessage = (e) => {
	switch (e.data.type) {
		case "tileDescriptionMap":
			for (const key in Object.keys(e.data.map))
				indexToTileDescriptionMap[key] = e.data.map[key];
			break;

		case "textured": {
			const buffer = generateTexCoordBuffer(segmentSize);
			generateTexCoords(e.data.tiles, segmentSize, buffer);
			postMessage({
				type: "texturedResult",
				buffer,
				x: e.data.x,
				y: e.data.y
			});
			break;
		}

		case "colored": {
			const buffer = generateColorBuffer(segmentSize);
			generateColors(e.data.tiles, segmentSize, buffer);
			postMessage({
				type: "coloredResult",
				buffer,
				x: e.data.x,
				y: e.data.y
			});
			break;
		}
	}
}