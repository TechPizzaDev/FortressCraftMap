"use strict";

class SegmentRenderData {
	constructor(x, y) {
		this._glDataBuffer = null;
		this.tiles = new Uint16Array(segmentSize * segmentSize);
		this.isDirty = false;

		const translation = vec3.create();
		translation[0] = x * segmentSize * resolution;
		translation[1] = y * segmentSize * resolution;

		this.matrix = mat4.create();
		mat4.fromTranslation(this.matrix, translation);
	}

	markDirty() {
		this.isDirty = true;
	}

	buildAndUploadTextured(gl, buffer) {
		generateTexCoords(this.tiles, segmentSize, buffer);
		this._uploadData(gl, buffer);
	}

	buildAndUploadColored(gl, buffer) {
		generateColors(this.tiles, segmentSize, buffer);
		this._uploadData(gl, buffer);
	}

	_uploadData(gl, data) {
		if (!this._glDataBuffer)
			this._glDataBuffer = gl.createBuffer();

		gl.bindBuffer(gl.ARRAY_BUFFER, this._glDataBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
		this.isDirty = false;
	}
}