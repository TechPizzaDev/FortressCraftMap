
namespace TechPizza.WebMap
{
    public struct MapBlockPosition
    {
        public long X;
        public long Z;

        public MapSegmentPosition Segment => new MapSegmentPosition(X / 16, Z / 16);

        public MapBlockPosition(long x, long y)
        {
            X = x;
            Z = y;
        }

        public long[] ToArray()
        {
            return new long[] { X, Z };
        }

        public byte[] ToBaseArray()
        {
            return new byte[] { (byte)(X % 16), (byte)(Z % 16) };
        }

        public override string ToString()
        {
            return $"X:{X}, Z:{Z}";
        }
    }
}
