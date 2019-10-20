using System.IO;

namespace TechPizza.WebMapMod
{
    public static class WebOutgoingMessageExtensions
    {
        public static void Write(this BinaryWriter message, MapSegmentPosition position)
        {
            message.Write(position.X);
            message.Write(position.Y);
            message.Write(position.Z);
        }

        public static void Write(this BinaryWriter message, MapBlockPosition position)
        {
            message.Write(position.X);
            message.Write(position.Z);
        }
    }
}
