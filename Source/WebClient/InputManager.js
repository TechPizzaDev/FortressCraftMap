"use strict";

let isMouseDragging = false;
let currentMousePos = createVector2(0, 0);

let mapZoom = defaultMapZoom;
let smoothMapZoom = mapZoom;

function updateMousePos(e) {
	currentMousePos.x = e.clientX;
	currentMousePos.y = e.clientY;
	onMouseMove(currentMousePos.x, currentMousePos.y);
}

function handleMouseMove(e) {
	if (isMouseDragging) {
		const diffX = (e.clientX - currentMousePos.x) * window.devicePixelRatio;
		const diffY = (e.clientY - currentMousePos.y) * window.devicePixelRatio;
		onMapMove(diffX, diffY);
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
			mapZoom = defaultMapZoom;
			break;
	}
	e.preventDefault();
}

function handleMouseEnd(e) {
	isMouseDragging = false;
	updateMousePos(e);
}

function handleScrollWheel(e) {
	const factor = 1 - 1 / (mapZoom + 1);
	mapZoom -= e.deltaY / 750 * factor;
	mapZoom = clampZoom(mapZoom);
}

function clampZoom(zoom) {
	return Math.clamp(zoom, minMapZoom, maxMapZoom);
}

updatables.push(delta => {
	mapZoom = clampZoom(mapZoom);
	const newSmoothMapZoom = clampZoom(Math.lerp(smoothMapZoom, mapZoom, delta * 30));

	if (newSmoothMapZoom !== smoothMapZoom) {
		onMapZoomChanged(smoothMapZoom);
		smoothMapZoom = newSmoothMapZoom;
	}
});

// TODO: add touch events (should be as simple as subscribing to respective touch event)
mainCanvas.addEventListener("mousemove", handleMouseMove);
mainCanvas.addEventListener("mousedown", handleMouseDown);
mainCanvas.addEventListener("mouseup", handleMouseEnd);
mainCanvas.addEventListener("mouseout", handleMouseEnd);
mainCanvas.addEventListener("wheel", handleScrollWheel, { passive: true });

// trigger with default zoom
onMapZoomChanged(mapZoom);