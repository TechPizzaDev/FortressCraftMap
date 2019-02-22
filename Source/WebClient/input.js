"use strict";
let isMouseDragging = false;
let currentMousePos = createVector2(0, 0);

let mapZoom = minMapZoom;
let smoothMapZoom = mapZoom;
let roundedSmoothMapZoom = smoothMapZoom;

let mapTranslation = createVector2(0, 0);

function updateMousePos(e) {
	currentMousePos.x = e.clientX;
	currentMousePos.y = e.clientY;
}

function handleMouseMove(e) {
	if (isMouseDragging) {
		const xDiff = e.clientX - currentMousePos.x;
		const yDiff = e.clientY - currentMousePos.y;
		moveMap(xDiff * window.devicePixelRatio, yDiff * window.devicePixelRatio);
	}
	updateMousePos(e);
}

function moveMap(x, y) {
	mapTranslation.x += x;
	mapTranslation.y += y;
	if (onMapTranslationChanged)
		onMapTranslationChanged(mapTranslation);
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

updatables.push(delta => {
	const newSmoothMapZoom = mapZoom; // Math.lerp(smoothMapZoom, mapZoom, delta * 20);
	if (newSmoothMapZoom !== smoothMapZoom) {
		smoothMapZoom = newSmoothMapZoom;

		let lastRoundedZoom = roundedSmoothMapZoom;
		roundedSmoothMapZoom = Math.round(smoothMapZoom * 100000) / 100000;

		if (onMapZoomChanged && lastRoundedZoom !== roundedSmoothMapZoom) {
			onMapZoomChanged(roundedSmoothMapZoom);
		}
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