
namespace TechPizza.WebMapMod
{
    public partial class MapSocketBehavior
    {
        private void TimerCallBack(object state)
        {
            lock (_loadedSegments)
            {
                if (_loadedSegments.Count <= 0)
                    return;

                var orders = new BlockOrder[_rng.Next(6, 12)];
                for (int j = 0; j < 1; j++)
                {
                    MapSegmentPosition randomSeg = _loadedSegments[_rng.Next(_loadedSegments.Count)];

                    ushort type = (ushort)(_rng.Next(3) == 1 ? 680 : 568); // (ushort)(_rng.Next(11) + 210);
                    for (int i = 0; i < orders.Length; i++)
                    {
                        var randomBlock = new MapBlockPosition(_rng.Next(16), _rng.Next(16));
                        orders[i] = new BlockOrder(randomSeg, randomBlock, type);
                    }

                    SendBlockOrderBatch(orders);
                }
            }
        }

        private WebOutgoingMessage SendBlockOrderBatch(BlockOrder[] orders)
        {
            var message = CreateMessage(ServerMessageCode.BlockOrderBatch);
            message.Write((byte)orders.Length);
            for (int i = 0; i < orders.Length; i++)
                WriteBlockOrder(message, orders[i]);
            return message;
        }

        private WebOutgoingMessage SendBlockOrder(BlockOrder order)
        {
            var message = CreateMessage(ServerMessageCode.BlockOrder);
            WriteBlockOrder(message, order);
            return message;
        }

        private static void WriteBlockOrder(WebOutgoingMessage message, BlockOrder order)
        {
            message.Write(order.Segment);
            message.Write(order.Block);
            message.Write(order.Type);
        }
    }
}
