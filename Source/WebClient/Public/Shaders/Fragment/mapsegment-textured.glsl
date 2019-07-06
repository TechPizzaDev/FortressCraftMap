
#ifdef GL_ES
	precision highp float;
#elif
	precision mediump float;
#endif

uniform sampler2D uTextureSampler;
uniform vec4 uTint;

varying vec2 vTexCoord;

void main() {
	gl_FragColor = texture2D(uTextureSampler, vTexCoord) * uTint;
}