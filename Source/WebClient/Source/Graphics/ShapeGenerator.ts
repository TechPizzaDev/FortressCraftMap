import { vec2 } from "gl-matrix";

export interface QuadData {

	readonly vertices: Float32Array;
	readonly indices: Uint16Array;
}

export interface RectangularShape extends QuadData {
	readonly width: number;
	readonly height: number;
}

export interface QuadDataMetrics {
	readonly quadCount: number,
	readonly vertexCount: number,
	readonly indexCount: number
}

export default class ShapeGenerator {

	/**
	 * Creates an empty plane. Useful for creating a buffer object for plane generation.
	 * @param width
	 * @param height
	 */
	public static createPlane(width: number, height: number): RectangularShape {
		const metrics = this.getQuadMetrics(width, height);
		const vertices = new Float32Array(metrics.vertexCount * 2);
		const indices = new Uint16Array(metrics.indexCount);
		return { width, height, vertices, indices };
	}

	public static getQuadMetrics(width: number, height: number): QuadDataMetrics {
		const quadCount = width * height;
		return {
			quadCount,
			vertexCount: quadCount * 4,
			indexCount: quadCount * 6
		}
	}

	/**
	 * 
	 * @param width
	 * @param height
	 * @param offset
	 * @param quadSize
	 * @param existing Optional plane of the same dimensions to be filled with data and returned.
	 */
	public static generatePlane(
		width: number, height: number, offset: vec2, quadSize: number = 1, existing?: RectangularShape
	): RectangularShape {
		if (existing != null) {
			if (existing.width != width)
				throw new Error("The 'existing' width does not equal new 'width'.");

			if (existing.height != height)
				throw new Error("The 'existing' height does not equal new 'height'.");
		}

		const metrics = this.getQuadMetrics(width, height);
		const vertices = existing ? existing.vertices : new Float32Array(metrics.vertexCount * 2);
		const indices = existing ? existing.indices : new Uint16Array(metrics.indexCount);
		
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const i = x + y * width;

				// vertices per quad
				const vi = i * 8;
				vertices[vi + 0] = offset[0] + x * quadSize;
				vertices[vi + 1] = offset[1] + y * quadSize;

				vertices[vi + 2] = offset[0] + x * quadSize + quadSize;
				vertices[vi + 3] = offset[1] + y * quadSize;

				vertices[vi + 4] = offset[0] + x * quadSize;
				vertices[vi + 5] = offset[1] + y * quadSize + quadSize;

				vertices[vi + 6] = offset[0] +  x * quadSize + quadSize;
				vertices[vi + 7] = offset[1] +  y * quadSize + quadSize;

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

		if (existing)
			return existing;
		return { width, height, vertices, indices };
	}
}