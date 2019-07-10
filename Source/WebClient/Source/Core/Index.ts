import MainFrame from "./MainFrame";

const canvas = document.getElementById("mainCanvas");

if (canvas instanceof HTMLCanvasElement) {
	const glContext = canvas.getContext("webgl");
	if (glContext) {
		console.log("Initialized WebGL1 context.");

		glContext.enable(glContext.BLEND);
		glContext.blendFunc(glContext.SRC_ALPHA, glContext.ONE_MINUS_SRC_ALPHA);

		const frame = new MainFrame(glContext, () => {
			setupFullscreen();

			document.getElementById("mainContainer").classList.remove("hidden");
			frame.run();
		});
	}
	else {
		console.error("Failed to initialize WebGL context.");
	}
}
else {
	console.error("Could not find main canvas element.");
}

function setupFullscreen() {
	document.addEventListener("fullscreenerror", (ev) => {
		console.warn("Failed to enter fullscreen:\n", ev);
	});

	const fullscreenButton = document.getElementById("fullscreenButton");
	if (document.fullscreenEnabled) {
		const fullscreenIcon = fullscreenButton.firstChild as HTMLImageElement;
		fullscreenButton.addEventListener("click", () => {
			if (document.fullscreenElement) {
				document.exitFullscreen();
				fullscreenIcon.src = "./Icons/fullscreen-icon.png";
			}
			else {
				document.documentElement.requestFullscreen({ navigationUI: "hide" });
				fullscreenIcon.src = "./Icons/exitfullscreen-icon.png";
			}
		});
	}
	else {
		fullscreenButton.classList.add("hidden");
	}
}