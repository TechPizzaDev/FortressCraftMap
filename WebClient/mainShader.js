"use strict";
const mainShaderData = [
	{
		type: "VERTEX",
		code: `
			attribute vec2 aVertexPosition;
		
			uniform vec2 uScalingFactor;
			uniform vec2 uRotationVector;
		
			void main() {
				vec2 rotatedPosition = vec2(
					aVertexPosition.x * uRotationVector.y + aVertexPosition.y * uRotationVector.x,
					aVertexPosition.y * uRotationVector.y - aVertexPosition.x * uRotationVector.x);
		
				gl_Position = vec4(rotatedPosition * uScalingFactor, 0.0, 1.0);
			}
		`
	},
	{
		type: "FRAGMENT",
		code: `
			#ifdef GL_ES
				precision highp float;
			#endif
			
			uniform vec4 uGlobalColor;
			
			void main() {
				gl_FragColor = uGlobalColor;
			}
		`
	}
];