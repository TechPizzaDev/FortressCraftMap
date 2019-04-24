
const viewport = { w: 0, h: 0 };
const updatables = [];
let animationID;
let lastTime = 0;

const mapRenderer = new Worker("/MapRendererWorker.js");
mapRenderer.addEventListener("message", handleMapRendererMessage);

function frameLoop(totalTime) {
	// store the ID so we can cancel the animation request
	animationID = requestAnimationFrame(frameLoop);
	let delta = 0;
	if (totalTime) {
		delta = (totalTime - lastTime) / 1000;
		lastTime = totalTime;
	}
	// update registered objects, TODO: change this to a interval 
	// at 20ups instead as it's not called while tab is minimized
	for (let i = 0; i < updatables.length; i++) {
		updatables[i](delta);
	}

	mapRenderer.postMessage({ type: "draw", delta });
}

function onMapZoomChanged(zoom) {
	mapRenderer.postMessage({ type: "zoom", zoom });
}

function onMapMove(x, y) {
	mapRenderer.postMessage({ type: "move", x, y });
}

function onMouseMove(x, y) {
	mapRenderer.postMessage({ type: "mousepos", x, y });
}

function onWindowResize() {
	viewport.w = Math.floor(window.innerWidth * window.devicePixelRatio);
	viewport.h = Math.floor(window.innerHeight * window.devicePixelRatio);

	mapRenderer.postMessage({ type: "viewport", viewport });
}

function handleMapRendererMessage(e) {
	switch (e.data.type) {
		case "texture":
			const img = new Image();
			img.src = e.data.url;
			img.decode().then(() => {
				createImageBitmap(img).then(bitmap => {
					mapRenderer.postMessage({ type: "texture", id: e.data.id, bitmap }, [bitmap]);
				}).catch(err => {
					console.warn("Could not create ImageBitmap:", err);
				});
			}).catch(err => {
				console.warn("Could not decode image:", err);
			});
			break;

		case "ready":
			break;

		default:
			if (!e.data.type)
				throw new Error(`Missing property 'type' on event data.`);
			throw new Error(`Unknown message type '${e.data.type}'.`);
	}
}

function main() {
	const offscreen = mainCanvas.transferControlToOffscreen();
	mapRenderer.postMessage({ type: "init", canvas: offscreen }, [offscreen]);

	// call onWindowResize() on start
	onWindowResize();
	window.addEventListener("resize", onWindowResize);

	frameLoop();
}

main();