"use strict";

function getGlType(glCtx, type) {
	const glType = glCtx[`${type}_SHADER`];
	if (glType)
		return glType;
	throw new Error(`Unknown shader type '${type}'`);
}

function compileShader(glCtx, code, type) {
	const glType = getGlType(glCtx, type);
	const shader = glCtx.createShader(glType);

	glCtx.shaderSource(shader, code);
	glCtx.compileShader(shader);

	if (!glCtx.getShaderParameter(shader, glCtx.COMPILE_STATUS)) {
		console.log(`Error compiling ${type} shader:`, glCtx.getShaderInfoLog(shader));
	}
	return shader;
}

function buildShaderProgram(glCtx, shaderInfo) {
	const program = glCtx.createProgram();

	shaderInfo.forEach(desc => {
		const shader = compileShader(glCtx, desc.code, desc.type);
		if (shader)
			glCtx.attachShader(program, shader);
		else
			console.warn("Failed to compile shader:", shader);
	});

	glCtx.linkProgram(program);

	if (!glCtx.getProgramParameter(program, glCtx.LINK_STATUS)) {
		console.warn("Error linking shader program:", glCtx.getProgramInfoLog(program));
	}
	return program;
}