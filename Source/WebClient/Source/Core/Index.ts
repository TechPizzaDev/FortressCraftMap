import MainFrame from "./MainFrame";

function setup() {
	const canvasLayer0 = document.getElementById("canvasLayer0");
	const canvasLayer1 = document.getElementById("canvasLayer1");

	if (canvasLayer0 instanceof HTMLCanvasElement && canvasLayer1 instanceof HTMLCanvasElement) {
		const glContext = canvasLayer0.getContext("webgl");
		if (!glContext) {
			console.error("Failed to initialize WebGL context.");
			return;
		}

		const drawingContext = canvasLayer1.getContext("2d");
		if (!drawingContext) {
			console.error("Failed to initialize 2D context.");
			return;
		}

		// setup gl context
		glContext.enable(glContext.BLEND);
		glContext.blendFunc(glContext.SRC_ALPHA, glContext.ONE_MINUS_SRC_ALPHA);

		console.log("Initialized canvas contexts.");

		const frame = new MainFrame(glContext, drawingContext, () => {
			setupFullscreen();

			document.getElementById("mainContainer").classList.remove("hidden");
			frame.run();
		});
	}
	else {
		console.error("Could not find required canvas layers.");
	}
}

function setupFullscreen() {
	const fullscreenButton = document.getElementById("fullscreenButton");
	const fullscreenIcon = fullscreenButton.firstElementChild;

	if (!document.fullscreenEnabled) {
		fullscreenButton.classList.add("hidden");
		return;
	}

	document.addEventListener("fullscreenerror", (ev) => {
		console.warn("Failed to enter fullscreen:\n", ev);
	});

	document.addEventListener("fullscreenchange", () => {
		fullscreenIcon.className = document.fullscreenElement
			? "icon-exitfullscreen" : "icon-fullscreen";
	});

	if (document.fullscreenEnabled) {
		fullscreenButton.addEventListener("click", () => {
			if (document.fullscreenElement)
				document.exitFullscreen();
			else
				document.documentElement.requestFullscreen({ navigationUI: "hide" });
		});
	}
	else {
		fullscreenButton.classList.add("hidden");
	}
}

setup();