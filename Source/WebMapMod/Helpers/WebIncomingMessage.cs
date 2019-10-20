using System.IO;

namespace TechPizza.WebMapMod
{
    public class WebIncomingMessage : BinaryReader
    {
        public WebIncomingMessage(Stream stream) : base(stream)
        {
        }
    }
}
