using System.Runtime.Serialization;

namespace WebSocketServer
{
    [DataContract]
    public struct SegmentPosition
    {
        [DataMember] public long X;
        [DataMember] public long Y;

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
