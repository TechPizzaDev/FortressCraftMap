class SegmentRenderData {
	constructor(x, y) {
		this.texCoordBuffer = null;
		this.tiles = new Uint16Array(segmentSize * segmentSize);

		const translation = vec3.create();
		translation[0] = x * segmentSize * resolution;
		translation[1] = y * segmentSize * resolution;

		this.matrix = mat4.create();
		mat4.fromTranslation(this.matrix, translation);
	}

	uploadTexCoords(gl, data) {
		if (!this.texCoordBuffer)
			this.texCoordBuffer = gl.createBuffer();

		gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
	}

	updateTexCoords(gl) {
		const data = generateTexCoords(this.tiles, segmentSize);
		this.uploadTexCoords(gl, data);
	}
}