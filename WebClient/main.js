"use strict";

const viewport = { w: 0, h: 0 };
const updatables = [];
let animationID;
let lastTime = 0;

const rendererWorker = new Worker("/mainRenderer.js");

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

	rendererWorker.postMessage({ type: "draw", delta });
}

function onMapZoomChanged(zoom) {
	rendererWorker.postMessage({ type: "zoom", zoom });
}

function onWindowResize() {
	viewport.w = Math.floor(window.innerWidth * window.devicePixelRatio);
	viewport.h = Math.floor(window.innerHeight * window.devicePixelRatio);

	rendererWorker.postMessage({ type: "viewport", viewport });
}

function main() {
	const offscreen = mainCanvas.transferControlToOffscreen();
	rendererWorker.postMessage({ type: "init", canvas: offscreen }, [offscreen]);

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
		tmpSegmentKeys[x + y * drawDistance] = { x, y };
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

	keys.forEach((item) => {
		rendererWorker.postMessage({ type: "request", key: coordsToSegmentKey(item.x, item.y) });
	});
}

enqueueByDistance(createVector2(drawDistance / 2 - 0.5, drawDistance / 2 - 0.5), tmpSegmentKeys);