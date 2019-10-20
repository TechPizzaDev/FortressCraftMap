
namespace TechPizza.WebMapMod
{
    public enum ServerMessageCode : ushort
    {
        StringCode = 1,
        Error = 2,

        Segment,
        SegmentBatch,

        BlockOrder,
        BlockOrderBatch,
    }
}
