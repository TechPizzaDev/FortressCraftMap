"use strict";
const mainShaderData = [
	{
		type: "VERTEX",
		code: `
			attribute vec2 aVertexPosition;
			attribute vec2 aTexCoord;

			uniform mat4 uViewMatrix;
			uniform mat4 uWorldMatrix;
			uniform mat4 uTransformMatrix;

			varying vec2 vTexCoord;
		
			void main() {
				gl_Position = uViewMatrix * uWorldMatrix * uTransformMatrix * vec4(aVertexPosition.x, aVertexPosition.y, -0.5, 1.0);
				vTexCoord = aTexCoord;
			}
		`
	},
	{
		type: "FRAGMENT",
		code: `
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