using System.Collections.Generic;

namespace TechPizza.WebMapMod
{
    public class BufferPool
    {
        private static Stack<byte[]> _pool = new Stack<byte[]>();
        public const int DefaultBufferSize = 1024 * 16;
        
        public static byte[] Rent()
        {
            lock (_pool)
            {
                if (_pool.Count > 0)
                    return _pool.Pop();
                return new byte[DefaultBufferSize];
            }
        }

        public static void Return(byte[] buffer)
        {
            if (buffer == null)
                return;

            lock (_pool)
            {
                if(_pool.Count < 16)
                    _pool.Push(buffer);
            }
        }
    }
}
