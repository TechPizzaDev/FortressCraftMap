"use strict";
importScripts("/constants.js");
importScripts("/helper.js");
importScripts("/glHelper.js");
importScripts("/mainShader.js");
importScripts("/gl-matrix-min.js");
importScripts("/vertexDataGen.js");
importScripts("/SegmentRenderData.js");

const mat4 = glMatrix.mat4;
const vec4 = glMatrix.vec4;
const vec3 = glMatrix.vec3;

const viewport = { w: 0, h: 0 }; 
let canvas = null;
let GL = null;
let glFailed = false;
let mainShader = null;

///////////////// rendering stuff /////////////////
let tileTexture = null;
let staticSegmentQuads = null;

// shader fields (they are written out here for reference)
const mainLocations = {
	vertexPosition: null,
	texCoord: null
};

const mainUniforms = {
	modelViewProjection: null,
	textureSampler: null,
	globalColor: null
};

// shader matrices
const pMatrix = mat4.create();
const vMatrix = mat4.create();

const pvMatrix = mat4.create();
const pvMatrixInverse = mat4.create();

const mvpMatrix = mat4.create();

// matrix components
const viewportCenter = vec3.create();
const viewTranslation = vec3.create();
const mousePos = vec3.create();

let zoom = defaultMapZoom;
/////////////////////////////////////////////////

const segmentMap = new Map();

function prepareSegmentShader() {
	mainShader = buildShaderProgram(GL, mainShaderData);

	mainLocations.vertexPosition = GL.getAttribLocation(mainShader, "aVertexPosition");
	mainLocations.texCoord = GL.getAttribLocation(mainShader, "aTexCoord");

	mainUniforms.modelViewProjection = GL.getUniformLocation(mainShader, "uModelViewProjection");
	mainUniforms.globalColor = GL.getUniformLocation(mainShader, "uGlobalColor");
	mainUniforms.textureSampler = GL.getUniformLocation(mainShader, "uTextureSampler");
}

function draw(delta) {
	GL.viewport(0, 0, canvas.width, canvas.height);
	GL.clearColor(0, 0, 0, 0);
	GL.clear(GL.COLOR_BUFFER_BIT);

	const z = 1 / zoom;
	const w = viewport.w;
	const h = viewport.h;
	mat4.ortho(pMatrix, z * -w / 2, z * w / 2, z * h / 2, z * -h / 2, 0.001, 10);
	
	drawSegments();
}

function drawSegments() {
	// bind tile texture
	GL.activeTexture(GL.TEXTURE0);
	GL.bindTexture(GL.TEXTURE_2D, tileTexture.texture);

	// prepare shader
	GL.useProgram(mainShader);
	GL.uniform4fv(mainUniforms.globalColor, [1.0, 1.0, 1.0, 1.0]);
	GL.uniform1i(mainUniforms.textureSampler, 0); // texture unit 0

	// bind vertices
	GL.bindBuffer(GL.ARRAY_BUFFER, staticSegmentQuads.vertexBuffer);
	GL.enableVertexAttribArray(mainLocations.vertexPosition);
	GL.vertexAttribPointer(mainLocations.vertexPosition, 2, GL.FLOAT, false, 0, 0);

	// bind indices
	GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, staticSegmentQuads.indexBuffer);

	mat4.identity(vMatrix);
	mat4.translate(vMatrix, vMatrix, viewTranslation);

	mat4.multiply(pvMatrix, pMatrix, vMatrix);

	// draw segments in batch
	for (const segment of segmentMap.values()) {
		drawSegment(segment);
	}
}

/**
 * Draws a segment (needs preparation of WebGL state beforehand).
 * @param {SegmentRenderData} segment The segment to draw.
 */
function drawSegment(segment) {
	mat4.multiply(mvpMatrix, pvMatrix, segment.matrix);

	GL.uniformMatrix4fv(mainUniforms.modelViewProjection, false, mvpMatrix);

	GL.bindBuffer(GL.ARRAY_BUFFER, segment.texCoordBuffer);
	GL.enableVertexAttribArray(mainLocations.texCoord);
	GL.vertexAttribPointer(mainLocations.texCoord, 2, GL.FLOAT, false, 0, 0);

	GL.drawElements(GL.TRIANGLES, staticSegmentQuads.indexCount, GL.UNSIGNED_SHORT, 0);
}

self.onmessage = (e) => {
	switch (e.data.type) {
		case "init":
			canvas = e.data.canvas;
			init();
			break;

		case "zoom":
			const oldZoom = zoom;
			zoom = e.data.zoom;
			zoomChanged(zoom, oldZoom);
			break;

		case "mousepos":
			mousePos[0] = e.data.x;
			mousePos[1] = e.data.y;
			break;

		case "move":
			viewTranslation[0] += Math.round(e.data.x / zoom);
			viewTranslation[1] += Math.round(e.data.y / zoom);
			break;

		case "viewport":
			viewport.w = e.data.viewport.w;
			viewport.h = e.data.viewport.h;
			canvas.width = viewport.w;
			canvas.height = viewport.h;

			viewportCenter[0] = viewport.w / 2;
			viewportCenter[1] = viewport.h / 2;
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
				segment = new SegmentRenderData(x, y);
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

function zoomChanged(newZoom, oldZoom) {
	const newScale = vec3.fromValues(newZoom, newZoom, 1);
	const oldScale = vec3.fromValues(oldZoom, oldZoom, 1);

}

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

	tileTexture = createTexture2D(GL);
	requestTexture(tileTexture.id, "/blocks_64.png");

	prepareSegmentShader();
	staticSegmentQuads = prepareSegmentQuads();

	postMessage({ type: "ready" });
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