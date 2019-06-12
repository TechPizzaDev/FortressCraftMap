using System;
using System.IO;
using WebSocketSharp.Net;
using WebSocketSharp.Server;

namespace WebSocketServer
{
    class Program
    {
        private const string _wwwRoot = "Public";

        private static FileHashMap _hashMap;

        static void Main(string[] args)
        {
            _hashMap = new FileHashMap();

            var server = new HttpServer(1337);
            server.OnGet += Server_OnGet;
            server.OnPost += Server_OnPost;
            server.AddWebSocketService<MapSocketBehavior>("/map");

            server.Start();
            Console.WriteLine("Listening on port " + server.Port);

            Console.ReadKey();
        }

        private static void Server_OnPost(object s, HttpRequestEventArgs e)
        {

        }

        private static void Server_OnGet(object s, HttpRequestEventArgs e)
        {
            string url = e.Request.RawUrl;
            if (string.IsNullOrEmpty(url) || url == "/")
                url = "/Index.html";

            string filePath = GetPathInRoot(url);
            if (File.Exists(filePath))
                ServeFile(filePath, e);
            else
                e.Response.StatusCode = (int)HttpStatusCode.NotFound;
        }

        private static void ServeFile(string path, HttpRequestEventArgs e)
        {
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

        private static string GetPathInRoot(string path)
        {
            string rootPath;
            if (!path.StartsWith("/") && !_wwwRoot.EndsWith("/"))
                rootPath = _wwwRoot + "/" + path;
            else
                rootPath = _wwwRoot + path;

//#if DEBUG
//          // only use this if you start from the project/solution folder
//          if (System.Diagnostics.Debugger.IsAttached)
//          {
                if (path.StartsWith("/Source/"))
                    rootPath = "../../../WebClient/" + path;
                else
                    rootPath = "../../../WebClient/" + rootPath;
//          }
//#endif
            return rootPath;
        }
    }
}