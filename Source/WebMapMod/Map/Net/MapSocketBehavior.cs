using System;
using System.Collections.Generic;
using System.Net;
using System.Threading;
using WebSocketSharp;

namespace TechPizza.WebMap
{
    public partial class MapSocketBehavior : AttributedWebSocketBehavior
    {
        public const int SegmentSize = 16;
        public const int MaxSegmentsRequestsPerBatch = 64;

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
        
        private bool ParsePosition(
            List<object> position, out MapSegmentPosition segmentPosition)
        {
            long segX;
            long segZ;
            if (long.TryParse(position[0].ToString(), out segX) &&
                long.TryParse(position[1].ToString(), out segZ))
            {
                segmentPosition = new MapSegmentPosition(segX, segZ);
                return true;
            }

            segmentPosition = default(MapSegmentPosition);
            SendError(position, "Failed to parse segment position.");
            return false;
        }

        private void GetTiles(MapSegmentPosition segPos, ushort[] output)
        {
            int blockX = (int)(segPos.X + 100) * SegmentSize;
            int blockZ = (int)(segPos.Z + 100) * SegmentSize;

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
        public void GetSegment(List<object> position)
        {
            MapSegmentPosition segPos;
            if (Missing(position) || !ParsePosition(position, out segPos))
                return;

            GetTiles(segPos, _tileArray);

            lock (_loadedSegments)
                _loadedSegments.Add(segPos);

            SendMessage(ServerMessageCode.Segment, GetArray(segPos, _tileArray));
        }

        [MessageHandler]
        public void GetSegmentBatch(List<object> positions)
        {
            if (Missing(positions))
                return;

            if (positions.Count > MaxSegmentsRequestsPerBatch)
                SendError(positions, "Request too large.");

            foreach (var pos in positions)
            {
                if (!(pos is List<object>))
                {
                    SendError(positions, "Invalid segment position request.");
                    return;
                }
            }

            if (positions.Count == 1)
            {
                GetSegment((List<object>)positions[0]);
                return;
            }

            MapSegmentPosition segPos;
            var body = new object[positions.Count][];
            for (int i = 0; i < positions.Count; i++)
            {
                if(!ParsePosition((List<object>)positions[i], out segPos))
                    return;

                // TODO: pool this kind of arrays
                var tiles = new ushort[SegmentSize * SegmentSize];
                GetTiles(segPos, tiles);
                body[i] = GetArray(segPos, tiles);
            }
            SendMessage(ServerMessageCode.SegmentBatch, body);
        }

        private static object[] GetArray(MapSegmentPosition segPos, object obj)
        {
            return new object[]
            {
                segPos.ToArray(),
                obj
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