using System;
using System.IO;
using WebSocketSharp.Net;
using WebSocketSharp.Server;

namespace WebSocketServer
{
    class Program
    {
        private static FileHashMap _hashMap;

        static void Main(string[] args)
        {
            _hashMap = new FileHashMap();

            var server = new HttpServer(1337);
            server.OnGet += Server_OnGet;
            server.OnPost += Server_OnPost;
            server.AddWebSocketService<SegmentBehavior>("/segment");

            server.Start();

            Console.ReadKey();
        }

        private static void Server_OnPost(object s, HttpRequestEventArgs e)
        {

        }

        private static void Server_OnGet(object s, HttpRequestEventArgs e)
        {
            string path = e.Request.RawUrl;
            if (path == "/")
                path = "/index.html";
            path = "WebClient" + path;

            if (System.Diagnostics.Debugger.IsAttached)
            {
                // only use this if you start from the project/solution folder
                path = "../../../" + path;
            }

            if (!File.Exists(path))
            {
                e.Response.StatusCode = (int)HttpStatusCode.NotFound;
                return;
            }

            var file = new FileInfo(path);
            var hash = _hashMap.GetHash(file);
            
            e.Response.Headers[HttpResponseHeader.ETag] = hash.Tag;
            if (e.Request.Headers["If-None-Match"] == hash.Tag)
            {
                e.Response.StatusCode = (int)HttpStatusCode.NotModified;
                return;
            }

            var extension = Path.GetExtension(path);
            e.Response.ContentType = MimeMap.GetMime(extension);

            using (var fs = file.OpenRead())
            {
                e.Response.ContentLength64 = file.Length;
                fs.CopyTo(e.Response.OutputStream);
            }
        }
    }
}