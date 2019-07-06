using Newtonsoft.Json;

namespace TechPizza.WebMap
{
    public static class JsonExtensions
    {
        public static bool TryParseJson<T>(this string value, out T result)
        {
            bool success = true;
            var settings = new JsonSerializerSettings
            {
                Error = (s, args) =>
                {
                    success = false;
                    args.ErrorContext.Handled = true;
                },
                MissingMemberHandling = MissingMemberHandling.Ignore
            };
            result = JsonConvert.DeserializeObject<T>(value, settings);
            return success;
        }
    }
}
