using System;
using System.Collections.Generic;

namespace WebSocketServer
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
	            { ".png", "image/png" }
            };
        }

        public static string GetMime(string extension)
        {
            if (_map.TryGetValue(extension, out string mime))
                return mime;
            return AppOctetStream;
        }
    }
}
