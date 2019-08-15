using System;
using System.Collections.Generic;
using System.Net;
using System.Threading;
using WebSocketSharp;

namespace TechPizza.WebMap
{
    public partial class MapSocketBehavior : AttributedWebSocketBehavior
    {
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

            _tileArray = new ushort[16 * 16];
            _loadedSegments = new List<MapSegmentPosition>();
        }

        [MessageHandler]
        public void GetSegment(List<object> pos)
        {
            if (Missing(pos))
                return;

            long segX;
            long segY;
            if (!long.TryParse(pos[0].ToString(), out segX) ||
                !long.TryParse(pos[1].ToString(), out segY))
            {
                SendError("Failed to parse segment position.");
                return;
            }

            var segPosition = new MapSegmentPosition(segX, segY);
            int blockX = (int)(segPosition.X + 100) * 16;
            int blockZ = (int)(segPosition.Z + 100) * 16;

            for (int z = 0; z < 16; z++)
            {
                for (int x = 0; x < 16; x++)
                {
                    int index = x + z * 16;
                    float noise = _noise.CalcPixel2D(blockX + x, blockZ + z, 0.05f) / 256f;
                    _tileArray[index] = (ushort)(noise > 0.33f ? 680 : 568); // eCubeTypes.AblatedResin : eCubeTypes.HardenedResin;
                }
            }

            lock (_loadedSegments)
                _loadedSegments.Add(segPosition);

            SendMessage(ServerMessageCode.Segment, new object[] 
            {
                segPosition.ToArray(),
                _tileArray
            });
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