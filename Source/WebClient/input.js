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
		const xDiff = (e.clientX - currentMousePos.x) * window.devicePixelRatio;
		const yDiff = (e.clientY - currentMousePos.y) * window.devicePixelRatio;
		moveMap(xDiff, yDiff);
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
	let oldZoom = mapZoom;
	mapZoom -= e.deltaY / 1500;
	clampZoom();

	const toX = currentMousePos.x;
	const toY = currentMousePos.y;
	const a = (toX - viewport.w / 2) * (oldZoom - mapZoom);
	const b = (-toY + viewport.h / 2) * (oldZoom - mapZoom);
	//moveMap(a, b);
}

function clampZoom() {
	mapZoom = Math.clamp(mapZoom, minMapZoom, maxMapZoom);
}

updatables.push(delta => {
	clampZoom();

	const newSmoothMapZoom = mapZoom; //Math.lerp(smoothMapZoom, mapZoom, delta * 20);
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