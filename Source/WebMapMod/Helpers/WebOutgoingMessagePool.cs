using System.Collections.Generic;

namespace TechPizza.WebMapMod
{
    public static class WebOutgoingMessagePool
    {
        private static Stack<WebOutgoingMessage> _pool = new Stack<WebOutgoingMessage>();
        
        public static WebOutgoingMessage Rent()
        {
            lock (_pool)
            {
                if (_pool.Count > 0)
                    return _pool.Pop();
            }
            return new WebOutgoingMessage();
        }

        public static void Return(WebOutgoingMessage writer)
        {
            if (writer == null)
                return;

            lock (_pool)
            {
                if (_pool.Count < 8)
                {
                    writer.Flush();
                    writer.Memory.SetLength(0);
                    _pool.Push(writer);
                }
            }
        }
    }
}
