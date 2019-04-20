
namespace WebSocketServer
{
    public struct BlockOrder
    {
        public SegmentPosition Segment;
        public int X;
        public int Y;
        public ushort Tile;

        public BlockOrder(SegmentPosition segment, int x, int y, ushort tile)
        {
            Segment = segment;
            X = x;
            Y = y;
            Tile = tile;
        }
    }
}
