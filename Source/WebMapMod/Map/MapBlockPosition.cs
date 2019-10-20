
namespace TechPizza.WebMapMod
{
    public struct MapBlockPosition
    {
        public long X;
        public long Z;

        public int BaseX => (int)(X % 16);
        public int BaseZ => (int)(Z % 16);

        public MapSegmentPosition Segment => new MapSegmentPosition(X / 16, Z / 16);

        public MapBlockPosition(long x, long y)
        {
            X = x;
            Z = y;
        }

        public override string ToString()
        {
            return $"X:{X}, Z:{Z}";
        }
    }
}
