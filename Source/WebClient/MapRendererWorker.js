"use strict";
importScripts("/package/MapRendererWorker.jspack");

const segmentChannel = new ChannelSocket("segment");
segmentChannel.subscribeToEvent("message", handleSegmentChannelMessage);
segmentChannel.connect();

const mat4 = glMatrix.mat4;
const vec4 = glMatrix.vec4;
const vec3 = glMatrix.vec3;

const viewport = { w: 0, h: 0 }; 
let canvas = null;
let GL = null;
let GLFailed = false;
let totalTime = 0;

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
	locationSizes: {
		texCoord: 2
	},
	uniforms: {
		modelViewProjection: null,
		textureSampler: null,
		tint: null
	}
};

const coloredSegmentShader = {
	locations: {
		vertexPosition: null,
		color: null
	},
	locationSizes: {
		color: 3
	},
	uniforms: {
		modelViewProjection: null,
		tint: null
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

let zoom = mapZoom.default;
let isMapTextured = true;
/////////////////////////////////////////////////

const segmentMap = new Map();

function prepareSegmentShaders() {
	const texturedProgram = texturedSegmentShader.program = buildShaderProgram(GL, texturedSegmentShaderSource);
	texturedSegmentShader.locations.vertexPosition = GL.getAttribLocation(texturedProgram, "aVertexPosition");
	texturedSegmentShader.locations.texCoord = GL.getAttribLocation(texturedProgram, "aTexCoord");
	texturedSegmentShader.uniforms.modelViewProjection = GL.getUniformLocation(texturedProgram, "uModelViewProjection");
	texturedSegmentShader.uniforms.tint = GL.getUniformLocation(texturedProgram, "uTint");
	texturedSegmentShader.uniforms.textureSampler = GL.getUniformLocation(texturedProgram, "uTextureSampler");

	const coloredProgram = coloredSegmentShader.program = buildShaderProgram(GL, coloredSegmentShaderSource);
	coloredSegmentShader.locations.vertexPosition = GL.getAttribLocation(coloredProgram, "aVertexPosition");
	coloredSegmentShader.locations.color = GL.getAttribLocation(coloredProgram, "aColor");
	coloredSegmentShader.uniforms.modelViewProjection = GL.getUniformLocation(coloredProgram, "uModelViewProjection");
	coloredSegmentShader.uniforms.tint = GL.getUniformLocation(coloredProgram, "uTint");
}

function draw(delta) {
	totalTime += delta;

	GL.viewport(0, 0, canvas.width, canvas.height);
	GL.clearColor(0, 0, 0, 0);
	GL.clear(GL.COLOR_BUFFER_BIT);

	const z = 1 / zoom;
	const w = viewport.w;
	const h = viewport.h;
	mat4.ortho(pMatrix,
		z * -w / 2,
		z * w / 2,
		z * h / 2,
		z * -h / 2,
		0.001, 10);

	drawSegments(delta);
}

function bindTexturedSegmentShader() {
	// bind tile texture
	GL.activeTexture(GL.TEXTURE0);
	GL.bindTexture(GL.TEXTURE_2D, tileTexture.texture);

	// prepare shader
	GL.useProgram(texturedSegmentShader.program);
	GL.uniform4fv(texturedSegmentShader.uniforms.tint, [1.0, 1.0, 1.0, 1.0]);
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
	GL.uniform4fv(coloredSegmentShader.uniforms.tint, [1.0, 1.0, 1.0, 1.0]);

	// bind vertices
	GL.bindBuffer(GL.ARRAY_BUFFER, staticSegmentQuads.vertexBuffer);
	GL.enableVertexAttribArray(coloredSegmentShader.locations.vertexPosition);
	GL.vertexAttribPointer(coloredSegmentShader.locations.vertexPosition, 2, GL.FLOAT, false, 0, 0);

	// bind indices
	GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, staticSegmentQuads.indexBuffer);

	return coloredSegmentShader;
}

function drawSegments(delta) {
	mat4.identity(vMatrix);
	mat4.translate(vMatrix, vMatrix, viewTranslation);
	mat4.multiply(pvMatrix, pMatrix, vMatrix);

	let chunkUploadsLeft = currentSegmentUploadsPerFrame;
	const isTextured = zoom > 1 / 12 && tileTexture.isLoaded;
	if (isMapTextured !== isTextured) {
		isMapTextured = isTextured;
		forEachSegment((segment) => {
			if (immediateUploadsOnDetailChange) {
				if (!segment.isDirty)
					buildAndUploadSegment(segment, isTextured);
			}
			else
				segment.markDirty(true);
		});

		// skip building more chunks this frame
		if (immediateUploadsOnDetailChange)
			chunkUploadsLeft = 0;
	}

	const shader = isTextured ? bindTexturedSegmentShader() : bindColoredSegmentShader();
	const locationName = isTextured ? "texCoord" : "color";
	GL.enableVertexAttribArray(shader.locations[locationName]);

	forEachVisibleSegment((segment) => {
		if (segment.isDirty && chunkUploadsLeft > 0) {
			buildAndUploadSegment(segment, isTextured);
			chunkUploadsLeft--;
		}

		if (!segment.isDirty) {
			segment.alpha += delta / fadeDuration;
			drawSegment(segment, shader, locationName);
		}
	});
}

function buildAndUploadSegment(segment, isTextured) {
	if (isTextured)
		segment.buildAndUploadTextured(GL, texCoordBuffer);
	else
		segment.buildAndUploadColored(GL, colorBuffer);
}

function forEachVisibleSegment(callback) {
	forEachSegment(callback);
}

function forEachSegment(callback) {
	segmentMap.forEach((segment) => {
		callback(segment);
	});
}

/**
 * Partially prepares state and draws a segment.
 * @param {SegmentRenderData} segment The segment to draw.
 * @param {Object} shader The shader to use.
 * @param {Boolean} locationName The name of the attribute location for data.
 */
function drawSegment(segment, shader, locationName) {
	mat4.multiply(mvpMatrix, pvMatrix, segment.matrix);
	GL.uniformMatrix4fv(shader.uniforms.modelViewProjection, false, mvpMatrix);

	const clampedAlpha = Math.clamp(segment.alpha, 0, 1);
	GL.uniform4f(shader.uniforms.tint, 1, 1, 1, clampedAlpha);

	GL.bindBuffer(GL.ARRAY_BUFFER, segment._glDataBuffer);
	GL.vertexAttribPointer(shader.locations[locationName], shader.locationSizes[locationName], GL.FLOAT, false, 0, 0);
	GL.drawElements(GL.TRIANGLES, staticSegmentQuads.indexCount, GL.UNSIGNED_SHORT, 0);
}

self.onmessage = (e) => {
	switch (e.data.type) {
		case "init":
			canvas = e.data.canvas;
			init();
			break;

		case "draw":
			draw(e.data.delta);
			break;

		case "zoom":
			//const oldZoom = zoom;
			zoom = e.data.zoom;

			//const newScale = vec3.fromValues(newZoom, newZoom, 1);
			//const oldScale = vec3.fromValues(oldZoom, oldZoom, 1);
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
			tex.isLoaded = true;
			if (tex.onLoad)
				tex.onLoad();

			const bW = e.data.bitmap.width;
			const bH = e.data.bitmap.height;

			const offscreen = new OffscreenCanvas(64, 64);
			var ofCtx = offscreen.getContext("2d");

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

		default:
			if (!e.data.type)
				throw new Error(`Missing property 'type' on event data.`);
			throw new Error(`Unknown message type '${e.data.type}'.`);
	}
};

function handleSegmentChannelMessage(msg) {
	const response = JSON.parse(msg.data);
	switch (response.type) {
		case "segment": {
			const pos = response.position;
			const key = coordsToSegmentKey(pos.x, pos.y);
			let segment = segmentMap.get(key);
			if (!segment) {
				segment = new SegmentRenderData(pos.x, pos.y);
				segmentMap.set(key, segment);
			}
			segment.tileBuffer.set(response.tiles);
			segment.markDirty(true);
			break;
		}

		case "blockorders": {
			const dirtySegments = new Map();
			for (let i = 0; i < response.orders.length; i++) {
				const order = response.orders[i];
				const segmentKey = coordsToSegmentKey(order.s[0], order.s[1]);
				const segment = segmentMap.get(segmentKey);
				if (segment) {
					const tileX = order.p[0];
					const tileY = order.p[1];
					const index = tileY * segmentSize + tileX;
					segment.tileBuffer[index] = order.t;
					dirtySegments.set(segmentKey, segment);
				}
			}

			dirtySegments.forEach((segment) => segment.markDirty(false));
			break;
		}
	}
}

function requestTexture(id, url) {
	postMessage({ type: "texture", id, url });
}

function init() {
	GL = canvas.getContext("webgl");
	if (GL) {
		console.log("Initialized WebGL context in worker.");
	}
	else {
		GLFailed = true;
		console.error("Failed to initialize WebGL context in worker.");
	}

	GL.enable(GL.BLEND);
	GL.blendFunc(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA);

	tileTexture = createTexture2D(GL);
	tileTexture.onLoad = () => {
		segmentMap.forEach((segment, k) => {
			segment.markDirty(false);
			console.log("and u dirty", segment);
		});
	};
	requestTexture(tileTexture.id, "TB_diffuse_64.png"); //"/blocks_64.png");

	prepareSegmentShaders();
	staticSegmentQuads = prepareSegmentQuads();

	postMessage({ type: "ready" });
	startRequestingSegments();
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

function startRequestingSegments() {
	// dirty method for loading from center
	// this will get removed later
	const tmpSegmentKeys = new Array(drawDistance * drawDistance);
	for (let x = 0; x < drawDistance; x++) {
		for (let y = 0; y < drawDistance; y++) {
			const xx = x - Math.floor(drawDistance / 2);
			const yy = y - Math.floor(drawDistance / 2);

			tmpSegmentKeys[x + y * drawDistance] = { x: xx, y: yy };
		}
	}

	function enqueueByDistance(origin, keys) {
		function getSqDist(p1, p2) {
			return Math.abs((p1.x - p2.x) * (p1.x - p2.x) + (p1.y - p2.y) * (p1.y - p2.y));
		}

		keys.sort(function (a, b) {
			a.sqDist = getSqDist(origin, a);
			b.sqDist = getSqDist(origin, b);
			return a.sqDist - b.sqDist;
		});

		let time = 0;
		keys.forEach((item) => {
			setTimeout(() => {
				const intervalID = setInterval(() => {
					if (!segmentChannel.isConnected) {
						// repeat until we're connected
						return;
					}
					clearInterval(intervalID);
					segmentChannel.sendMessage("get", { position: { x: item.x, y: item.y } });
				}, 25 + Math.floor(Math.random() * 25));
			}, time);
			time += requestDelayMillis;
		});
	}

	enqueueByDistance(createVector2(0, 0), tmpSegmentKeys);
}