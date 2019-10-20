
namespace TechPizza.WebMapMod
{
    public enum ClientMessageCode : ushort
    {
        StringCode = 1,
        Error = 2,

        GetSegment,
        GetSegmentBatch
    }
}
