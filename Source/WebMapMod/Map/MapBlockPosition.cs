
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

        public object[] ToObjects()
        {
            return new object[] { X.ToString(), Z.ToString() };
        }

        public override string ToString()
        {
            return $"X:{X}, Z:{Z}";
        }
    }
}
