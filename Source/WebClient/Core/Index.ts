import MainFrame from "./MainFrame";

const canvas = document.getElementById("mainCanvas");

if (canvas instanceof HTMLCanvasElement) {
	const glCtx = canvas.getContext("webgl");
	if (glCtx) {
		console.log("Initialized WebGL1 context.");

		glCtx.enable(glCtx.BLEND);
		glCtx.blendFunc(glCtx.SRC_ALPHA, glCtx.ONE_MINUS_SRC_ALPHA);

		const frame = new MainFrame(glCtx);
		frame.run();
	}
	else {
		console.error("Failed to initialize WebGL context.");
	}
}
else {
	console.error("Could not find main canvas element.");
}