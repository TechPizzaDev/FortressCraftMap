"use strict";
let isMouseDragging = false;
let currentMousePos = createVector2(0, 0);

let mapZoom = defaultMapZoom;
let smoothMapZoom = mapZoom;
let roundedSmoothMapZoom = smoothMapZoom;

function updateMousePos(e) {
	currentMousePos.x = e.clientX;
	currentMousePos.y = e.clientY;
	if (onMouseMove)
		onMouseMove(currentMousePos.x, currentMousePos.y);
}

function handleMouseMove(e) {
	if (isMouseDragging) {
		const xDiff = (e.clientX - currentMousePos.x) * window.devicePixelRatio;
		const yDiff = (e.clientY - currentMousePos.y) * window.devicePixelRatio;
		moveMap(xDiff, yDiff);
	}
	updateMousePos(e);
}

function moveMap(x, y) {
	if (onMapMove)
		onMapMove(x, y);
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
	console.log(factor);

	mapZoom -= e.deltaY / 750 * factor;
	clampZoom();
}

function clampZoom() {
	mapZoom = Math.clamp(mapZoom, minMapZoom, maxMapZoom);
}

updatables.push(delta => {
	clampZoom();

	const newSmoothMapZoom = Math.lerp(smoothMapZoom, mapZoom, delta * 18);
	if (newSmoothMapZoom !== smoothMapZoom) {
		smoothMapZoom = newSmoothMapZoom;

		let lastRoundedZoom = roundedSmoothMapZoom;
		roundedSmoothMapZoom = Math.round(smoothMapZoom * 1000) / 1000;

		if (onMapZoomChanged && lastRoundedZoom !== roundedSmoothMapZoom) {
			onMapZoomChanged(newSmoothMapZoom);
			console.log(newSmoothMapZoom);
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