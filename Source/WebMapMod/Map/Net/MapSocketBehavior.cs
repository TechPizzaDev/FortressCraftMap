using System;
using System.Collections.Generic;
using System.Net;
using System.Threading;
using WebSocketSharp;

namespace TechPizza.WebMapMod
{
    public partial class MapSocketBehavior : AttributedWebSocketBehavior
    {
        public const int SegmentSize = 16;
        public const int MaxSegmentsRequestsPerBatch = 255;

        private static SimplexNoise _noise = new SimplexNoise(250); // 0 for equality between mono and net35
        private static Random _rng = new Random();

        private Timer _tmpBlockOrderTimer;
        private IPEndPoint _endpoint;

        private ushort[] _tileArray;
        private List<MapSegmentPosition> _loadedSegments;

        public MapSocketBehavior() : base(
            codeTypeDefinition: new CodeEnumDefinition(typeof(ClientMessageCode), typeof(ServerMessageCode)))
        {
#if DEBUG
            VerboseDebug = true;
#else
            VerboseDebug = false;
#endif

            _tileArray = new ushort[SegmentSize * SegmentSize];
            _loadedSegments = new List<MapSegmentPosition>();
        }

        private void GetTiles(MapSegmentPosition position, ushort[] output)
        {
            int blockX = (int)(position.X + 100) * SegmentSize;
            int blockZ = (int)(position.Z + 100) * SegmentSize;

            for (int z = 0; z < SegmentSize; z++)
            {
                for (int x = 0; x < SegmentSize; x++)
                {
                    int index = x + z * SegmentSize;
                    float noise = _noise.CalcPixel2D(blockX + x, blockZ + z, 0.015f) / 256f;

                    output[index] = (ushort)(noise * 3 + 2);
                    // (ushort)(noise > 0.33f ? 680 : 568); // eCubeTypes.AblatedResin : eCubeTypes.HardenedResin;
                }
            }
        }

        [MessageHandler]
        public WebOutgoingMessage GetSegment(WebIncomingMessage reader)
        {
            var position = reader.ReadMapSegmentPosition();
            GetTiles(position, _tileArray);

            lock (_loadedSegments)
                _loadedSegments.Add(position);

            var message = CreateMessage(ServerMessageCode.Segment);

            message.Write(position);
            for (int i = 0; i < _tileArray.Length; i++)
                message.Write(_tileArray[i]);

            return message;
        }

        [MessageHandler]
        public WebOutgoingMessage GetSegmentBatch(WebIncomingMessage message)
        {
            int count = message.ReadByte();
            if (count == 0)
                return ErrorMessage("Empty segment batch request.");

            if (count > MaxSegmentsRequestsPerBatch)
                return ErrorMessage("Segment batch request too large.");

            if (count == 1)
                return GetSegment(message);

            var result = CreateMessage(ServerMessageCode.SegmentBatch);
            result.Write((byte)count);

            for (int i = 0; i < count; i++)
            {
                var position = message.ReadMapSegmentPosition();
                
                // TODO: pool this kind of arrays
                var tiles = new ushort[SegmentSize * SegmentSize];
                GetTiles(position, tiles);

                result.Write(position);
                for (int t = 0; t < tiles.Length; t++)
                    result.Write(tiles[t]);
            }
            return result;
        }

        protected WebOutgoingMessage CreateMessage(ServerMessageCode code)
        {
            return CreateMessage((ushort)code);
        }

        protected override void OnOpen()
        {
            base.OnOpen();

            _endpoint = Context.UserEndPoint;
            WebMapMod.Log("Map Behavior connected: " + _endpoint);

            _tmpBlockOrderTimer = new Timer(TimerCallBack, null, 2000, 4000);
        }

        protected override void OnClose(CloseEventArgs e)
        {
            WebMapMod.Log($"Map Behavior disconnected: " + _endpoint);

            _tmpBlockOrderTimer.Dispose();
        }
    }
}