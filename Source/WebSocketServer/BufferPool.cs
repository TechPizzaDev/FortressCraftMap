using System.Collections.Generic;

namespace WebSocketServer
{
    public class BufferPool
    {
        private static List<byte[]> _pool = new List<byte[]>();
        public const int DefaultBufferSize = 1024 * 8;
        
        public static byte[] Rent()
        {
            lock (_pool)
            {
                if (_pool.Count > 0)
                {
                    int index = _pool.Count - 1;
                    byte[] buffer = _pool[index];
                    _pool.RemoveAt(index);
                    return buffer;
                }
                return new byte[DefaultBufferSize];
            }
        }
    
        public static void Return(byte[] buffer)
        {
            lock (_pool)
            {
                if(_pool.Count < 16)
                    _pool.Add(buffer);
            }
        }
    }
}
