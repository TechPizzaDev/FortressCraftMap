"use strict";

const minMapZoom = 0.5;
const maxMapZoom = 2;

let isMouseDragging = false;
let currentMousePos = createVector2(0, 0);

let mapOffset = createVector2(0, 0);
let mapZoom = minMapZoom;
let smoothMapZoom = mapZoom;

function updateMousePos(e) {
	currentMousePos.x = e.clientX;
	currentMousePos.y = e.clientY;
}

function handleMouseMove(e) {
	if (isMouseDragging) {
		const xDiff = e.clientX - currentMousePos.x;
		const yDiff = e.clientY - currentMousePos.y;
		mapOffset.x += xDiff / mapZoom * window.devicePixelRatio;
		mapOffset.y += yDiff / mapZoom * window.devicePixelRatio;
	}
	updateMousePos(e);
}

function handleMouseDown(e) {
	switch (e.which) {
		case 1:
			isMouseDragging = true;
			updateMousePos(e);
			break;

		case 2:
			mapZoom = 1;
			break;
	}
	e.preventDefault();
}

function handleMouseEnd(e) {
	isMouseDragging = false;
	updateMousePos(e);
}

function handleScrollWheel(e) {
	mapZoom -= e.deltaY / 1500;
	mapZoom = Math.clamp(mapZoom, minMapZoom, maxMapZoom);
}

function updateInput(delta) {
	const newSmoothMapZoom = Math.lerp(smoothMapZoom, mapZoom, delta * 20);
	if (newSmoothMapZoom !== smoothMapZoom) {
		smoothMapZoom = newSmoothMapZoom;

		if (onMapZoomChanged)
			onMapZoomChanged();
	}
}

// TODO: add touch events (should be as simple as subscribing to respective touch event)
presentationCanvas.addEventListener("mousemove", handleMouseMove, true);
presentationCanvas.addEventListener("mousedown", handleMouseDown, true);
presentationCanvas.addEventListener("mouseup", handleMouseEnd, true);
presentationCanvas.addEventListener("mouseout", handleMouseEnd, true);
presentationCanvas.addEventListener("wheel", handleScrollWheel, true);