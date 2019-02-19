
namespace WebSocketServer
{
    public struct Point
    {
        public long X;
        public long Y;

        public override string ToString()
        {
            return $"X:{X}, Y:{Y}";
        }
    }
}
