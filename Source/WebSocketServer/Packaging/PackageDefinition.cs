using System.IO;
using Newtonsoft.Json;

namespace WebSocketServer
{
    [JsonObject]
    public class PackageDefinition
    {
        public string Name { get; }
        public string MIME { get; }
        public string[] Files { get; }

        [JsonConstructor]
        public PackageDefinition(string name, string mime, string[] files)
        {
            Name = name;
            MIME = mime;
            Files = files;
        }
    }

}