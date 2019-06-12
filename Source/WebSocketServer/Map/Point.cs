using System.Runtime.Serialization;

namespace WebSocketServer
{
    [DataContract]
    public struct Point
    {
        [DataMember] public long X;
        [DataMember] public long Y;

        public Point(long x, long y)
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
