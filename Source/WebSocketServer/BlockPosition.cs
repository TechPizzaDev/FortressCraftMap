using Newtonsoft.Json;

namespace WebSocketServer
{
    [JsonObject]
    public struct BlockPosition
    {
        public long X;
        public long Y;

        [JsonConstructor]
        public BlockPosition(long x, long y)
        {
            X = x;
            Y = y;
        }

        public override string ToString()
        {
            return $"X:{X}, Y:{Y}";
        }
    }
}
