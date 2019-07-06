
namespace TechPizza.WebMap
{
    public struct MapSegmentPosition
    {
        public long X;
        public long? Y;
        public long Z;

        public MapSegmentPosition(long x, long? y, long z)
        {
            X = x;
            Y = y;
            Z = z;
        }

        public MapSegmentPosition(long x, long z) : this(x, 0, z)
        {
        }

        public object[] ToObjects()
        {
            if(!Y.HasValue)
                return new object[] { X.ToString(), Z.ToString() };
            return new object[] { X.ToString(), Y.Value.ToString(), Z.ToString() };
        }

        public override string ToString()
        {
            return $"X:{X}, Y:{Y}, Z:{Z}";
        }
    }
}
