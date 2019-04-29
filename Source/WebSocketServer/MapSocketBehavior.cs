using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Net;
using System.Threading;
using WebSocketSharp;

namespace WebSocketServer
{
    public class MapSocketBehavior : AttributedWebSocketBehavior
    {
        private static SimplexNoise _noise = new SimplexNoise(42);
        private static Random _rng = new Random();

        private IPEndPoint _endpoint;
        private ushort[] _tileArray;
        private List<SegmentPosition> _loadedSegments;

        public MapSocketBehavior()
        {
            _tileArray = new ushort[16 * 16];
            _loadedSegments = new List<SegmentPosition>();
        }

        [MessageHandler]
        public void GetSegment(JToken request)
        {
            if (Missing(request, "p", out var position))
                return;

            var array = position as JArray;
            int segX = array[0].ToObject<int>() * 16;
            int segY = array[1].ToObject<int>() * 16;
            for (int y = 0; y < 16; y++)
            {
                for (int x = 0; x < 16; x++)
                {
                    int index = y * 16 + x;
                    float noise = _noise.CalcPixel2D(segX + x, segY + y, 0.0075f) / 256f;
                    _tileArray[index] = (ushort)(noise * 11 + 210);
                }
            }

            lock (_loadedSegments)
                _loadedSegments.Add(new SegmentPosition(segX / 16, segY / 16));

            SendAsJson(new
            {
                code = MessageCode.BlockOrders,
                pos = new[] { segX, segY },
                tiles = _tileArray
            });
        }

        private Timer _timer;

        private void TimerCallBack(object state)
        {
            lock (_loadedSegments)
            {
                if (_loadedSegments.Count <= 0)
                    return;

                var orders = new BlockOrder[_rng.Next(6, 10)];
                for (int j = 0; j < 1; j++)
                {
                    SegmentPosition randomPos = _loadedSegments[_rng.Next(_loadedSegments.Count)];

                    int tile = _rng.Next(11) + 210;
                    for (int i = 0; i < orders.Length; i++)
                    {
                        int x = _rng.Next(16);
                        int y = _rng.Next(16);

                        orders[i] = new BlockOrder(randomPos, x, y, (ushort)tile);
                    }

                    SendBlockOrders(orders);
                }
            }
        }

        private void SendBlockOrders(BlockOrder[] orders)
        {
            var items = new object[orders.Length];
            for (int i = 0; i < items.Length; i++)
                items[i] = CreateBlockOrderObj(orders[i]);
            
            SendAsJson(new
            {
                code = MessageCode.BlockOrders,
                orders = items
            });
        }

        private void SendBlockOrder(BlockOrder order)
        {
            SendAsJson(new
            {
                code = MessageCode.BlockOrders,
                orders = new[] { CreateBlockOrderObj(order) }
            });
        }

        private static object CreateBlockOrderObj(BlockOrder order)
        {
            return new
            {
                s = new[] { order.Segment.X, order.Segment.Y },
                p = new[] { order.X, order.Y },
                t = order.Tile
            };
        }

        protected override void OnOpen()
        {
            _endpoint = Context.UserEndPoint;
            Console.WriteLine("Map Behavior connected: " + _endpoint);

            _timer = new Timer(TimerCallBack, null, 2000, 4000);
        }

        protected override void OnClose(CloseEventArgs e)
        {
            Console.WriteLine($"Map Behavior disconnected: " + _endpoint);

            _timer.Dispose();
        }
    }
}
