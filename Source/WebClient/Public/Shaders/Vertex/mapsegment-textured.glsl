
attribute vec2 aVertexPosition;
attribute vec2 aTexCoord;

uniform mat4 uModelViewProjection;

varying vec2 vTexCoord;

void main() {
	gl_Position = uModelViewProjection * vec4(aVertexPosition.x, aVertexPosition.y, -1.0, 1.0);
	vTexCoord = aTexCoord;
}