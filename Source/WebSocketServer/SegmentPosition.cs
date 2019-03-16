
using Newtonsoft.Json;

namespace WebSocketServer
{
    public struct SegmentPosition
    {
        [JsonProperty("x")] public int X;
        [JsonProperty("y")] public int Y;

        public SegmentPosition(int x, int y)
        {
            X = x;
            Y = y;
        }
    }
}
