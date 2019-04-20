"use strict";
importScripts("/Constants.js");
importScripts("/Helper.js");
importScripts("/GLHelper.js");
importScripts("/SegmentShaders.js");
importScripts("/gl-matrix-min.js");
importScripts("/VertexDataGen.js");
importScripts("/SegmentRenderData.js");

const mat4 = glMatrix.mat4;
const vec4 = glMatrix.vec4;
const vec3 = glMatrix.vec3;

const viewport = { w: 0, h: 0 }; 
let canvas = null;
let GL = null;
let glFailed = false;

///////////////// rendering stuff /////////////////
let tileTexture = null;
let staticSegmentQuads = null;
const texCoordBuffer = generateTexCoordBuffer(segmentSize);
const colorBuffer = generateColorBuffer(segmentSize);

const texturedSegmentShader = {
	locations: {
		vertexPosition: null,
		texCoord: null
	},
	uniforms: {
		modelViewProjection: null,
		textureSampler: null,
		globalColor: null
	}
};

const coloredSegmentShader = {
	locations: {
		vertexPosition: null,
		color: null
	},
	uniforms: {
		modelViewProjection: null,
		globalColor: null
	}
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
let isMapTextured = true;
/////////////////////////////////////////////////

const segmentMap = new Map();

function prepareSegmentShaders() {
	const texturedProgram = texturedSegmentShader.program = buildShaderProgram(GL, texturedSegmentShaderSource);
	texturedSegmentShader.locations.vertexPosition = GL.getAttribLocation(texturedProgram, "aVertexPosition");
	texturedSegmentShader.locations.texCoord = GL.getAttribLocation(texturedProgram, "aTexCoord");
	texturedSegmentShader.uniforms.modelViewProjection = GL.getUniformLocation(texturedProgram, "uModelViewProjection");
	texturedSegmentShader.uniforms.globalColor = GL.getUniformLocation(texturedProgram, "uGlobalColor");
	texturedSegmentShader.uniforms.textureSampler = GL.getUniformLocation(texturedProgram, "uTextureSampler");

	const coloredProgram = coloredSegmentShader.program = buildShaderProgram(GL, coloredSegmentShaderSource);
	coloredSegmentShader.locations.vertexPosition = GL.getAttribLocation(coloredProgram, "aVertexPosition");
	coloredSegmentShader.locations.color = GL.getAttribLocation(coloredProgram, "aColor");
	coloredSegmentShader.uniforms.modelViewProjection = GL.getUniformLocation(coloredProgram, "uModelViewProjection");
	coloredSegmentShader.uniforms.globalColor = GL.getUniformLocation(coloredProgram, "uGlobalColor");
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

function bindTexturedSegmentShader() {
	// bind tile texture
	GL.activeTexture(GL.TEXTURE0);
	GL.bindTexture(GL.TEXTURE_2D, tileTexture.texture);

	// prepare shader
	GL.useProgram(texturedSegmentShader.program);
	GL.uniform4fv(texturedSegmentShader.uniforms.globalColor, [1.0, 1.0, 1.0, 1.0]);
	GL.uniform1i(texturedSegmentShader.uniforms.textureSampler, 0); // texture unit 0

	// bind vertices
	GL.bindBuffer(GL.ARRAY_BUFFER, staticSegmentQuads.vertexBuffer);
	GL.enableVertexAttribArray(texturedSegmentShader.locations.vertexPosition);
	GL.vertexAttribPointer(texturedSegmentShader.locations.vertexPosition, 2, GL.FLOAT, false, 0, 0);

	// bind indices
	GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, staticSegmentQuads.indexBuffer);

	return texturedSegmentShader;
}

function bindColoredSegmentShader() {
	// prepare shader
	GL.useProgram(coloredSegmentShader.program);
	GL.uniform4fv(coloredSegmentShader.uniforms.globalColor, [1.0, 1.0, 1.0, 1.0]);

	// bind vertices
	GL.bindBuffer(GL.ARRAY_BUFFER, staticSegmentQuads.vertexBuffer);
	GL.enableVertexAttribArray(coloredSegmentShader.locations.vertexPosition);
	GL.vertexAttribPointer(coloredSegmentShader.locations.vertexPosition, 2, GL.FLOAT, false, 0, 0);

	// bind indices
	GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, staticSegmentQuads.indexBuffer);

	return coloredSegmentShader;
}

