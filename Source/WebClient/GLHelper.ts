

function uploadTextureData(gl: WebGLContext, texture: Texture2D, data: Uint8Array | ImageBitmap) {

	gl.bindTexture(gl.TEXTURE_2D, texture.texture);

	const level = 0;
	const internalFormat = gl.RGBA;
	const format = gl.RGBA;
	const type = gl.UNSIGNED_BYTE;

	if (data instanceof Uint8Array) {
		const border = 0;
		gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
			texture.width, texture.height, border, format, type, data);
	} else if (data instanceof ImageBitmap) {
		texture.setData();
		texture.width = data.width;
		texture.height = data.height;
		gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, format, type, data);
	}

	if (isPowerOf2(texture.width) && isPowerOf2(texture.height)) {
		// it's a power of 2; generate mipmap
		gl.generateMipmap(gl.TEXTURE_2D);
	} else {
		// not power of 2; turn off mips and set wrapping to clamp to edge
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		//gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	}
}

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