
class SegmentRenderData {
	constructor(x, y) {
		this.x = x;
		this.y = y;
		this.isDirty = false;
		this.alpha = 1;
		this.tileBuffer = new Uint16Array(segmentSize * segmentSize);
		this._glDataBuffer = null;

		const translation = vec3.create();
		translation[0] = x * segmentSize * resolution;
		translation[1] = y * segmentSize * resolution;

		this.matrix = mat4.create();
		mat4.fromTranslation(this.matrix, translation);
	}

	markDirty(fade) {
		if(fade === true)  
			this.alpha = 0;
		this.isDirty = true;
	}

	buildAndUploadTextured(gl, buffer) {
		generateTexCoords(this.tileBuffer, segmentSize, buffer);
		this.uploadData(gl, buffer);
	}

	buildAndUploadColored(gl, buffer) {
		generateColors(this.tileBuffer, segmentSize, buffer);
		this.uploadData(gl, buffer);
	}

	uploadData(gl, data) {
		if (!this._glDataBuffer)
			this._glDataBuffer = gl.createBuffer();

		gl.bindBuffer(gl.ARRAY_BUFFER, this._glDataBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
		this.isDirty = false;
	}
}