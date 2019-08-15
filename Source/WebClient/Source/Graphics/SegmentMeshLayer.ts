
export enum SegmentMeshLayer {

	/** This layer is the base rendered beneath everything else. */
	Terrain,

	/** This layer contains blocks like Organic Rock, Plants, Grass, Trees, Ore Boulders. */
	Prop,

	/**
	 * This layer contains machines.
	 * Machines may be visible even if there are a couple of blocks above them.
	 */
	Machine
}
