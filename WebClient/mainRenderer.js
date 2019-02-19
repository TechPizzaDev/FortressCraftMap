"use strict";
importScripts("/constants.js");
importScripts("/helper.js");
importScripts("/shaderHelper.js");
importScripts("/EventEmitter.js");
importScripts("/ChannelSocket.js");
importScripts("/mainShader.js");

const segmentChannel = new ChannelSocket("segment");
segmentChannel.subscribeToEvent("message", handleSegmentChannelMessage);
segmentChannel.connect();

let canvas = null;
let GL = null;
let glFailed = false;
let mainShaderProgram = null;

const viewport = { w: 0, h: 0 };
let mapOffset = createVector2();

const segmentSet = {};

//////////////////////////////////////////////////
// Aspect ratio and coordinate system details
let aspectRatio;
let currentRotation = [0, 1];
let currentScale = [1.0, 1.0];

// Vertex information
let vertexArray;
let vertexBuffer;
let vertexNumComponents;
let vertexCount;

// Rendering data shared with the scalers.
let uScalingFactor;
let uGlobalColor;
let uRotationVector;
let aVertexPosition;

// Animation
let currentAngle = 0;
let rotationRate = 0;
//////////////////////////////////////////////////

function draw(delta) {
	GL.viewport(0, 0, canvas.width, canvas.height);
	GL.clearColor(0.8, 0.9, 1.0, 1.0);
	GL.clear(GL.COLOR_BUFFER_BIT);

	currentAngle += delta * 36;

	let radians = currentAngle * Math.PI / 180.0;
	currentRotation[0] = Math.sin(radians);
	currentRotation[1] = Math.cos(radians);

	GL.useProgram(mainShaderProgram);

	uScalingFactor = GL.getUniformLocation(mainShaderProgram, "uScalingFactor");
	uGlobalColor = GL.getUniformLocation(mainShaderProgram, "uGlobalColor");
	uRotationVector = GL.getUniformLocation(mainShaderProgram, "uRotationVector");

	GL.uniform2fv(uScalingFactor, currentScale);
	GL.uniform2fv(uRotationVector, currentRotation);
	GL.uniform4fv(uGlobalColor, [0.1, 0.7, 0.2, 1.0]);

	GL.bindBuffer(GL.ARRAY_BUFFER, vertexBuffer);

	aVertexPosition = GL.getAttribLocation(mainShaderProgram, "aVertexPosition");

	GL.enableVertexAttribArray(aVertexPosition);
	GL.vertexAttribPointer(aVertexPosition, vertexNumComponents, GL.FLOAT, false, 0, 0);

	GL.drawArrays(GL.TRIANGLES, 0, vertexCount);
}

self.onmessage = (e) => {
	switch (e.data.type) {
		case "init":
			canvas = e.data.canvas;
			GL = canvas.getContext("webgl");
			if (GL) {
				console.log("Initialized WebGL context in worker");
			}
			else {
				glFailed = true;
				console.warn("WebGL is not supported");
			}
			init();

			setInterval(() => draw(1.0 / 60.0), 1.0 / 60.0 * 1000);
			break;

		case "zoom":
			console.log("zoom: " + e.data.zoom);
			break;

		case "viewport":
			viewport.w = e.data.viewport.w;
			viewport.h = e.data.viewport.h;
			canvas.width = viewport.w;
			canvas.height = viewport.h;

			updateScale();
			break;

		case "draw":
			//draw(e.data.delta);
			break;

		case "request":
			const intervalID = setInterval(() => {
				if (!glFailed && (!segmentChannel.isConnected || !GL)) {
					// repeat until we're connected and have a GL context
					return;
				}
				clearInterval(intervalID);
				if (glFailed)
					return;

				const pos = segmentKeyToCoords(e.data.key);
				segmentChannel.sendRequest("get", { pos });
			}, 25 + Math.floor(Math.random() * 25));
			break;

		default:
			if (!e.data.type)
				throw new Error(`Missing property 'type' on event data.`);
			throw new Error(`Unknown message type '${e.data.type}'.`);
	}
};

function updateScale() {
	aspectRatio = canvas.width / canvas.height;
	currentScale = [1.0, aspectRatio];
}

function init() {
	// center on current segments
	mapOffset.x = -drawDistance * segmentResolution / 2;
	mapOffset.y = -drawDistance * segmentResolution / 2;

	mainShaderProgram = buildShaderProgram(GL, mainShaderData);

	updateScale();
	currentRotation = [0, 1];

	vertexArray = new Float32Array([
		-0.5, 0.5, 0.5, 0.5, 0.5, -0.5,
		-0.5, 0.5, 0.5, -0.5, -0.5, -0.5
	]);

	vertexBuffer = GL.createBuffer();
	GL.bindBuffer(GL.ARRAY_BUFFER, vertexBuffer);
	GL.bufferData(GL.ARRAY_BUFFER, vertexArray, GL.STATIC_DRAW);

	vertexNumComponents = 2;
	vertexCount = vertexArray.length / vertexNumComponents;

	currentAngle = 0;
	rotationRate = 6;
}

function handleSegmentChannelMessage(msg) {
	const response = JSON.parse(msg.data);
	const vertices = getSegmentVertices(response.pos, response.data);

	const key = coordsToSegmentKey(response.pos.x, response.pos.y);
	segmentSet[key] = {
		vertices
	};
}

function getSegmentVertices(position, blockArray) {

	console.log(position);
	return null;
}