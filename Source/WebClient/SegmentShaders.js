"use strict";
const texturedSegmentShaderSource = [
	{
		type: "VERTEX",
		data: `
			attribute vec2 aVertexPosition;
			attribute vec2 aTexCoord;

			uniform mat4 uModelViewProjection;

			varying vec2 vTexCoord;
			
			void main() {
				gl_Position = uModelViewProjection * vec4(aVertexPosition.x, aVertexPosition.y, -1.0, 1.0);
				vTexCoord = aTexCoord;
			}
		`
	},
	{
		type: "FRAGMENT",
		data: `
			#ifdef GL_ES
				precision highp float;
			#elif
				precision mediump float;
			#endif

			uniform sampler2D uTextureSampler;
			uniform vec4 uGlobalColor;

			varying vec2 vTexCoord;
			
			void main() {
				gl_FragColor = texture2D(uTextureSampler, vTexCoord) * uGlobalColor;
			}
		`
	}
];

const coloredSegmentShaderSource = [
	{
		type: "VERTEX",
		data: `
			attribute vec2 aVertexPosition;
			attribute vec3 aColor;

			uniform mat4 uModelViewProjection;

			varying vec3 vColor;
			
			void main() {
				gl_Position = uModelViewProjection * vec4(aVertexPosition.x, aVertexPosition.y, -1.0, 1.0);
				vColor = aColor;
			}
		`
	},
	{
		type: "FRAGMENT",
		data: `
			#ifdef GL_ES
				precision highp float;
			#elif
				precision mediump float;
			#endif

			uniform vec4 uGlobalColor;

			varying vec3 vColor;
			
			void main() {
				gl_FragColor = vec4(vColor, 1) * uGlobalColor;
			}
		`
	}
];