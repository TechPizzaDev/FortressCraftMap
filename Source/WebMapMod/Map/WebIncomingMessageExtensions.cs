using System.IO;

namespace TechPizza.WebMapMod
{
    public static class WebIncomingMessageExtensions
    {
        public static MapSegmentPosition ReadMapSegmentPosition(this BinaryReader reader)
        {
            long x = reader.ReadInt64();
            long y = reader.ReadInt64();
            long z = reader.ReadInt64();
            return new MapSegmentPosition(x, y, z);
        }
    }
}
