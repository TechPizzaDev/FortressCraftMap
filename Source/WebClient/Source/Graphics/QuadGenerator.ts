
export interface QuadData {

	readonly vertices: Float32Array;

	readonly indices: Uint16Array;
}

export default class QuadGenerator {

	public static generatePlane(width: number, height: number, quadSize: number = 1): QuadData {
		const quads = width * height;
		const vertices = new Float32Array(quads * 4 * 2);
		const indices = new Uint16Array(quads * 6);

		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const i = x + y * width;

				// vertices per quad
				const vi = i * 8;
				vertices[vi + 0] = x * quadSize;
				vertices[vi + 1] = y * quadSize;

				vertices[vi + 2] = x * quadSize + quadSize;
				vertices[vi + 3] = y * quadSize;

				vertices[vi + 4] = x * quadSize;
				vertices[vi + 5] = y * quadSize + quadSize;

				vertices[vi + 6] = x * quadSize + quadSize;
				vertices[vi + 7] = y * quadSize + quadSize;

				// indices per quad
				const ii = i * 6;
				const vii = i * 4;
				indices[ii + 0] = vii;
				indices[ii + 1] = vii + 1;
				indices[ii + 2] = vii + 2;

				indices[ii + 3] = vii + 1;
				indices[ii + 4] = vii + 3;
				indices[ii + 5] = vii + 2;
			}
		}

		return { vertices, indices };
	}
}