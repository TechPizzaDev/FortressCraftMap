using System.IO;
using WebSocketSharp.Net;
using WebSocketSharp.Server;

namespace TechPizza.WebMap
{
    public partial class HttpHost
    {
        private string _wwwRoot;
        private FileHashMap _hashMap;
        private HttpServer _server;

        public int Port { get { return _server.Port; } }

        public HttpHost(string wwwRoot, int port)
        {
            _wwwRoot = wwwRoot;
            _hashMap = new FileHashMap();

            _server = new HttpServer(port);
            _server.OnGet += Server_OnGet;
            _server.AddWebSocketService<MapSocketBehavior>("/map");
        }

        public void Start()
        {
            _server.Start();
        }

        private void Server_OnGet(object s, HttpRequestEventArgs e)
        {
            string url = e.Request.RawUrl;
            if (string.IsNullOrEmpty(url) || url == "/")
                url = "/Index.html";

#if !SERVER
            if (url == "/TerrainData.msgpack")
            {
                ServeTerrainData(e);
                return;
            }
            else if(url == "/TerrainTexture.png")
            {
                ServeTerrainTexture(e);
                return;
            }
#endif

            string filePath = GetPathInRoot(url);
            if (File.Exists(filePath))
                ServeFile(filePath, e);
            else
                e.Response.StatusCode = (int)HttpStatusCode.NotFound;
        }

        private void ServeFile(string path, HttpRequestEventArgs e)
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

        private string GetPathInRoot(string path)
        {
            string rootPath;
            if (!path.StartsWith("/") && !_wwwRoot.EndsWith("/"))
                rootPath = _wwwRoot + "/" + path;
            else
                rootPath = _wwwRoot + path;

#if SERVER
            // only use this if you start from the project/solution folder
            //if (System.Diagnostics.Debugger.IsAttached)
            //{
                if (path.StartsWith("/Source/"))
                    rootPath = "../../../WebClient/" + path;
                else
                    rootPath = "../../../WebClient/" + rootPath;
            //}
#endif

            return rootPath;
        }
    }
}
