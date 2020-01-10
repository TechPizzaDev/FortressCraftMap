
/**
 * Various constants used through out the app.
 * */
export default class Constants {
	public static readonly resolution = 64;

	public static readonly segmentSize = 16;
	//public static readonly segmentBaseOffset = BigInt(4611686017890516992);

	// settings constants
	public static readonly requestDelayMillis = 2;

	public static readonly chunkUploadsPerFrame = {
		default: 32,
		min: 4,
		max: 128
	};

	public static readonly mapZoom = {
		default: 0.25,
		min: 0.125 / 4,
		max: 1
	};
}