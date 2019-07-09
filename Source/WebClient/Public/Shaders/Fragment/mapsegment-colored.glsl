
#ifdef GL_ES
	precision highp float;
#elif
	precision mediump float;
#endif

varying vec3 vColor;

uniform vec4 uTint;

void main() {
	gl_FragColor = vec4(vColor, 1) * uTint;
}