"use strict";
const presentCtx = presentationCanvas.getContext("2d");
const gridCtx = gridCanvas.getContext("2d");
gridCtx.imageSmoothingEnabled = false;

const viewport = { w: 0, h: 0 };
const presentTranslation = createVector2();
let animationID;
let lastTime = 0;

const segmentSet = {};
const worker = new Worker("/worker.js");
worker.addEventListener('message', handleWorkerMessage);

const drawDistance = 15;

function handleWorkerMessage(e) {
	segmentSet[e.data.key].bitmap = e.data.result;
}

function frameLoop(totalTime) {
	// store the ID so we can cancel the request
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

	// update external factors
	updateInput(delta);

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

	gridCtx.clearRect(0, 0, viewport.w, viewport.h);
	gridCtx.beginPath();
	for (let x = 0; x < drawDistance; x++) {
		for (let y = 0; y < drawDistance; y++) {
			const segment = segmentSet[coordsToSegmentKey(x, y)];
			if (!segment)
				continue;

			const sx = Math.floor(mapOffset.x + segment.drawPosition.x) * smoothMapZoom;
			const sy = Math.floor(mapOffset.y + segment.drawPosition.y) * smoothMapZoom;
			const ox = Math.floor(sx + presentTranslation.x);
			const oy = Math.floor(sy + presentTranslation.y);
			const dx = Math.floor(ox + segmentResolution * smoothMapZoom);
			const dy = Math.floor(oy + segmentResolution * smoothMapZoom);

			gridCtx.moveTo(ox + 0.5, oy);
			gridCtx.lineTo(ox + 0.5, dy); // line to bottom-left corner

			gridCtx.moveTo(ox, oy + 0.5);
			gridCtx.lineTo(dx, oy + 0.5); // line to top-right corner
		}
	}
	gridCtx.strokeStyle = "white";
	gridCtx.stroke();
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