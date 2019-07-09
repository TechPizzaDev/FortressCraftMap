
attribute vec2 aPosition;
attribute vec2 aTexCoord;

varying vec2 vTexCoord;

uniform mat4 uModelViewProjection;

void main() {
	gl_Position = uModelViewProjection * vec4(aPosition.x, aPosition.y, -1.0, 1.0);
	vTexCoord = aTexCoord;
}