function drawSegments() {
	mat4.identity(vMatrix);
	mat4.translate(vMatrix, vMatrix, viewTranslation);
	mat4.multiply(pvMatrix, pMatrix, vMatrix);

	const isTextured = zoom > 1 / 12;
	if (isMapTextured !== isTextured) {
		for (const segment of segmentMap.values()) {
			segment.markDirty();
		}
		isMapTextured = isTextured;
	}

	const shader = isTextured ? bindTexturedSegmentShader() : bindColoredSegmentShader();
	if (isTextured)
		GL.enableVertexAttribArray(shader.locations.texCoord);
	else
		GL.enableVertexAttribArray(shader.locations.color);

	// draw segments in batch
	for (const segment of segmentMap.values()) {
		if (segment.isDirty) {
			if (isTextured)
				segment.buildAndUploadTextured(GL, texCoordBuffer);
			else
				segment.buildAndUploadColored(GL, colorBuffer);
		}
		drawSegment(shader, segment, isTextured);
	}
}

/**
 * Prepares GL state and draws a segment.
 * @param {Object} shader The shader to use.
 * @param {SegmentRenderData} segment The segment to draw.
 * @param {Boolean} isTextured Is the segment textured or not.
 */
function drawSegment(shader, segment, isTextured) {
	mat4.multiply(mvpMatrix, pvMatrix, segment.matrix);
	GL.uniformMatrix4fv(shader.uniforms.modelViewProjection, false, mvpMatrix);

	GL.bindBuffer(GL.ARRAY_BUFFER, segment._glDataBuffer);
	if (isTextured)
		GL.vertexAttribPointer(shader.locations.texCoord, 2, GL.FLOAT, false, 0, 0);
	else
		GL.vertexAttribPointer(shader.locations.color, 3, GL.FLOAT, false, 0, 0);

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
			//zoomChanged(zoom, oldZoom);
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

			const offscreen = new OffscreenCanvas(64, 64);
			var ofCtx = offscreen.getContext("2d");

			const bW = e.data.bitmap.width;
			const bH = e.data.bitmap.height;

			for (const key in Object.keys(indexToTileDescriptionMap)) {
				const dataEntry = indexToTileDescriptionMap[key];
				const x = dataEntry.corners.TL[0] * bW;
				const y = dataEntry.corners.TL[1] * bH;
				const w = dataEntry.corners.BR[0] * bW - x;
				const h = dataEntry.corners.BR[1] * bH - y;

				ofCtx.drawImage(e.data.bitmap, x, y, w, h, 0, 0, w, h);
				const imageData = ofCtx.getImageData(0, 0, w, h);
				const pixelArray = imageData.data;

				let r = 0.0, g = 0.0, b = 0.0;
				for (let i = 0; i < pixelArray.length; i += 4) {
					const alpha = pixelArray[i + 3] / 255;
					r += pixelArray[i + 0] * alpha;
					g += pixelArray[i + 1] * alpha;
					b += pixelArray[i + 2] * alpha;
				}

				const div = imageData.width * imageData.height * 255;
				dataEntry.color = [r / div, g / div, b / div];
			}

			e.data.bitmap.close();
			break;

		case "draw":
			draw(e.data.delta);
			break;

		case "segment": {
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
			segment.markDirty();
			break;
		}

		case "blockorders": {
			const dirtySegments = [];
			for (let i = 0; i < e.data.orders.length; i++) {
				const order = e.data.orders[i];

				const key = coordsToSegmentKey(order.s[0], order.s[1]);
				let segment = segmentMap.get(key);
				if (segment) {
					const x = order.p[0];
					const y = order.p[1];
					const index = y * segmentSize + x;
					segment.tiles[index] = order.t;
					dirtySegments.push(segment);
				}
			}

			for (const segment of dirtySegments)
				segment.markDirty();
			break;
		}

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
	requestTexture(tileTexture.id, "TB_diffuse_64.png"); //"/blocks_64.png");

	prepareSegmentShaders();
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