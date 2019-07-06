import MainFrame from "./MainFrame";

const canvas = document.getElementById("mainCanvas");

if (canvas instanceof HTMLCanvasElement) {
	const glContext = canvas.getContext("webgl");
	if (glContext) {
		console.log("Initialized WebGL1 context.");

		glContext.enable(glContext.BLEND);
		glContext.blendFunc(glContext.SRC_ALPHA, glContext.ONE_MINUS_SRC_ALPHA);

		const frame = new MainFrame(glContext, () => {
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