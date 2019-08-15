
namespace TechPizza.WebMap
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

                    SendBlockOrders(orders);
                }
            }
        }

        private void SendBlockOrders(BlockOrder[] orders)
        {
            var items = new object[orders.Length];
            for (int i = 0; i < items.Length; i++)
                items[i] = CreateOrderObjects(orders[i]);

            SendMessage(ServerMessageCode.BlockOrders, items);
        }

        private void SendBlockOrders(BlockOrder order)
        {
            SendMessage(ServerMessageCode.BlockOrder, CreateOrderObjects(order));
        }

        private static object[] CreateOrderObjects(BlockOrder order)
        {
            return new object[]
            {
                order.Segment.ToArray(),
                order.Block.ToArray(),
                order.Type
            };
        }
    }
}
