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

        private Timer _timer;
        private IPEndPoint _endpoint;

        private ushort[] _tileArray;
        private List<SegmentPosition> _loadedSegments;

        public MapSocketBehavior() : base(
            codeTypeDefinition: new CodeEnumDefinition(typeof(ClientMessageCode), typeof(ServerMessageCode)))
        {
#if DEBUG
            VerboseDebug = true;
#else
            VerboseDebug = false;
#endif

            _tileArray = new ushort[16 * 16];
            _loadedSegments = new List<SegmentPosition>();
        }

        [MessageHandler]
        public void GetSegment(List<object> pos)
        {
            if (Missing(pos))
                return;

            int segX = pos[0].ToInt32() * 16;
            int segY = pos[1].ToInt32() * 16;
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

            SendMessage(ServerMessageCode.Segment, new
            {
                pos = new[] { segX, segY },
                tiles = _tileArray
            });
        }

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
                items[i] = CreateBlockOrderObject(orders[i]);

            SendMessage(ServerMessageCode.BlockOrders, items);
        }

        private void SendBlockOrder(BlockOrder order)
        {
            SendMessage(ServerMessageCode.BlockOrder, CreateBlockOrderObject(order));
        }

        private static object[] CreateBlockOrderObject(BlockOrder order)
        {
            return new object[]
            {
                new[] { order.Segment.X, order.Segment.Y },
                new[] { order.X, order.Y },
                order.Tile
            };
        }

        protected void SendMessage<T>(ServerMessageCode code, T body)
        {
            SendMessage((int)code, body);
        }

        protected override void OnOpen()
        {
            base.OnOpen();

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
