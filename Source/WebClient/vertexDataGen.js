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
			vertices[vi + 0] = x * resolution;
			vertices[vi + 1] = y * resolution;

			vertices[vi + 2] = x * resolution + resolution;
			vertices[vi + 3] = y * resolution;

			vertices[vi + 4] = x * resolution;
			vertices[vi + 5] = y * resolution + resolution;

			vertices[vi + 6] = x * resolution + resolution;
			vertices[vi + 7] = y * resolution + resolution;

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

const texCoordFloatsPerQuad = 2 * 4;
const colorFloatsPerQuad = 3 * 4;

function generateTexCoordBuffer(size) {
	return new Float32Array(size * size * texCoordFloatsPerQuad);
}

function generateColorBuffer(size) {
	return new Float32Array(size * size * colorFloatsPerQuad);
}

function checkTexCoordArray(size, array) {
	if (!(array instanceof Float32Array))
		throw new TypeError("Invalid TexCoord output array, only Float32Array is allowed.");

	const quads = size * size;
	if (array.length < quads * texCoordFloatsPerQuad)
		throw new Error(`TexCoord output is not large enough (${quads} is needed at least).`);
}

function checkColorArray(size, array) {
	if (!(array instanceof Float32Array))
		throw new TypeError("Invalid Color output array, only Float32Array is allowed.");

	const quads = size * size;
	if (array.length < quads * colorFloatsPerQuad)
		throw new Error(`Color output is not large enough (${quads} is needed at least).`);
}

function getTileDescription(tile) {
	let desc = indexToTileDescriptionMap[tile];
	if (!desc) {
		console.warn(`Unknown tile "${tile}" at ${x},${y}`);
		desc = defaultTileDescription;
	}
	return desc;
}

function generateTexCoords(tiles, size, output) {
	checkTexCoordArray(size, output);
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const i = x + y * size;
			const tileDesc = getTileDescription(tiles[i]);
			writeCornersToOutput(output, i, tileDesc.corners);
		}
	}
}

function generateColors(tiles, size, output) {
	checkColorArray(size, output);
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const i = x + y * size;
			const tileDesc = getTileDescription(tiles[i]);
			writeColorsToOutput(output, i, tileDesc.color);
		}
	}
}

function writeCornersToOutput(output, offset, corners) {
	// 8 floats for 4 vec2 in 1 tile
	offset *= 8;

	// top left
	output[offset + 0] = corners.TL[0];
	output[offset + 1] = corners.TL[1];

	// top right
	output[offset + 2] = corners.BR[0];
	output[offset + 3] = corners.TL[1];

	// bottom right
	output[offset + 4] = corners.TL[0];
	output[offset + 5] = corners.BR[1];

	// bottom left
	output[offset + 6] = corners.BR[0];
	output[offset + 7] = corners.BR[1];
}

function writeColorsToOutput(output, offset, color) {
	if (!color)
		return;

	offset *= 4;
	const r = color[0];
	const g = color[1];
	const b = color[2];

	// 3 floats for 4 corners in 1 tile
	for (let j = 0; j < 4; j++) {
		const colorBaseIndex = (offset + j) * 3;
		output[colorBaseIndex + 0] = r;
		output[colorBaseIndex + 1] = g;
		output[colorBaseIndex + 2] = b;
	}
}

function cornersFromRect(x, y, w, h) {
	const texelW = 1.0 / 896.0;
	const texelH = 1.0 / 1792.0;

	x *= texelW;
	y *= texelH;
	w *= texelW;
	h *= texelH;

	return {
		TL: [x, y],
		BR: [x + w, y + h]
	};
}

const defaultTileDescription = {
	color: [0, 0, 0],
	corners: cornersFromRect(0, 0, 0, 0)
};

