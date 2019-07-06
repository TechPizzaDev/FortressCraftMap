using System;
using System.Collections.Generic;

namespace TechPizza.WebMap
{
    public static class MimeMap
    {
        private static Dictionary<string, string> _map;
        public static string AppOctetStream = "application/octet-stream";

        static MimeMap()
        {
            _map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                { ".html", "text/html" },
	            { ".js", "application/javascript" },
	            { ".png", "image/png" },
                { ".glsl", "text/plain" },
                { ".css", "text/css" }
            };
        }

        public static string GetMime(string extension)
        {
            string mime;
            if (_map.TryGetValue(extension, out mime))
                return mime;
            return AppOctetStream;
        }
    }
}
