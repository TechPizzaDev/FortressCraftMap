﻿using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Net;
using System.Threading;
using WebSocketSharp;

namespace WebSocketServer
{
    public class SegmentBehavior : ReflectiveWebSocketBehavior
    {
        private static SimplexNoise _noise = new SimplexNoise(42);
        private static Random _rng = new Random();

        private IPEndPoint _endpoint;
        private ushort[] _tileArray;
        private List<SegmentPosition> _loadedSegments;

        public SegmentBehavior()
        {
            _tileArray = new ushort[16 * 16];
            _loadedSegments = new List<SegmentPosition>();
        }

        public void OnGetMessage(JToken request)
        {
            if (Missing(request, "position", out var position))
                return;

            int segX = position["x"].ToObject<int>() * 16;
            int segY = position["y"].ToObject<int>() * 16;
            for (int y = 0; y < 16; y++)
            {
                for (int x = 0; x < 16; x++)
                {
                    int index = y * 16 + x;
                    float noise = _noise.CalcPixel2D(segX + x, segY + y, 0.0075f) / 256f;
                    _tileArray[index] = (ushort)(noise * 11 + 210);
                }
            }

            SendAsJson(new
            {
                type = "segment",
                position,
                tiles = _tileArray
            });

            lock (_loadedSegments)
                _loadedSegments.Add(new SegmentPosition(segX / 16, segY / 16));
        }

        private Timer _timer;

        private void TimerCallBack(object state)
        {
            lock (_loadedSegments)
            {
                if (_loadedSegments.Count <= 0)
                    return;

                var orders = new BlockOrder[8];
                for (int j = 0; j < 2; j++)
                {
                    SegmentPosition randomPos = _loadedSegments[_rng.Next(_loadedSegments.Count)];

                    int tile = _rng.Next(11) + 210;
                    for (int i = 0; i < orders.Length; i++)
                    {
                        int x = _rng.Next(16);
                        int y = _rng.Next(16);

                        orders[i] = new BlockOrder(randomPos, x, y, (ushort)tile);
                    }

                    SendBlockOrder(orders);
                }
            }
        }

        private void SendBlockOrder(BlockOrder[] orders)
        {
            var items = new object[orders.Length];
            for (int i = 0; i < items.Length; i++)
                items[i] = CreateBlockOrderObj(orders[i]);
            
            SendAsJson(new
            {
                type = "blockorders",
                orders = items
            });
        }

        private void SendBlockOrder(BlockOrder order)
        {
            SendAsJson(new
            {
                type = "blockorders",
                orders = new[] { CreateBlockOrderObj(order) }
            });
        }

        private object CreateBlockOrderObj(BlockOrder order)
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
            Console.WriteLine("SegmentBehavior connected at " + _endpoint);

            _timer = new Timer(TimerCallBack, null, 1000, 100);
        }

        protected override void OnClose(CloseEventArgs e)
        {
            Console.WriteLine($"SegmentBehavior at {_endpoint} disconnected");

            _timer.Dispose();
        }
    }
}
