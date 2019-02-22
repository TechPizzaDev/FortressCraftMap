using System;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using WebSocketSharp;

namespace WebSocketServer
{
    public class SegmentBehavior : ReflectiveWebSocketBehavior
    {
        private Random _rng = new Random();

        public SegmentBehavior()
        {
        }
        
        public void OnGetRequest(JToken request)
        {
            if (Missing(request, "pos"))
                return;

            ushort[] data = new ushort[16 * 16];
            for (int i = 0; i < data.Length; i++)
                data[i] = (ushort)_rng.Next(0, 3);
            
            Send(JsonConvert.SerializeObject(new
            {
                pos = request["pos"],
                data
            }));
        }

        protected override void OnOpen()
        {

        }

        protected override void OnClose(CloseEventArgs e)
        {

        }
    }
}
