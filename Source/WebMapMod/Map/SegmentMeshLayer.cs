
namespace TechPizza.WebMap
{
    public enum SegmentMeshLayer
    {
        /// <summary>
        /// This layer is the base rendered beneath everything else.
        /// </summary>
        Terrain,

        /// <summary>
        /// This layer contains blocks like Organic Rock, Plants, Grass, Trees, Ore Boulders.
        /// </summary>
        Prop,

        /// <summary>
        /// This layer contains machines. 
        /// Machines may be visible even if there are a couple of blocks above them.
        /// </summary>
        Machine
    }
}
