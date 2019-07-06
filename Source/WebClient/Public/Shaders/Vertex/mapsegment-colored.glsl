
attribute vec2 aVertexPosition;
attribute vec3 aColor;

uniform mat4 uModelViewProjection;

varying vec3 vColor;

void main() {
	gl_Position = uModelViewProjection * vec4(aVertexPosition.x, aVertexPosition.y, -1.0, 1.0);
	vColor = aColor;
}