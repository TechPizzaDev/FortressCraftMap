using System;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using WebSocketSharp;

namespace WebSocketServer
{
    public class SegmentBehavior : ReflectiveWebSocketBehavior
    {
        private static SimplexNoise _noise = new SimplexNoise(42);

        public SegmentBehavior()
        {
            
        }

        public void OnGetRequest(JToken request)
        {
            if (Missing(request, "pos"))
                return;

            var pos = request["pos"];
            int segX = pos["x"].ToObject<int>() * 16;
            int segY = pos["y"].ToObject<int>() * 16;

            ushort[] data = new ushort[16 * 16];
            for (int y = 0; y < 16; y++)
            {
                for (int x = 0; x < 16; x++)
                {
                    int index = y * 16 + x;
                    float noise = _noise.CalcPixel2D(segX + x, segY + y, 0.04f) / 256f;

                    data[index] = (ushort)(noise * 3);
                }
            }

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
