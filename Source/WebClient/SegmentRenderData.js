"use strict";

class SegmentRenderData {
	constructor(x, y) {
		this.x = x;
		this.y = y;
		this.tiles = new Uint16Array(segmentSize * segmentSize);
		this.isDirty = false;
		this.isTypeUpdate = true;
		this._glDataBuffer = null;

		const translation = vec3.create();
		translation[0] = x * segmentSize * resolution;
		translation[1] = y * segmentSize * resolution;

		this.matrix = mat4.create();
		mat4.fromTranslation(this.matrix, translation);
	}

	markDirty(typeUpdate) {
		if (typeUpdate)
			this.isTypeUpdate = typeUpdate;
		this.isDirty = true;
	}

	buildAndUploadTextured(gl, buffer) {
		generateTexCoords(this.tiles, segmentSize, buffer);
		this.uploadData(gl, buffer);
	}

	buildAndUploadColored(gl, buffer) {
		generateColors(this.tiles, segmentSize, buffer);
		this.uploadData(gl, buffer);
	}

	uploadData(gl, data) {
		if (!this._glDataBuffer)
			this._glDataBuffer = gl.createBuffer();

		gl.bindBuffer(gl.ARRAY_BUFFER, this._glDataBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
		this.isDirty = false;
		this.isTypeUpdate = false;
	}
}