
attribute vec2 aPosition;
attribute vec3 aColor;

varying vec3 vColor;

uniform mat4 uModelViewProjection;

void main() {
	gl_Position = uModelViewProjection * vec4(aPosition.x, aPosition.y, -1.0, 1.0);
	vColor = aColor;
}