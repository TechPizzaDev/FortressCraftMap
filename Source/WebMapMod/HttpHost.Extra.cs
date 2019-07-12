using System.IO;
using GameDevWare.Serialization;
using WebSocketSharp.Server;

namespace TechPizza.WebMap
{
    public partial class HttpHost
    {
        private void ServeTerrainData(HttpRequestEventArgs e)
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

            var rects = new float[entryCount * 4];
            for (int i = 0; i < indices.Length; i++)
            {
                var entry = TerrainData.mEntries[indices[i]];
                int topTexture = entry.TopTexture;
                //int guiTexture = entry.GUITexture;

                var rect = WebMapMod.Instance.TerrainUV.GetSprite(topTexture);
                rects[i] = rect.x;
                rects[i + entryCount] = rect.y;
                rects[i + entryCount * 2] = rect.height;
                rects[i + entryCount * 3] = rect.width;
            }

            long length;
            byte[] data;
            using (var mem = new MemoryStream())
            {
                var info = new {
                    terrainTextureScale = WebMapMod.TerrainTextureScale
                };
                MsgPack.Serialize(new object[] { info, indices, rects }, mem);
                length = mem.Length;
                data = mem.GetBuffer();
            }

            e.Response.ContentType = MimeMap.AppOctetStream;
            e.Response.ContentLength64 = length;
            e.Response.OutputStream.Write(data, 0, (int)length);
        }

        private void ServeTerrainTexture(HttpRequestEventArgs e)
        {
            byte[] data = WebMapMod.Instance.TerrainPng;
            if (ValidateETag(e, WebMapMod.Instance.TerrainPngETag))
                return;

            e.Response.ContentType = MimeMap.GetMime(".png");
            e.Response.ContentLength64 = data.Length;
            e.Response.OutputStream.Write(data, 0, data.Length);
        }
    }
}
