"use strict";
importScripts("/constants.js");
importScripts("/helper.js");
importScripts("/glHelper.js");
importScripts("/mainShader.js");
importScripts("/gl-matrix-min.js");
importScripts("/vertexDataGen.js");

const viewport = { w: 0, h: 0 }; 
let canvas = null;
let GL = null;
let glFailed = false;
let mainShader = null;

//////////////////////////////////////////////////
let tileTex = null;
let segmentQuads = null;

// shader fields
let vertexPositionLocation;
let texCoordLocation;

let uMVP;
let uTextureSampler;
let uGlobalColor;

// shader matrices
let viewMatrix = glMatrix.mat4.create();
let projectionMatrix = glMatrix.mat4.create();
const vpMatrix = glMatrix.mat4.create();
const tmpMvpMatrix = glMatrix.mat4.create();

// matrix components
const translation = glMatrix.vec3.create();
const scale = glMatrix.vec3.fromValues(1, 1, 1);

const projMul = glMatrix.vec3.fromValues(64, 64, 1);
const projScale = glMatrix.vec3.create();
//////////////////////////////////////////////////

const segmentMap = new Map();

self.onmessage = (e) => {
	switch (e.data.type) {
		case "init":
			canvas = e.data.canvas;
			init();
			break;

		case "zoom":
			const newScale = e.data.zoom;
			scale[0] = newScale;
			scale[1] = newScale;
			break;

		case "translation":
			translation[0] = Math.round(e.data.translation.x);
			translation[1] = Math.round(e.data.translation.y);
			break;

		case "viewport":
			viewport.w = e.data.viewport.w;
			viewport.h = e.data.viewport.h;
			canvas.width = viewport.w;
			canvas.height = viewport.h;
			break;

		case "texture":
			const tex = getTexture2D(e.data.id);
			uploadTextureData(GL, tex, e.data.bitmap);
			e.data.bitmap.close();
			break;

		case "draw":
			draw(e.data.delta);
			break;

		case "segment":
			const x = e.data.position.x;
			const y = e.data.position.y;
			const key = coordsToSegmentKey(x, y);

			let segment = segmentMap.get(key);
			if (!segment) {
				segment = new DrawableSegment(x, y);
				segmentMap.set(key, segment);
			}

			const dataTiles = e.data.tiles;
			for (let i = 0; i < dataTiles.length; i++) {
				segment.tiles[i] = dataTiles[i];
			}
			segment.updateTexCoords(GL);
			break;

		default:
			if (!e.data.type)
				throw new Error(`Missing property 'type' on event data.`);
			throw new Error(`Unknown message type '${e.data.type}'.`);
	}
};

function requestTexture(id, url) {
	postMessage({ type: "texture", id, url });
}

function init() {
	GL = canvas.getContext("webgl");
	if (GL) {
		console.log("Initialized WebGL context in worker");
	}
	else {
		glFailed = true;
		console.warn("WebGL is not supported");
	}

	tileTex = createTexture2D(GL);
	requestTexture(tileTex.id, "/blocks_64.png");

	prepareSegmentShader();
	segmentQuads = prepareSegmentQuads();

	postMessage({ type: "ready" });
}

function prepareSegmentShader() {
	mainShader = buildShaderProgram(GL, mainShaderData);

	vertexPositionLocation = GL.getAttribLocation(mainShader, "aVertexPosition");
	texCoordLocation = GL.getAttribLocation(mainShader, "aTexCoord");

	uMVP = GL.getUniformLocation(mainShader, "uMVP");
	uGlobalColor = GL.getUniformLocation(mainShader, "uGlobalColor");
	uTextureSampler = GL.getUniformLocation(mainShader, "uTextureSampler");
}

function prepareSegmentQuads() {
	const quadData = generateQuads(segmentSize);

	const vertexBuffer = GL.createBuffer();
	GL.bindBuffer(GL.ARRAY_BUFFER, vertexBuffer);
	GL.bufferData(GL.ARRAY_BUFFER, quadData.vertices, GL.STATIC_DRAW);

	const indexBuffer = GL.createBuffer();
	GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, indexBuffer);
	GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, quadData.indices, GL.STATIC_DRAW);

	return {
		vertexBuffer,
		indexBuffer,
		indexCount: quadData.indices.length
	};
}

function draw(delta) {
	glMatrix.mat4.ortho(viewMatrix, 0, viewport.w, viewport.h, 0, 0.001, 10);
	
	glMatrix.mat4.fromTranslation(projectionMatrix, translation);
	glMatrix.vec3.multiply(projScale, scale, projMul);
	glMatrix.mat4.scale(projectionMatrix, projectionMatrix, projScale);

	GL.viewport(0, 0, canvas.width, canvas.height);
	GL.clearColor(0, 0, 0, 0);
	GL.clear(GL.COLOR_BUFFER_BIT);

	drawSegments();
}

function drawSegments() {
	GL.useProgram(mainShader);
	
	glMatrix.mat4.multiply(vpMatrix, viewMatrix, projectionMatrix);

	// bind tile texture
	GL.activeTexture(GL.TEXTURE0);
	GL.bindTexture(GL.TEXTURE_2D, tileTex.texture);
	GL.uniform1i(uTextureSampler, 0);

	// upload fields
	GL.uniform4fv(uGlobalColor, [1.0, 1.0, 1.0, 1.0]);

	// bind vertices
	GL.bindBuffer(GL.ARRAY_BUFFER, segmentQuads.vertexBuffer);
	GL.enableVertexAttribArray(vertexPositionLocation);
	GL.vertexAttribPointer(vertexPositionLocation, 2, GL.FLOAT, false, 0, 0);

	// bind indices
	GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, segmentQuads.indexBuffer);

	// draw segments in batch
	for (const segment of segmentMap.values()) {
		drawSegment(segment);
	}
}

/**
 * Draws a segment (needs preparation of WebGL state beforehand).
 * @param {DrawableSegment} segment The segment to draw.
 */
function drawSegment(segment) {
	glMatrix.mat4.multiply(tmpMvpMatrix, vpMatrix, segment.modelMatrix);
	GL.uniformMatrix4fv(uMVP, false, tmpMvpMatrix);

	GL.bindBuffer(GL.ARRAY_BUFFER, segment.texCoordBuffer);
	GL.enableVertexAttribArray(texCoordLocation);
	GL.vertexAttribPointer(texCoordLocation, 2, GL.FLOAT, false, 0, 0);

	GL.drawElements(GL.TRIANGLES, segmentQuads.indexCount, GL.UNSIGNED_SHORT, 0);
}

class DrawableSegment {
	constructor(x, y) {
		this.texCoordBuffer = null;
		this.tiles = new Uint16Array(segmentSize * segmentSize);

		const translation = glMatrix.vec3.create();
		translation[0] = x * segmentSize;
		translation[1] = y * segmentSize;

		this.modelMatrix = glMatrix.mat4.create();
		glMatrix.mat4.fromTranslation(this.modelMatrix, translation);
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