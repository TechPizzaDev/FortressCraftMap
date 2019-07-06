
#ifdef GL_ES
	precision highp float;
#elif
	precision mediump float;
#endif

uniform vec4 uTint;

varying vec3 vColor;

void main() {
	gl_FragColor = vec4(vColor, 1) * uTint;
}