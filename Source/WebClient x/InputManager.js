"use strict";

let isMouseDragging = false;
let currentMousePos = createVector2(0, 0);

let currentMapZoom = mapZoom.default;
let smoothMapZoom = currentMapZoom;

function handleKeyDown(e) {
	// TODO: multiply by delta time (in an update func)
	// change this from a constant to a setting
	// implement a "isKeyDown" method instead of events
	const speed = e.shiftKey ? resolution * currentMapZoom : resolution;
	switch (e.key) {
		case "ArrowRight":
			onMapMove(-speed, 0);
			break;

		case "ArrowLeft":
			onMapMove(speed, 0);
			break;

		case "ArrowUp":
			onMapMove(0, speed);
			break;

		case "ArrowDown":
			onMapMove(0, -speed);
			break;
	}
}

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
			currentMapZoom = mapZoom.default;
			break;
	}
	e.preventDefault();
}

function handleMouseEnd(e) {
	isMouseDragging = false;
	updateMousePos(e);
}

function handleScrollWheel(e) {
	const factor = 1 - 1 / (currentMapZoom + 1);
	const scroll = e.deltaY / 750 * factor;
	currentMapZoom = clampZoom(currentMapZoom - scroll);
}

updatables.push(delta => {
	let lerpValue = delta * 25;
	if (lerpValue > 0.5)
		lerpValue = 0.5;

	const newSmoothMapZoom = clampZoom(Math.lerp(smoothMapZoom, currentMapZoom, lerpValue));
	if (newSmoothMapZoom !== smoothMapZoom) {
		onMapZoomChanged(smoothMapZoom);
		smoothMapZoom = newSmoothMapZoom;
	}
});

function clampZoom(zoom) {
	return Math.clamp(zoom, mapZoom.min, mapZoom.max);
}

// TODO: add touch events (should be as simple as subscribing to respective touch event)
mainCanvas.addEventListener("mousemove", handleMouseMove);
mainCanvas.addEventListener("mousedown", handleMouseDown);
mainCanvas.addEventListener("mouseup", handleMouseEnd);
mainCanvas.addEventListener("mouseout", handleMouseEnd);
mainCanvas.addEventListener("wheel", handleScrollWheel, { passive: true });

document.addEventListener("keydown", handleKeyDown);

// trigger with default zoom
onMapZoomChanged(currentMapZoom);