using System;
using System.IO;
using WebSocketSharp.Net;
using WebSocketSharp.Server;

namespace WebSocketServer
{
    class Program
    {
        static void Main(string[] args)
        {
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

#if DEBUG
            path = "../../../" + path;
#endif

            if (!File.Exists(path))
            {
                e.Response.StatusCode = (int)HttpStatusCode.NotFound;
                return;
            }

            var extension = Path.GetExtension(path);
            e.Response.ContentType = MimeMap.GetMime(extension);

            using (var fs = File.OpenRead(path))
            {
                e.Response.ContentLength64 = fs.Length;
                fs.CopyTo(e.Response.OutputStream);
            }
        }
    }
}