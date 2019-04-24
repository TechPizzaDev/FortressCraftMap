
using Newtonsoft.Json;

namespace WebSocketServer
{
    [JsonObject]
    public struct SegmentPosition
    {
        [JsonProperty("x")] public long X;
        [JsonProperty("y")] public long Y;

        [JsonConstructor]
        public SegmentPosition(long x, long y)
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
