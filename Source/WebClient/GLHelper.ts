

// FIXME: this is so broken
function getShaderType(gl: WebGLRenderingContext, type: string) {
	const glType = gl.VERTEX_SHADER; //.y[`${type}_SHADER`];
	if (glType)
		return glType;
	throw new Error(`Unknown shader type '${type}'`);
}

function compileShader(gl: WebGLRenderingContext, data: string, type: number) {
	const shader = gl.createShader(type);
	gl.shaderSource(shader, data);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		console.error(`Error compiling ${type} shader:`, gl.getShaderInfoLog(shader));
	}
	return shader;
}

// TODO: create a shader info object (similar to Texture2D but a shader program)
function buildShaderProgram(gl: WebGLRenderingContext, shaderInfo) {
	const program = gl.createProgram();

	shaderInfo.forEach(desc:  => {
		const shader = compileShader(gl, desc.data, desc.type);
		if (shader)
			gl.attachShader(program, shader);
		else
			console.error("Failed to compile shader:", shader);
	});

	gl.linkProgram(program);

	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		console.error("Error linking shader program:", gl.getProgramInfoLog(program));
	}
	return program;
}