const indexToTileDescriptionMap = {
	0: { color: null, corners: cornersFromRect(0, 0, 64, 64) },
	1: { color: null, corners: cornersFromRect(64, 0, 64, 64) },
	2: { color: null, corners: cornersFromRect(128, 0, 64, 64) },
	3: { color: null, corners: cornersFromRect(192, 0, 64, 64) },
	4: { color: null, corners: cornersFromRect(256, 0, 64, 64) },
	5: { color: null, corners: cornersFromRect(320, 0, 64, 64) },
	6: { color: null, corners: cornersFromRect(384, 0, 64, 64) },
	7: { color: null, corners: cornersFromRect(448, 0, 64, 64) },
	8: { color: null, corners: cornersFromRect(512, 0, 64, 64) },
	9: { color: null, corners: cornersFromRect(576, 0, 64, 64) },
	10: { color: null, corners: cornersFromRect(640, 0, 64, 64) },
	11: { color: null, corners: cornersFromRect(704, 0, 64, 64) },
	12: { color: null, corners: cornersFromRect(768, 0, 64, 64) },
	13: { color: null, corners: cornersFromRect(832, 0, 64, 64) },
	14: { color: null, corners: cornersFromRect(896, 0, 64, 64) },
	15: { color: null, corners: cornersFromRect(0, 64, 64, 64) },
	16: { color: null, corners: cornersFromRect(64, 64, 64, 64) },
	17: { color: null, corners: cornersFromRect(128, 64, 64, 64) },
	18: { color: null, corners: cornersFromRect(192, 64, 64, 64) },
	19: { color: null, corners: cornersFromRect(256, 64, 64, 64) },
	20: { color: null, corners: cornersFromRect(320, 64, 64, 64) },
	21: { color: null, corners: cornersFromRect(384, 64, 64, 64) },
	22: { color: null, corners: cornersFromRect(448, 64, 64, 64) },
	23: { color: null, corners: cornersFromRect(512, 64, 64, 64) },
	24: { color: null, corners: cornersFromRect(576, 64, 64, 64) },
	25: { color: null, corners: cornersFromRect(640, 64, 64, 64) },
	26: { color: null, corners: cornersFromRect(704, 64, 64, 64) },
	27: { color: null, corners: cornersFromRect(768, 64, 64, 64) },
	28: { color: null, corners: cornersFromRect(832, 64, 64, 64) },
	29: { color: null, corners: cornersFromRect(896, 64, 64, 64) },
	30: { color: null, corners: cornersFromRect(0, 128, 64, 64) },
	31: { color: null, corners: cornersFromRect(64, 128, 64, 64) },
	32: { color: null, corners: cornersFromRect(128, 128, 64, 64) },
	33: { color: null, corners: cornersFromRect(192, 128, 64, 64) },
	34: { color: null, corners: cornersFromRect(256, 128, 64, 64) },
	35: { color: null, corners: cornersFromRect(320, 128, 64, 64) },
	36: { color: null, corners: cornersFromRect(384, 128, 64, 64) },
	37: { color: null, corners: cornersFromRect(448, 128, 64, 64) },
	38: { color: null, corners: cornersFromRect(512, 128, 64, 64) },
	39: { color: null, corners: cornersFromRect(576, 128, 64, 64) },
	40: { color: null, corners: cornersFromRect(640, 128, 64, 64) },
	41: { color: null, corners: cornersFromRect(704, 128, 64, 64) },
	42: { color: null, corners: cornersFromRect(768, 128, 64, 64) },
	43: { color: null, corners: cornersFromRect(832, 128, 64, 64) },
	44: { color: null, corners: cornersFromRect(896, 128, 64, 64) },
	45: { color: null, corners: cornersFromRect(0, 192, 64, 64) },
	46: { color: null, corners: cornersFromRect(64, 192, 64, 64) },
	47: { color: null, corners: cornersFromRect(128, 192, 64, 64) },
	48: { color: null, corners: cornersFromRect(192, 192, 64, 64) },
	49: { color: null, corners: cornersFromRect(256, 192, 64, 64) },
	50: { color: null, corners: cornersFromRect(320, 192, 64, 64) },
	51: { color: null, corners: cornersFromRect(384, 192, 64, 64) },
	52: { color: null, corners: cornersFromRect(448, 192, 64, 64) },
	53: { color: null, corners: cornersFromRect(512, 192, 64, 64) },
	54: { color: null, corners: cornersFromRect(576, 192, 64, 64) },
	55: { color: null, corners: cornersFromRect(640, 192, 64, 64) },
	56: { color: null, corners: cornersFromRect(704, 192, 64, 64) },
	57: { color: null, corners: cornersFromRect(768, 192, 64, 64) },
	58: { color: null, corners: cornersFromRect(832, 192, 64, 64) },
	59: { color: null, corners: cornersFromRect(896, 192, 64, 64) },
	60: { color: null, corners: cornersFromRect(0, 256, 64, 64) },
	61: { color: null, corners: cornersFromRect(64, 256, 64, 64) },
	62: { color: null, corners: cornersFromRect(128, 256, 64, 64) },
	63: { color: null, corners: cornersFromRect(192, 256, 64, 64) },
	64: { color: null, corners: cornersFromRect(256, 256, 64, 64) },
	65: { color: null, corners: cornersFromRect(320, 256, 64, 64) },
	66: { color: null, corners: cornersFromRect(384, 256, 64, 64) },
	67: { color: null, corners: cornersFromRect(448, 256, 64, 64) },
	68: { color: null, corners: cornersFromRect(512, 256, 64, 64) },
	69: { color: null, corners: cornersFromRect(576, 256, 64, 64) },
	70: { color: null, corners: cornersFromRect(640, 256, 64, 64) },
	71: { color: null, corners: cornersFromRect(704, 256, 64, 64) },
	72: { color: null, corners: cornersFromRect(768, 256, 64, 64) },
	73: { color: null, corners: cornersFromRect(832, 256, 64, 64) },
	74: { color: null, corners: cornersFromRect(896, 256, 64, 64) },
	75: { color: null, corners: cornersFromRect(0, 320, 64, 64) },
	76: { color: null, corners: cornersFromRect(64, 320, 64, 64) },
	77: { color: null, corners: cornersFromRect(128, 320, 64, 64) },
	78: { color: null, corners: cornersFromRect(192, 320, 64, 64) },
	79: { color: null, corners: cornersFromRect(256, 320, 64, 64) },
	80: { color: null, corners: cornersFromRect(320, 320, 64, 64) },
	81: { color: null, corners: cornersFromRect(384, 320, 64, 64) },
	82: { color: null, corners: cornersFromRect(448, 320, 64, 64) },
	83: { color: null, corners: cornersFromRect(512, 320, 64, 64) },
	84: { color: null, corners: cornersFromRect(576, 320, 64, 64) },
	85: { color: null, corners: cornersFromRect(640, 320, 64, 64) },
	86: { color: null, corners: cornersFromRect(704, 320, 64, 64) },
	87: { color: null, corners: cornersFromRect(768, 320, 64, 64) },
	88: { color: null, corners: cornersFromRect(832, 320, 64, 64) },
	89: { color: null, corners: cornersFromRect(896, 320, 64, 64) },
	90: { color: null, corners: cornersFromRect(0, 384, 64, 64) },
	91: { color: null, corners: cornersFromRect(64, 384, 64, 64) },
	92: { color: null, corners: cornersFromRect(128, 384, 64, 64) },
	93: { color: null, corners: cornersFromRect(192, 384, 64, 64) },
	94: { color: null, corners: cornersFromRect(256, 384, 64, 64) },
	95: { color: null, corners: cornersFromRect(320, 384, 64, 64) },
	96: { color: null, corners: cornersFromRect(384, 384, 64, 64) },
	97: { color: null, corners: cornersFromRect(448, 384, 64, 64) },
	98: { color: null, corners: cornersFromRect(512, 384, 64, 64) },
	99: { color: null, corners: cornersFromRect(576, 384, 64, 64) },
	100: { color: null, corners: cornersFromRect(640, 384, 64, 64) },
	101: { color: null, corners: cornersFromRect(704, 384, 64, 64) },
	102: { color: null, corners: cornersFromRect(768, 384, 64, 64) },
	103: { color: null, corners: cornersFromRect(832, 384, 64, 64) },
	104: { color: null, corners: cornersFromRect(896, 384, 64, 64) },
	105: { color: null, corners: cornersFromRect(0, 448, 64, 64) },
	106: { color: null, corners: cornersFromRect(64, 448, 64, 64) },
	107: { color: null, corners: cornersFromRect(128, 448, 64, 64) },
	108: { color: null, corners: cornersFromRect(192, 448, 64, 64) },
	109: { color: null, corners: cornersFromRect(256, 448, 64, 64) },
	110: { color: null, corners: cornersFromRect(320, 448, 64, 64) },
	111: { color: null, corners: cornersFromRect(384, 448, 64, 64) },
	112: { color: null, corners: cornersFromRect(448, 448, 64, 64) },
	113: { color: null, corners: cornersFromRect(512, 448, 64, 64) },
	114: { color: null, corners: cornersFromRect(576, 448, 64, 64) },
	115: { color: null, corners: cornersFromRect(640, 448, 64, 64) },
	116: { color: null, corners: cornersFromRect(704, 448, 64, 64) },
	117: { color: null, corners: cornersFromRect(768, 448, 64, 64) },
	118: { color: null, corners: cornersFromRect(832, 448, 64, 64) },
	119: { color: null, corners: cornersFromRect(896, 448, 64, 64) },
	120: { color: null, corners: cornersFromRect(0, 512, 64, 64) },
	121: { color: null, corners: cornersFromRect(64, 512, 64, 64) },
	122: { color: null, corners: cornersFromRect(128, 512, 64, 64) },
	123: { color: null, corners: cornersFromRect(192, 512, 64, 64) },
	124: { color: null, corners: cornersFromRect(256, 512, 64, 64) },
	125: { color: null, corners: cornersFromRect(320, 512, 64, 64) },
	126: { color: null, corners: cornersFromRect(384, 512, 64, 64) },
	127: { color: null, corners: cornersFromRect(448, 512, 64, 64) },
	128: { color: null, corners: cornersFromRect(512, 512, 64, 64) },
	129: { color: null, corners: cornersFromRect(576, 512, 64, 64) },
	130: { color: null, corners: cornersFromRect(640, 512, 64, 64) },
	131: { color: null, corners: cornersFromRect(704, 512, 64, 64) },
	132: { color: null, corners: cornersFromRect(768, 512, 64, 64) },
	133: { color: null, corners: cornersFromRect(832, 512, 64, 64) },
	134: { color: null, corners: cornersFromRect(896, 512, 64, 64) },
	135: { color: null, corners: cornersFromRect(0, 576, 64, 64) },
	136: { color: null, corners: cornersFromRect(64, 576, 64, 64) },
	137: { color: null, corners: cornersFromRect(128, 576, 64, 64) },
	138: { color: null, corners: cornersFromRect(192, 576, 64, 64) },
	139: { color: null, corners: cornersFromRect(256, 576, 64, 64) },
	140: { color: null, corners: cornersFromRect(320, 576, 64, 64) },
	141: { color: null, corners: cornersFromRect(384, 576, 64, 64) },
	142: { color: null, corners: cornersFromRect(448, 576, 64, 64) },
	143: { color: null, corners: cornersFromRect(512, 576, 64, 64) },
	144: { color: null, corners: cornersFromRect(576, 576, 64, 64) },
	145: { color: null, corners: cornersFromRect(640, 576, 64, 64) },
	146: { color: null, corners: cornersFromRect(704, 576, 64, 64) },
	147: { color: null, corners: cornersFromRect(768, 576, 64, 64) },
	148: { color: null, corners: cornersFromRect(832, 576, 64, 64) },
	149: { color: null, corners: cornersFromRect(896, 576, 64, 64) },
	150: { color: null, corners: cornersFromRect(0, 640, 64, 64) },
	151: { color: null, corners: cornersFromRect(64, 640, 64, 64) },
	152: { color: null, corners: cornersFromRect(128, 640, 64, 64) },
	153: { color: null, corners: cornersFromRect(192, 640, 64, 64) },
	154: { color: null, corners: cornersFromRect(256, 640, 64, 64) },
	155: { color: null, corners: cornersFromRect(320, 640, 64, 64) },
	156: { color: null, corners: cornersFromRect(384, 640, 64, 64) },
	157: { color: null, corners: cornersFromRect(448, 640, 64, 64) },
	158: { color: null, corners: cornersFromRect(512, 640, 64, 64) },
	159: { color: null, corners: cornersFromRect(576, 640, 64, 64) },
	160: { color: null, corners: cornersFromRect(640, 640, 64, 64) },
	161: { color: null, corners: cornersFromRect(704, 640, 64, 64) },
	162: { color: null, corners: cornersFromRect(768, 640, 64, 64) },
	163: { color: null, corners: cornersFromRect(832, 640, 64, 64) },
	164: { color: null, corners: cornersFromRect(896, 640, 64, 64) },
	165: { color: null, corners: cornersFromRect(0, 704, 64, 64) },
	166: { color: null, corners: cornersFromRect(64, 704, 64, 64) },
	167: { color: null, corners: cornersFromRect(128, 704, 64, 64) },
	168: { color: null, corners: cornersFromRect(192, 704, 64, 64) },
	169: { color: null, corners: cornersFromRect(256, 704, 64, 64) },
	170: { color: null, corners: cornersFromRect(320, 704, 64, 64) },
	171: { color: null, corners: cornersFromRect(384, 704, 64, 64) },
	172: { color: null, corners: cornersFromRect(448, 704, 64, 64) },
	173: { color: null, corners: cornersFromRect(512, 704, 64, 64) },
	174: { color: null, corners: cornersFromRect(576, 704, 64, 64) },
	175: { color: null, corners: cornersFromRect(640, 704, 64, 64) },
	176: { color: null, corners: cornersFromRect(704, 704, 64, 64) },
	177: { color: null, corners: cornersFromRect(768, 704, 64, 64) },
	178: { color: null, corners: cornersFromRect(832, 704, 64, 64) },
	179: { color: null, corners: cornersFromRect(896, 704, 64, 64) },
	180: { color: null, corners: cornersFromRect(0, 768, 64, 64) },
	181: { color: null, corners: cornersFromRect(64, 768, 64, 64) },
	182: { color: null, corners: cornersFromRect(128, 768, 64, 64) },
	183: { color: null, corners: cornersFromRect(192, 768, 64, 64) },
	184: { color: null, corners: cornersFromRect(256, 768, 64, 64) },
	185: { color: null, corners: cornersFromRect(320, 768, 64, 64) },
	186: { color: null, corners: cornersFromRect(384, 768, 64, 64) },
	187: { color: null, corners: cornersFromRect(448, 768, 64, 64) },
	188: { color: null, corners: cornersFromRect(512, 768, 64, 64) },
	189: { color: null, corners: cornersFromRect(576, 768, 64, 64) },
	190: { color: null, corners: cornersFromRect(640, 768, 64, 64) },
	191: { color: null, corners: cornersFromRect(704, 768, 64, 64) },
	192: { color: null, corners: cornersFromRect(768, 768, 64, 64) },
	193: { color: null, corners: cornersFromRect(832, 768, 64, 64) },
	194: { color: null, corners: cornersFromRect(896, 768, 64, 64) },
	195: { color: null, corners: cornersFromRect(0, 832, 64, 64) },
	196: { color: null, corners: cornersFromRect(64, 832, 64, 64) },
	197: { color: null, corners: cornersFromRect(128, 832, 64, 64) },
	198: { color: null, corners: cornersFromRect(192, 832, 64, 64) },
	199: { color: null, corners: cornersFromRect(256, 832, 64, 64) },
	200: { color: null, corners: cornersFromRect(320, 832, 64, 64) },
	201: { color: null, corners: cornersFromRect(384, 832, 64, 64) },
	202: { color: null, corners: cornersFromRect(448, 832, 64, 64) },
	203: { color: null, corners: cornersFromRect(512, 832, 64, 64) },
	204: { color: null, corners: cornersFromRect(576, 832, 64, 64) },
	205: { color: null, corners: cornersFromRect(640, 832, 64, 64) },
	206: { color: null, corners: cornersFromRect(704, 832, 64, 64) },
	207: { color: null, corners: cornersFromRect(768, 832, 64, 64) },
	208: { color: null, corners: cornersFromRect(832, 832, 64, 64) },
	209: { color: null, corners: cornersFromRect(896, 832, 64, 64) },
	210: { color: null, corners: cornersFromRect(0, 896, 64, 64) },
	211: { color: null, corners: cornersFromRect(64, 896, 64, 64) },
	212: { color: null, corners: cornersFromRect(128, 896, 64, 64) },
	213: { color: null, corners: cornersFromRect(192, 896, 64, 64) },
	214: { color: null, corners: cornersFromRect(256, 896, 64, 64) },
	215: { color: null, corners: cornersFromRect(320, 896, 64, 64) },
	216: { color: null, corners: cornersFromRect(384, 896, 64, 64) },
	217: { color: null, corners: cornersFromRect(448, 896, 64, 64) },
	218: { color: null, corners: cornersFromRect(512, 896, 64, 64) },
	219: { color: null, corners: cornersFromRect(576, 896, 64, 64) },
	220: { color: null, corners: cornersFromRect(640, 896, 64, 64) },
	221: { color: null, corners: cornersFromRect(704, 896, 64, 64) },
	222: { color: null, corners: cornersFromRect(768, 896, 64, 64) },
	223: { color: null, corners: cornersFromRect(832, 896, 64, 64) },
	224: { color: null, corners: cornersFromRect(896, 896, 64, 64) },
	225: { color: null, corners: cornersFromRect(0, 960, 64, 64) },
	226: { color: null, corners: cornersFromRect(64, 960, 64, 64) },
	227: { color: null, corners: cornersFromRect(128, 960, 64, 64) },
	228: { color: null, corners: cornersFromRect(192, 960, 64, 64) },
	229: { color: null, corners: cornersFromRect(256, 960, 64, 64) },
	230: { color: null, corners: cornersFromRect(320, 960, 64, 64) },
	231: { color: null, corners: cornersFromRect(384, 960, 64, 64) },
	232: { color: null, corners: cornersFromRect(448, 960, 64, 64) },
	233: { color: null, corners: cornersFromRect(512, 960, 64, 64) },
	234: { color: null, corners: cornersFromRect(576, 960, 64, 64) },
	235: { color: null, corners: cornersFromRect(640, 960, 64, 64) },
	236: { color: null, corners: cornersFromRect(704, 960, 64, 64) },
	237: { color: null, corners: cornersFromRect(768, 960, 64, 64) },
	238: { color: null, corners: cornersFromRect(832, 960, 64, 64) },
	239: { color: null, corners: cornersFromRect(896, 960, 64, 64) },
	240: { color: null, corners: cornersFromRect(0, 1024, 64, 64) },
	241: { color: null, corners: cornersFromRect(64, 1024, 64, 64) },
	242: { color: null, corners: cornersFromRect(128, 1024, 64, 64) },
	243: { color: null, corners: cornersFromRect(192, 1024, 64, 64) },
	244: { color: null, corners: cornersFromRect(256, 1024, 64, 64) },
	245: { color: null, corners: cornersFromRect(320, 1024, 64, 64) },
	246: { color: null, corners: cornersFromRect(384, 1024, 64, 64) },
	247: { color: null, corners: cornersFromRect(448, 1024, 64, 64) },
	248: { color: null, corners: cornersFromRect(512, 1024, 64, 64) },
	249: { color: null, corners: cornersFromRect(576, 1024, 64, 64) },
	250: { color: null, corners: cornersFromRect(640, 1024, 64, 64) },
	251: { color: null, corners: cornersFromRect(704, 1024, 64, 64) },
	252: { color: null, corners: cornersFromRect(768, 1024, 64, 64) },
	253: { color: null, corners: cornersFromRect(832, 1024, 64, 64) },
	254: { color: null, corners: cornersFromRect(896, 1024, 64, 64) },
	255: { color: null, corners: cornersFromRect(0, 1088, 64, 64) },
	256: { color: null, corners: cornersFromRect(64, 1088, 64, 64) },
	257: { color: null, corners: cornersFromRect(128, 1088, 64, 64) },
	258: { color: null, corners: cornersFromRect(192, 1088, 64, 64) },
	259: { color: null, corners: cornersFromRect(256, 1088, 64, 64) },
	260: { color: null, corners: cornersFromRect(320, 1088, 64, 64) },
	261: { color: null, corners: cornersFromRect(384, 1088, 64, 64) },
	262: { color: null, corners: cornersFromRect(448, 1088, 64, 64) },
	263: { color: null, corners: cornersFromRect(512, 1088, 64, 64) },
	264: { color: null, corners: cornersFromRect(576, 1088, 64, 64) },
	265: { color: null, corners: cornersFromRect(640, 1088, 64, 64) },
	266: { color: null, corners: cornersFromRect(704, 1088, 64, 64) },
	267: { color: null, corners: cornersFromRect(768, 1088, 64, 64) },
	268: { color: null, corners: cornersFromRect(832, 1088, 64, 64) },
	269: { color: null, corners: cornersFromRect(896, 1088, 64, 64) },
	270: { color: null, corners: cornersFromRect(0, 1152, 64, 64) },
	271: { color: null, corners: cornersFromRect(64, 1152, 64, 64) },
	272: { color: null, corners: cornersFromRect(128, 1152, 64, 64) },
	273: { color: null, corners: cornersFromRect(192, 1152, 64, 64) },
	274: { color: null, corners: cornersFromRect(256, 1152, 64, 64) },
	275: { color: null, corners: cornersFromRect(320, 1152, 64, 64) },
	276: { color: null, corners: cornersFromRect(384, 1152, 64, 64) },
	277: { color: null, corners: cornersFromRect(448, 1152, 64, 64) },
	278: { color: null, corners: cornersFromRect(512, 1152, 64, 64) },
	279: { color: null, corners: cornersFromRect(576, 1152, 64, 64) },
	280: { color: null, corners: cornersFromRect(640, 1152, 64, 64) },
	281: { color: null, corners: cornersFromRect(704, 1152, 64, 64) },
	282: { color: null, corners: cornersFromRect(768, 1152, 64, 64) },
	283: { color: null, corners: cornersFromRect(832, 1152, 64, 64) },
	284: { color: null, corners: cornersFromRect(896, 1152, 64, 64) },
	285: { color: null, corners: cornersFromRect(0, 1216, 64, 64) },
	286: { color: null, corners: cornersFromRect(64, 1216, 64, 64) },
	287: { color: null, corners: cornersFromRect(128, 1216, 64, 64) },
	288: { color: null, corners: cornersFromRect(192, 1216, 64, 64) },
	289: { color: null, corners: cornersFromRect(256, 1216, 64, 64) },
	290: { color: null, corners: cornersFromRect(320, 1216, 64, 64) },
	291: { color: null, corners: cornersFromRect(384, 1216, 64, 64) },
	292: { color: null, corners: cornersFromRect(448, 1216, 64, 64) },
	293: { color: null, corners: cornersFromRect(512, 1216, 64, 64) },
	294: { color: null, corners: cornersFromRect(576, 1216, 64, 64) },
	295: { color: null, corners: cornersFromRect(640, 1216, 64, 64) },
	296: { color: null, corners: cornersFromRect(704, 1216, 64, 64) },
	297: { color: null, corners: cornersFromRect(768, 1216, 64, 64) },
	298: { color: null, corners: cornersFromRect(832, 1216, 64, 64) },
	299: { color: null, corners: cornersFromRect(896, 1216, 64, 64) },
	300: { color: null, corners: cornersFromRect(0, 1280, 64, 64) },
	301: { color: null, corners: cornersFromRect(64, 1280, 64, 64) },
	302: { color: null, corners: cornersFromRect(128, 1280, 64, 64) },
	303: { color: null, corners: cornersFromRect(192, 1280, 64, 64) },
	304: { color: null, corners: cornersFromRect(256, 1280, 64, 64) },
	305: { color: null, corners: cornersFromRect(320, 1280, 64, 64) },
	306: { color: null, corners: cornersFromRect(384, 1280, 64, 64) },
	307: { color: null, corners: cornersFromRect(448, 1280, 64, 64) },
	308: { color: null, corners: cornersFromRect(512, 1280, 64, 64) },
	309: { color: null, corners: cornersFromRect(576, 1280, 64, 64) },
	310: { color: null, corners: cornersFromRect(640, 1280, 64, 64) },
	311: { color: null, corners: cornersFromRect(704, 1280, 64, 64) },
	312: { color: null, corners: cornersFromRect(768, 1280, 64, 64) },
	313: { color: null, corners: cornersFromRect(832, 1280, 64, 64) },
	314: { color: null, corners: cornersFromRect(896, 1280, 64, 64) },
	315: { color: null, corners: cornersFromRect(0, 1344, 64, 64) },
	316: { color: null, corners: cornersFromRect(64, 1344, 64, 64) },
	317: { color: null, corners: cornersFromRect(128, 1344, 64, 64) },
	318: { color: null, corners: cornersFromRect(192, 1344, 64, 64) },
	319: { color: null, corners: cornersFromRect(256, 1344, 64, 64) },
	320: { color: null, corners: cornersFromRect(320, 1344, 64, 64) },
	321: { color: null, corners: cornersFromRect(384, 1344, 64, 64) },
	322: { color: null, corners: cornersFromRect(448, 1344, 64, 64) },
	323: { color: null, corners: cornersFromRect(512, 1344, 64, 64) },
	324: { color: null, corners: cornersFromRect(576, 1344, 64, 64) },
	325: { color: null, corners: cornersFromRect(640, 1344, 64, 64) },
	326: { color: null, corners: cornersFromRect(704, 1344, 64, 64) },
	327: { color: null, corners: cornersFromRect(768, 1344, 64, 64) },
	328: { color: null, corners: cornersFromRect(832, 1344, 64, 64) },
	329: { color: null, corners: cornersFromRect(896, 1344, 64, 64) },
	330: { color: null, corners: cornersFromRect(0, 1408, 64, 64) },
	331: { color: null, corners: cornersFromRect(64, 1408, 64, 64) },
	332: { color: null, corners: cornersFromRect(128, 1408, 64, 64) },
	333: { color: null, corners: cornersFromRect(192, 1408, 64, 64) },
	334: { color: null, corners: cornersFromRect(256, 1408, 64, 64) },
	335: { color: null, corners: cornersFromRect(320, 1408, 64, 64) },
	336: { color: null, corners: cornersFromRect(384, 1408, 64, 64) },
	337: { color: null, corners: cornersFromRect(448, 1408, 64, 64) },
	338: { color: null, corners: cornersFromRect(512, 1408, 64, 64) },
	339: { color: null, corners: cornersFromRect(576, 1408, 64, 64) },
	340: { color: null, corners: cornersFromRect(640, 1408, 64, 64) },
	341: { color: null, corners: cornersFromRect(704, 1408, 64, 64) },
	342: { color: null, corners: cornersFromRect(768, 1408, 64, 64) },
	343: { color: null, corners: cornersFromRect(832, 1408, 64, 64) },
	344: { color: null, corners: cornersFromRect(896, 1408, 64, 64) },
	345: { color: null, corners: cornersFromRect(0, 1472, 64, 64) },
	346: { color: null, corners: cornersFromRect(64, 1472, 64, 64) },
	347: { color: null, corners: cornersFromRect(128, 1472, 64, 64) },
	348: { color: null, corners: cornersFromRect(192, 1472, 64, 64) },
	349: { color: null, corners: cornersFromRect(256, 1472, 64, 64) },
	350: { color: null, corners: cornersFromRect(320, 1472, 64, 64) },
	351: { color: null, corners: cornersFromRect(384, 1472, 64, 64) },
	352: { color: null, corners: cornersFromRect(448, 1472, 64, 64) },
	353: { color: null, corners: cornersFromRect(512, 1472, 64, 64) },
	354: { color: null, corners: cornersFromRect(576, 1472, 64, 64) },
	355: { color: null, corners: cornersFromRect(640, 1472, 64, 64) },
	356: { color: null, corners: cornersFromRect(704, 1472, 64, 64) },
	357: { color: null, corners: cornersFromRect(768, 1472, 64, 64) },
	358: { color: null, corners: cornersFromRect(832, 1472, 64, 64) },
	359: { color: null, corners: cornersFromRect(896, 1472, 64, 64) },
	360: { color: null, corners: cornersFromRect(0, 1536, 64, 64) },
	361: { color: null, corners: cornersFromRect(64, 1536, 64, 64) },
	362: { color: null, corners: cornersFromRect(128, 1536, 64, 64) },
	363: { color: null, corners: cornersFromRect(192, 1536, 64, 64) },
	364: { color: null, corners: cornersFromRect(256, 1536, 64, 64) },
	365: { color: null, corners: cornersFromRect(320, 1536, 64, 64) },
	366: { color: null, corners: cornersFromRect(384, 1536, 64, 64) },
	367: { color: null, corners: cornersFromRect(448, 1536, 64, 64) },
	368: { color: null, corners: cornersFromRect(512, 1536, 64, 64) },
	369: { color: null, corners: cornersFromRect(576, 1536, 64, 64) },
	370: { color: null, corners: cornersFromRect(640, 1536, 64, 64) },
	371: { color: null, corners: cornersFromRect(704, 1536, 64, 64) },
	372: { color: null, corners: cornersFromRect(768, 1536, 64, 64) },
	373: { color: null, corners: cornersFromRect(832, 1536, 64, 64) },
	374: { color: null, corners: cornersFromRect(896, 1536, 64, 64) },
	375: { color: null, corners: cornersFromRect(0, 1600, 64, 64) },
	376: { color: null, corners: cornersFromRect(64, 1600, 64, 64) },
	377: { color: null, corners: cornersFromRect(128, 1600, 64, 64) },
	378: { color: null, corners: cornersFromRect(192, 1600, 64, 64) },
	379: { color: null, corners: cornersFromRect(256, 1600, 64, 64) },
	380: { color: null, corners: cornersFromRect(320, 1600, 64, 64) },
	381: { color: null, corners: cornersFromRect(384, 1600, 64, 64) },
	382: { color: null, corners: cornersFromRect(448, 1600, 64, 64) },
	383: { color: null, corners: cornersFromRect(512, 1600, 64, 64) },
	384: { color: null, corners: cornersFromRect(576, 1600, 64, 64) },
	385: { color: null, corners: cornersFromRect(640, 1600, 64, 64) },
	386: { color: null, corners: cornersFromRect(704, 1600, 64, 64) },
	387: { color: null, corners: cornersFromRect(768, 1600, 64, 64) },
	388: { color: null, corners: cornersFromRect(832, 1600, 64, 64) },
	389: { color: null, corners: cornersFromRect(896, 1600, 64, 64) },
	390: { color: null, corners: cornersFromRect(0, 1664, 64, 64) },
	391: { color: null, corners: cornersFromRect(64, 1664, 64, 64) },
	392: { color: null, corners: cornersFromRect(128, 1664, 64, 64) },
	393: { color: null, corners: cornersFromRect(192, 1664, 64, 64) },
	394: { color: null, corners: cornersFromRect(256, 1664, 64, 64) },
	395: { color: null, corners: cornersFromRect(320, 1664, 64, 64) },
	396: { color: null, corners: cornersFromRect(384, 1664, 64, 64) },
	397: { color: null, corners: cornersFromRect(448, 1664, 64, 64) },
	398: { color: null, corners: cornersFromRect(512, 1664, 64, 64) },
	399: { color: null, corners: cornersFromRect(576, 1664, 64, 64) },
	400: { color: null, corners: cornersFromRect(640, 1664, 64, 64) },
	401: { color: null, corners: cornersFromRect(704, 1664, 64, 64) },
	402: { color: null, corners: cornersFromRect(768, 1664, 64, 64) },
	403: { color: null, corners: cornersFromRect(832, 1664, 64, 64) },
	404: { color: null, corners: cornersFromRect(896, 1664, 64, 64) },
	405: { color: null, corners: cornersFromRect(0, 1728, 64, 64) },
	406: { color: null, corners: cornersFromRect(64, 1728, 64, 64) },
	407: { color: null, corners: cornersFromRect(128, 1728, 64, 64) },
	408: { color: null, corners: cornersFromRect(192, 1728, 64, 64) },
	409: { color: null, corners: cornersFromRect(256, 1728, 64, 64) },
	410: { color: null, corners: cornersFromRect(320, 1728, 64, 64) },
	411: { color: null, corners: cornersFromRect(384, 1728, 64, 64) },
	412: { color: null, corners: cornersFromRect(448, 1728, 64, 64) },
	413: { color: null, corners: cornersFromRect(512, 1728, 64, 64) },
	414: { color: null, corners: cornersFromRect(576, 1728, 64, 64) },
	415: { color: null, corners: cornersFromRect(640, 1728, 64, 64) },
	416: { color: null, corners: cornersFromRect(704, 1728, 64, 64) },
	417: { color: null, corners: cornersFromRect(768, 1728, 64, 64) },
	418: { color: null, corners: cornersFromRect(832, 1728, 64, 64) },
	419: { color: null, corners: cornersFromRect(896, 1728, 64, 64) },
	420: { color: null, corners: cornersFromRect(0, 1792, 64, 64) },
	421: { color: null, corners: cornersFromRect(64, 1792, 64, 64) },
	422: { color: null, corners: cornersFromRect(128, 1792, 64, 64) },
	423: { color: null, corners: cornersFromRect(192, 1792, 64, 64) },
	424: { color: null, corners: cornersFromRect(256, 1792, 64, 64) },
	425: { color: null, corners: cornersFromRect(320, 1792, 64, 64) },
	426: { color: null, corners: cornersFromRect(384, 1792, 64, 64) },
	427: { color: null, corners: cornersFromRect(448, 1792, 64, 64) },
	428: { color: null, corners: cornersFromRect(512, 1792, 64, 64) },
	429: { color: null, corners: cornersFromRect(576, 1792, 64, 64) },
	430: { color: null, corners: cornersFromRect(640, 1792, 64, 64) },
	431: { color: null, corners: cornersFromRect(704, 1792, 64, 64) },
	432: { color: null, corners: cornersFromRect(768, 1792, 64, 64) },
	433: { color: null, corners: cornersFromRect(832, 1792, 64, 64) },
	434: { color: null, corners: cornersFromRect(896, 1792, 64, 64) }
};