
namespace TechPizza.WebMapMod
{
    public struct BlockOrder
    {
        public MapSegmentPosition Segment;
        public MapBlockPosition Block;
        public ushort Type;

        public BlockOrder(MapSegmentPosition segment, MapBlockPosition block, ushort tile)
        {
            Segment = segment;
            Block = block;
            Type = tile;
        }
    }
}
