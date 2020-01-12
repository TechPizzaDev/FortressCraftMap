using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using WebSocketSharp;
using WebSocketSharp.Net;
using WebSocketSharp.Server;

namespace TechPizza.WebMapMod
{
    public partial class HttpHost
    {
        private static HashSet<string> CompressedExtensions { get; }

        private object CompressionSyncRoot { get; }

        private string _wwwRoot;
        private string _cachePath;
        private FileHashMap _hashMap;
        private HttpServer _server;

        public int Port { get { return _server.Port; } }

        public Action<LogData, string> LogOutput
        {
            get { return _server.Log.Output; }
            set { _server.Log.Output = value; }
        }

        public bool CompressStaticResources { get; set; } = true;

        #region Constructors

        static HttpHost()
        {
            CompressedExtensions = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                ".js",
                ".glsl",
                ".wasm",
                ".msgpack",
                ".css"
            };
        }

        public HttpHost(string wwwRoot, string cachePath, int port)
        {
            _wwwRoot = wwwRoot;
            _cachePath = cachePath;
            _hashMap = new FileHashMap();
            CompressionSyncRoot = new object();

            _server = new HttpServer(port);
            _server.OnGet += Server_OnGet;
            _server.AddWebSocketService<MapSocketBehavior>("/map");
        }

        #endregion

        public void Start()
        {
            _server.Start();
        }

        private void Server_OnGet(object s, HttpRequestEventArgs e)
        {
            string url = e.Request.RawUrl;
            if (string.IsNullOrEmpty(url) || url == "/")
                url = "/Index.html";

#if DEBUG && !SERVER
            if (url == "/Data/TerrainUV.msgpack")
            {
                ServeTerrainUV(e);
                return;
            }
            //else if(url == "/Data/TerrainTexture.png")
            //{
            //    ServeTerrainTexture(e);
            //    return;
            //}
#endif

            string filePath = GetRootPath(url);
            if (!File.Exists(filePath))
            {
                e.Response.StatusCode = (int)HttpStatusCode.NotFound;
            }
            else
            {
                string tagSuffix = "";
                string actualFilePath = filePath;
                string extension = Path.GetExtension(filePath);

                if (CompressStaticResources && CompressedExtensions.Contains(extension))
                {
                    var acceptEncoding = e.Request.Headers["Accept-Encoding"];
                    if (acceptEncoding.Contains("deflate"))
                    {
                        tagSuffix = "-deflate";
                        actualFilePath = GetCachePath(url + ".deflate");
                        e.Response.Headers[HttpResponseHeader.ContentEncoding] = "deflate";
                    }

                    bool wasChanged;
                    _hashMap.GetHash(filePath, out wasChanged);
                    if (wasChanged)
                    {
                        string cacheFile = GetCachePath(url);
                        string cacheDir = Path.GetDirectoryName(cacheFile);
                        Directory.CreateDirectory(cacheDir);

                        lock (CompressionSyncRoot)
                        {
                            using (var srcFs = File.OpenRead(filePath))
                            using (var cacheStream = File.Open(cacheFile + ".deflate", FileMode.Create))
                            using (var deflateStream = new DeflateStream(cacheStream, CompressionMode.Compress))
                                srcFs.CopyTo(deflateStream);
                        }
                    }
                }

                string mime = MimeMap.GetMime(extension);
                ServeFile(e, actualFilePath, tagSuffix, mime);
            }
        }

        private void ServeFile(
            HttpRequestEventArgs e, string filePath, string tagSuffix, string mime = null)
        {
            bool tmp;

            var hash = _hashMap.GetHash(filePath, out tmp);
            string tag = hash.Tag + tagSuffix;
            if (ValidateETag(e, tag))
                return;

            if (mime == null)
            {
                string extension = Path.GetExtension(filePath);
                mime = MimeMap.GetMime(extension);
            }
            e.Response.ContentType = mime;

            var file = new FileInfo(filePath);
            using (var fs = file.OpenRead())
            {
                e.Response.ContentLength64 = file.Length;
                fs.CopyTo(e.Response.OutputStream);
            }
        }

        private bool ValidateETag(HttpRequestEventArgs e, string tag)
        {
            e.Response.Headers[HttpResponseHeader.ETag] = tag;
            if (e.Request.Headers["If-None-Match"] == tag)
            {
                e.Response.StatusCode = (int)HttpStatusCode.NotModified;
                return true;
            }
            return false;
        }

        private string GetRootPath(string path)
        {
            string rootedPath = GetRootedPath(_wwwRoot, path);
            rootedPath = ExpandPathWhenInProject(rootedPath);
            return Path.GetFullPath(rootedPath);
        }

        private string GetCachePath(string path)
        {
            string rootedPath = GetRootedPath(_cachePath, path);
            return Path.GetFullPath(rootedPath);
        }

        private string GetRootedPath(string root, string path)
        {
            string rootedPath;
            if (!path.StartsWith("/") &&
                !root.EndsWith("/"))
                rootedPath = root + "/" + path;
            else
                rootedPath = root + path;
            return rootedPath;
        }

        /// <summary>
        /// Only use this if you start the program from the project/solution folder.
        /// </summary>
        private string ExpandPathWhenInProject(string path)
        {
#if SERVER
            return "../../../WebClient/" + path;
#else
            return path;
#endif
        }
    }
}
