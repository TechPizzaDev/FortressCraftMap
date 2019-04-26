using System;
using System.IO;
using WebSocketServer.Packaging;
using WebSocketSharp.Net;
using WebSocketSharp.Server;

namespace WebSocketServer
{
    class Program
    {
        private const string _wwwRoot = "WebRoot";
        private const string _packageDir = "Packages";

        private static FileHashMap _hashMap;
        private static PackageManager _packageManager;

        static void Main(string[] args)
        {
            _hashMap = new FileHashMap();

            var packageDataRoot = GetPathInRoot(string.Empty); // use empty string to get the root dir
            _packageManager = new PackageManager(packageDataRoot);

            //string packageDefDir = GetPathInRoot(_packageDir);
            //_packageManager.AddDefinitions(packageDefDir);

            var server = new HttpServer(1337);
            server.OnGet += Server_OnGet;
            server.OnPost += Server_OnPost;
            server.AddWebSocketService<SegmentBehavior>("/ws/segment");

            server.Start();

            Console.ReadKey();
        }

        private static void Server_OnPost(object s, HttpRequestEventArgs e)
        {

        }

        private static void Server_OnGet(object s, HttpRequestEventArgs e)
        {
            string url = e.Request.RawUrl;
            string packagePath = "/" + _packageDir + "/";

            if (url.StartsWith(packagePath, StringComparison.Ordinal))
            {
                string packageName = url.Remove(0, packagePath.Length);
                if (_packageManager.TryGetDefinition(packageName, out var definition))
                    ServePackage(definition, e);
                else
                    e.Response.StatusCode = (int)HttpStatusCode.NotFound;
            }
            else
            {
                if (string.IsNullOrEmpty(url) || url == "/")
                    url = "/Index.html";

                string filePath = GetPathInRoot(url);
                if (File.Exists(filePath))
                    ServeFile(filePath, e);
                else
                    e.Response.StatusCode = (int)HttpStatusCode.NotFound;
            }
        }

        private static void ServePackage(PackageDefinition definition, HttpRequestEventArgs e)
        {
            CachedPackage package = _packageManager.GetPackage(definition, _hashMap);

            e.Response.Headers[HttpResponseHeader.ETag] = package.Tag;
            if (e.Request.Headers["If-None-Match"] == package.Tag)
            {
                e.Response.StatusCode = (int)HttpStatusCode.NotModified;
                return;
            }

            e.Response.ContentType = package.Definition.MIME;
            e.Response.ContentLength64 = package.Content.Length;
            e.Response.OutputStream.Write(package.Content);
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

#if DEBUG
            // only use this if you start from the project/solution folder
            if (System.Diagnostics.Debugger.IsAttached)
            {
                if (path.StartsWith("/Source/"))
                    rootPath = "../../../../" + path;
                else
                    rootPath = "../../../../" + rootPath;
            }
#endif
            return rootPath;
        }
    }
}