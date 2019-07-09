
#ifdef GL_ES
	precision highp float;
#elif
	precision mediump float;
#endif

varying vec2 vTexCoord;

uniform sampler2D uTexture;
uniform vec4 uTint;

void main() {
	gl_FragColor = texture2D(uTexture, vTexCoord) * uTint;
}