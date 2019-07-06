using System.IO;
using Newtonsoft.Json;

namespace TechPizza.WebMap
{
    public static class JsonHelper
    {
        public static JsonSerializer Serializer { get; } = new JsonSerializer();

        public static T Deserialize<T>(Stream stream)
        {
            using (var sr = new StreamReader(stream))
            using (var jr = new JsonTextReader(sr))
                return Serializer.Deserialize<T>(jr);
        }

        public static T Deserialize<T>(string file)
        {
            using (var fs = File.OpenRead(file))
                return Deserialize<T>(fs);
        }
    }
}
