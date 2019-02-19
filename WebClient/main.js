"use strict";
const presentCtx = presentationCanvas.getContext("2d");

const viewport = { w: 0, h: 0 };
const presentTranslation = createVector2();
const updatables = [];
let animationID;
let lastTime = 0;

let mapOffset = createVector2(0, 0);
let mapZoom = 0.5;
let smoothMapZoom = mapZoom;
const drawDistance = 15;

const segmentSet = {};
const worker = new Worker("/segmentWorker.js");
worker.addEventListener('message', handleWorkerMessage);

function handleWorkerMessage(e) {
	segmentSet[e.data.key].bitmap = e.data.result;
}

function frameLoop(totalTime) {
	// store the ID so we can cancel the animation request
	animationID = requestAnimationFrame(frameLoop);

	presentCtx.save();
	presentCtx.resetTransform();
	presentCtx.clearRect(0, 0, viewport.w, viewport.h);
	presentCtx.restore();

	let delta = 0;
	if (totalTime) {
		delta = (totalTime - lastTime) / 1000;
		lastTime = totalTime;
	}

	// update "modules"
	for (let i = 0; i < updatables.length; i++) {
		updatables[i](delta);
	}

	frame(delta);
}

// main update and draw method
function frame(delta) {
	for (let x = 0; x < drawDistance; x++) {
		for (let y = 0; y < drawDistance; y++) {
			const segment = segmentSet[coordsToSegmentKey(x, y)];
			if (!segment || !segment.bitmap)
				continue;

			const dx = mapOffset.x + segment.drawPosition.x;
			const dy = mapOffset.y + segment.drawPosition.y;
			presentCtx.drawImage(segment.bitmap, Math.floor(dx), Math.floor(dy));
		}
	}
}

function updatePresentationTransform() {
	// the center of the canvas should be coord 0,0
	presentTranslation.x = viewport.w / 2;
	presentTranslation.y = viewport.h / 2;

	// TODO: maybe add rotation/camera follow based on a focused entity
	presentCtx.setTransform(
		smoothMapZoom,
		0, 0,
		smoothMapZoom,
		presentTranslation.x, presentTranslation.y);
}

function onMapZoomChanged() {
	updatePresentationTransform();
}

function setCanvasSizeToViewport(canvas) {
	canvas.width = viewport.w;
	canvas.height = viewport.h;
}

function onWindowResize() {
	viewport.w = Math.floor(window.innerWidth * window.devicePixelRatio);
	viewport.h = Math.floor(window.innerHeight * window.devicePixelRatio);

	setCanvasSizeToViewport(presentationCanvas);
	setCanvasSizeToViewport(gridCanvas);

	updatePresentationTransform();
}

// call onWindowResize on start
onWindowResize();
window.addEventListener("resize", onWindowResize, false);

// center on current segments
mapOffset.x = -drawDistance * segmentResolution / 2;
mapOffset.y = -drawDistance * segmentResolution / 2;

// start the draw loop
frameLoop();

function createSegment(x, y) {
	return {
		key: coordsToSegmentKey(x, y),
		drawPosition: createVector2(x * segmentResolution, y * segmentResolution),
		bitmap: null
	};
}

for (let x = 0; x < drawDistance; x++) {
	for (let y = 0; y < drawDistance; y++) {
		const segment = createSegment(x, y);
		segmentSet[segment.key] = segment;
	}
}

// dirty method for loading from center
// this will get removed after
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

	keys.forEach((item) => { worker.postMessage(coordsToSegmentKey(item.x, item.y)); });
}

enqueueByDistance(createVector2(drawDistance / 2 - 0.5, drawDistance / 2 - 0.5), tmpSegmentKeys);

// use only for compatibility
//if (!CanvasRenderingContext2D.prototype.resetTransform) {
//	CanvasRenderingContext2D.prototype.resetTransform = function () {
//		this.setTransform(1, 0, 0, 1, 0, 0);
//	};
//}