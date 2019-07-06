using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using System.Text;
using GameDevWare.Serialization;
using WebSocketSharp.Server;

namespace TechPizza.WebMap
{
    public partial class HttpHost
    {
        //private static Dictionary<ushort, string> _cubeNames;
        //private static bool _cubeNamesEmpty;
        //
        //public static string GetCubeName(ushort type)
        //{
        //    string name = "Unknown";
        //    if (!_cubeNamesEmpty)
        //    {
        //        if (_cubeNames == null)
        //            _cubeNames = GetCubeNamesDict();
        //
        //        if (_cubeNames == null)
        //        {
        //            _cubeNamesEmpty = true;
        //        }
        //        else
        //        {
        //            string value;
        //            if (_cubeNames.TryGetValue(type, out value))
        //                name = value;
        //        }
        //    }
        //    return $"{name} ({type})";
        //}

        private static Dictionary<ushort, string> GetCubeTypes()
        {
            var warnings = new StringBuilder();
            try
            {
                Type type = typeof(eCubeTypes);
                FieldInfo[] fieldInfo = type.GetFields(
                    BindingFlags.Public | BindingFlags.Static | BindingFlags.FlattenHierarchy);

                var constants = new Dictionary<ushort, string>();
                for (int i = 0; i < fieldInfo.Length; i++)
                {
                    FieldInfo item = fieldInfo[i];
                    if (item.IsLiteral && !item.IsInitOnly)
                    {
                        string name = item.Name;
                        switch (name)
                        {
                            case nameof(eCubeTypes.NULL):
                            case nameof(eCubeTypes.CustomMin):
                            case nameof(eCubeTypes.CustomMax):
                            case nameof(eCubeTypes.ModMin):
                            case nameof(eCubeTypes.ModMax):
                            case nameof(eCubeTypes.MAX):
                                continue;

                            default:
                                object rawConstant = item.GetRawConstantValue();
                                if (rawConstant is ushort)
                                {
                                    constants.Add((ushort)rawConstant, name);
                                }
                                else
                                {
                                    warnings.AppendFormat(
                                        "Could not convert {0} to {1}; {2}.{3}\n",
                                        rawConstant.GetType(), typeof(ushort), type, name);
                                }
                                break;
                        }
                    }
                }

                if (warnings.Length > 0)
                    WebMapMod.LogWarning($"GetCubeConstants:\n{warnings.ToString()}");

                return constants;
            }
            catch (Exception exc)
            {
                warnings.Insert(0, "GetCubeConstants: Failed to retrieve cube names.\n");
                warnings.AppendLine(exc.ToString());

                WebMapMod.LogWarning(warnings.ToString());
                return null;
            }
        }

        private void ServeTerrainData(HttpRequestEventArgs e)
        {
            var result = new Dictionary<ushort, object>();

            var cubeTypes = GetCubeTypes();
            foreach (var type in cubeTypes)
            {
                var entry = TerrainData.mEntries[type.Key];
                int topTexture = entry.TopTexture;
                int guiTexture = entry.GUITexture;

                // TODO: what now
            }

            long length;
            byte[] data;
            using (var mem = new MemoryStream())
            {
                MsgPack.Serialize(result, mem);
                length = mem.Length;
                data = mem.GetBuffer();
            }

            e.Response.ContentType = MimeMap.AppOctetStream;
            e.Response.ContentLength64 = length;
            e.Response.OutputStream.Write(data, 0, (int)length);
        }

        private void ServeTerrainTexture(HttpRequestEventArgs e)
        {
            byte[] data = WebMapMod.Instance.TerrainPNG;

            e.Response.ContentType = MimeMap.GetMime(".png");
            e.Response.ContentLength64 = data.Length;
            e.Response.OutputStream.Write(data, 0, data.Length);
        }
    }
}
