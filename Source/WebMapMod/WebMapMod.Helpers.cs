using System;
using System.Security.Cryptography;
using UnityEngine;

namespace TechPizza.WebMap
{
    public partial class WebMapMod
    {
        public static CubeCoord ToSegmentBase(CubeCoord value)
        {
            return new CubeCoord(value.x >> 4 << 4, value.y >> 4 << 4, value.z >> 4 << 4);
        }

        public static CubeCoord ToSegment(CubeCoord value)
        {
            return new CubeCoord(value.x >> 4, value.y >> 4, value.z >> 4);
        }

        public static void LogWarning(object value)
        {
            LogWarning(value.ToString());
        }

        public static void LogWarning(string value)
        {
            Debug.LogWarning($"[{ModName}] {value}");
        }

        public static void Log(object value)
        {
            Log(value.ToString());
        }

        public static void Log(string value)
        {
            Debug.Log($"[{ModName}] {value}");
        }

        public static TerrainDataEntry GetTerrainEntryForTexture(TerrainDataEntry entry)
        {
            if (entry.isMultiBlockMachine && 
                entry.PickReplacement != null)
            {
                TerrainDataEntry pickEntry;
                TerrainDataValueEntry pickValueEntry;
                TerrainData.GetCubeByKey(entry.PickReplacement, out pickEntry, out pickValueEntry);
                if (entry != null)
                    return entry;
            }
            return entry;
        }

        public static TerrainUVCoord GetTerrainUVInstance()
        {
            var creator = SegmentMeshCreator.instance;
            var renderer = creator.mMeshRenderer;
            return renderer.segmentUVCoord;
        }

        private Texture2D BlitTerrainTexture(float scale)
        {
            var creator = SegmentMeshCreator.instance;
            var segmentTexture = creator.segmentMaterial.mainTexture;

            int copyWidth = (int)Math.Floor(segmentTexture.width * scale);
            int copyHeight = (int)Math.Floor(segmentTexture.height * scale);
            
            var target = RenderTexture.GetTemporary(
                copyWidth,
                copyHeight,
                0, // depthBuffer
                RenderTextureFormat.Default,
                RenderTextureReadWrite.Linear);
            target.filterMode = FilterMode.Bilinear;

            try
            {
                // this resizes the segment texture to fit into the target
                Graphics.Blit(segmentTexture, target);

                RenderTexture previous = RenderTexture.active;
                RenderTexture.active = target;

                var terrainCopy = new Texture2D(copyWidth, copyHeight);
                terrainCopy.ReadPixels(new Rect(0, 0, copyWidth, copyHeight), 0, 0);
                terrainCopy.Apply();

                RenderTexture.active = previous;
                return terrainCopy;
            }
            finally
            {
                RenderTexture.ReleaseTemporary(target);
            }
        }

        public static string GetDataETag(byte[] data)
        {
            using (var md5 = MD5.Create())
            {
                md5.TransformFinalBlock(data, 0, data.Length);
                return Convert.ToBase64String(md5.Hash);
            }
        }
    }
}
