"use strict";

const viewport = { w: 0, h: 0 };
const updatables = [];
let animationID;
let lastTime = 0;

const segmentManager = new Worker("/segmentManager.js");
segmentManager.addEventListener("message", handleSegmentManagerMessage);

const segmentRenderer = new Worker("/segmentRenderer.js");
segmentRenderer.addEventListener("message", handleSegmentRendererMessage);

function frameLoop(totalTime) {
	// store the ID so we can cancel the animation request
	animationID = requestAnimationFrame(frameLoop);
	let delta = 0;
	if (totalTime) {
		delta = (totalTime - lastTime) / 1000;
		lastTime = totalTime;
	}

	// update registered objects, TODO: change this to a interval 
	// with 20ups instead as it's not called while tab is minimized
	for (let i = 0; i < updatables.length; i++) {
		updatables[i](delta);
	}

	segmentRenderer.postMessage({ type: "draw", delta });
}

function onMapZoomChanged(zoom) {
	segmentRenderer.postMessage({ type: "zoom", zoom });
}

function onMapTranslationChanged(translation) {
	segmentRenderer.postMessage({ type: "translation", translation });
}

function onWindowResize() {
	viewport.w = Math.floor(window.innerWidth * window.devicePixelRatio);
	viewport.h = Math.floor(window.innerHeight * window.devicePixelRatio);

	segmentRenderer.postMessage({ type: "viewport", viewport });
}

function handleSegmentRendererMessage(e) {
	switch (e.data.type) {
		case "texture":
			const img = new Image();
			img.src = e.data.url;
			img.decode().then(() => {
				createImageBitmap(img).then(bitmap => {
					segmentRenderer.postMessage({ type: "texture", id: e.data.id, bitmap }, [bitmap]);
				}).catch(err => {
					console.warn("Could not create ImageBitmap:", err);
				});
			}).catch(err => {
				console.warn("Could not decode image:", err);
			});
			break;

		default:
			if (!e.data.type)
				throw new Error(`Missing property 'type' on event data.`);
			throw new Error(`Unknown message type '${e.data.type}'.`);
	}
}

function handleSegmentManagerMessage(e) {
	switch (e.data.type) {
		case "segment":
			segmentRenderer.postMessage({ type: "segment", position: e.data.position, tiles: e.data.tiles });
			break;

		default:
			if (!e.data.type)
				throw new Error(`Missing property 'type' on event data.`);
			throw new Error(`Unknown message type '${e.data.type}'.`);
	}
}

function main() {
	const offscreen = mainCanvas.transferControlToOffscreen();
	segmentRenderer.postMessage({ type: "init", canvas: offscreen }, [offscreen]);

	// call onWindowResize() on start
	onWindowResize();
	window.addEventListener("resize", onWindowResize);

	frameLoop();
}

main();


// dirty method for loading from center
// this will get removed later
const tmpSegmentKeys = new Array(drawDistance * drawDistance);
for (let x = 0; x < drawDistance; x++) {
	for (let y = 0; y < drawDistance; y++) {
		const xx = x - drawDistance / 2;
		const yy = y - drawDistance / 2;

		tmpSegmentKeys[x + y * drawDistance] = { x: xx, y: yy };
	}
}

function enqueueByDistance(origin, keys) {
	function getSqDist(p1, p2) {
		return Math.abs((p1.x - p2.x) * (p1.x - p2.x) + (p1.y - p2.y) * (p1.y - p2.y));
	}

	keys.sort(function (a, b) {
		a.sqDist = getSqDist(origin, a);
		b.sqDist = getSqDist(origin, b);
		return a.sqDist - b.sqDist;
	});

	let time = 0;
	keys.forEach((item) => {
		setTimeout(() => {
			segmentManager.postMessage({ type: "request", key: coordsToSegmentKey(item.x, item.y) });
		}, time);
		time += 2;
	});
}

enqueueByDistance(createVector2(0, 0), tmpSegmentKeys);