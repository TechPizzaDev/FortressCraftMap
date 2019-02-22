"use strict";

function generateQuads(size) {
	const quads = size * size;
	const vertices = new Float32Array(quads * 4 * 2);
	const indices = new Uint16Array(quads * 6);

	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const i = x + y * size;

			// vertices per quad
			const vi = i * 8;
			vertices[vi + 0] = x;
			vertices[vi + 1] = y;

			vertices[vi + 2] = x + 1;
			vertices[vi + 3] = y;

			vertices[vi + 4] = x;
			vertices[vi + 5] = y + 1;

			vertices[vi + 6] = x + 1;
			vertices[vi + 7] = y + 1;

			// indices per quad
			const ii = i * 6;
			const vii = i * 4;
			indices[ii + 0] = vii;
			indices[ii + 1] = vii + 1;
			indices[ii + 2] = vii + 2;

			indices[ii + 3] = vii + 1;
			indices[ii + 4] = vii + 3;
			indices[ii + 5] = vii + 2;
		}
	}

	return { vertices, indices };
}

function generateTexCoords(tiles, size) {
	const quads = size * size;
	const texCoords = new Float32Array(quads * 4 * 2);

	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const i = x + y * size;
			const tile = tiles[i];

			const tileName = tileToNameMap[tile];
			const uv = nameToCoordMap[tileName];

			const ti = i * 8;
			texCoords[ti + 0] = uv.TL[0];
			texCoords[ti + 1] = uv.TL[1];

			texCoords[ti + 2] = uv.BR[0];
			texCoords[ti + 3] = uv.TL[1];

			texCoords[ti + 4] = uv.TL[0];
			texCoords[ti + 5] = uv.BR[1];

			texCoords[ti + 6] = uv.BR[0];
			texCoords[ti + 7] = uv.BR[1];
		}
	}

	return texCoords;
}

const tileToNameMap = {
	0: "lithium",
	1: "titanium",
	2: "gold"
};

const nameToCoordMap = {
	lithium: cornersFromRect(0, 0, 64, 64),
	titanium: cornersFromRect(66, 0, 64, 64),
	gold: cornersFromRect(132, 0, 64, 64)
};

function cornersFromRect(x, y, w, h) {
	const texelW = 1.0 / 196.0;
	const texelH = 1.0 / 64.0;

	x *= texelW;
	y *= texelH;
	w *= texelW;
	h *= texelH;

	return {
		TL: [x, y],
		BR: [x + w, y + h]
	};
}