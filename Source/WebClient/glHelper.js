"use strict";
const textures = [];

function createTexture2D(gl) {
	const id = textures.length;
	const texture = gl.createTexture();

	const texInfo = { id , w: 1, h: 1, texture };
	textures.push(texInfo);

	const pixel = new Uint8Array([255, 0, 255, 255]);
	uploadTextureData(gl, texInfo, pixel);

	return texInfo;
}

function getTexture2D(id) {
	return textures[id];
}

function uploadTextureData(gl, textureInfo, data) {
	gl.bindTexture(gl.TEXTURE_2D, textureInfo.texture);

	const level = 0;
	const internalFormat = gl.RGBA;
	const format = gl.RGBA;
	const type = gl.UNSIGNED_BYTE;

	if (data instanceof Uint8Array) {
		const border = 0;
		gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
			textureInfo.w, textureInfo.h, border, format, type, data);
	} else if (data instanceof ImageBitmap) {
		textureInfo.w = data.width;
		textureInfo.h = data.height;
		gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, format, type, data);
	}

	if (isPowerOf2(textureInfo.w) && isPowerOf2(textureInfo.h)) {
		// it's a power of 2; generate mipmap
		gl.generateMipmap(gl.TEXTURE_2D);
	} else {
		// not power of 2; turn off mips and set wrapping to clamp to edge
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	}
}

function isPowerOf2(value) {
	return (value & (value - 1)) === 0;
}

function getGlType(gl, type) {
	const glType = gl[`${type}_SHADER`];
	if (glType)
		return glType;
	throw new Error(`Unknown shader type '${type}'`);
}

function compileShader(gl, code, type) {
	const glType = getGlType(gl, type);
	const shader = gl.createShader(glType);

	gl.shaderSource(shader, code);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		console.error(`Error compiling ${type} shader:`, gl.getShaderInfoLog(shader));
	}
	return shader;
}

function buildShaderProgram(gl, shaderInfo) {
	const program = gl.createProgram();

	shaderInfo.forEach(desc => {
		const shader = compileShader(gl, desc.code, desc.type);
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