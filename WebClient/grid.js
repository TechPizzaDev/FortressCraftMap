"use strict";
const gridCtx = gridCanvas.getContext("2d");
gridCtx.imageSmoothingEnabled = false;

let gridOpacity = 1;
let smoothGridOpacity = 0;

function setGridVisibility(value) {
	gridOpacity = value ? 1 : 0;
}

updatables.push(delta => {
	gridCtx.clearRect(0, 0, viewport.w, viewport.h);

	smoothGridOpacity = Math.lerp(smoothGridOpacity, gridOpacity, delta * 8);
	if (smoothGridOpacity < 0.05)
		return;

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
	gridCtx.globalAlpha = smoothGridOpacity;
	gridCtx.strokeStyle = "white";
	gridCtx.stroke();
});