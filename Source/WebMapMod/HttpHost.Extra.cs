using System;
using System.IO;
using GameDevWare.Serialization;
using WebSocketSharp.Net;
using WebSocketSharp.Server;

namespace TechPizza.WebMapMod
{
    public partial class HttpHost
    {
        private readonly object _terrainUVBuildMutex = new object();
        private MemoryStream _cachedTerrainUV;

        private void ServeTerrainUV(HttpRequestEventArgs e)
        {
            lock (_terrainUVBuildMutex)
                BuildTerrainUV();

            if (_cachedTerrainUV.Length == 0)
            {
                e.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
                return;
            }

            long length = _cachedTerrainUV.Length;
            byte[] data = _cachedTerrainUV.GetBuffer();
            
            e.Response.ContentType = MimeMap.AppOctetStream;
            e.Response.ContentLength64 = length;
            e.Response.OutputStream.Write(data, 0, (int)length);
        }

        private void BuildTerrainUV()
        {
            if (_cachedTerrainUV != null)
                return;

            var mem = new MemoryStream();
            try
            {
                int entryCount = 0;
                for (int i = 0; i < TerrainData.mEntries.Length; i++)
                    if (TerrainData.mEntries[i] != null)
                        entryCount++;

                ushort[] indices = new ushort[entryCount];
                for (int i = 0, j = 0; i < TerrainData.mEntries.Length; i++)
                {
                    if (TerrainData.mEntries[i] != null)
                        indices[j++] = TerrainData.mEntries[i].CubeType;
                }

                var creator = SegmentMeshCreator.instance;
                var renderer = creator.mMeshRenderer;
                var terrainUV = renderer.segmentUVCoord;
                float texWidth = renderer.materialWidth;
                float texHeight = renderer.materialHeight;

                var rects = new float[entryCount * 4];
                for (int i = 0; i < indices.Length; i++)
                {
                    var entry = TerrainData.mEntries[indices[i]];
                    int topTexture = entry.TopTexture;
                    //int guiTexture = entry.GUITexture;

                    var rect = terrainUV.GetSprite(topTexture);
                    rects[i] = rect.x / texWidth;
                    rects[i + entryCount] = rect.y / texHeight;
                    rects[i + entryCount * 2] = (rect.x + rect.height) / texWidth;
                    rects[i + entryCount * 3] = (rect.y + rect.width) / texHeight;
                }

                MsgPack.Serialize(new object[] { indices, rects }, mem);
            }
            catch (Exception exc)
            {
                mem.SetLength(0);
                WebMapMod.LogWarning("Failed to build terrain UV data: " + exc);
            }
            _cachedTerrainUV = mem;
        }

        //private void ServeTerrainTexture(HttpRequestEventArgs e)
        //{
        //    byte[] data = WebMapMod.Instance.TerrainPng;
        //    if (ValidateETag(e, WebMapMod.Instance.TerrainPngETag))
        //        return;
        //
        //    e.Response.ContentType = MimeMap.GetMime(".png");
        //    e.Response.ContentLength64 = data.Length;
        //    e.Response.OutputStream.Write(data, 0, data.Length);
        //}
    }
}
