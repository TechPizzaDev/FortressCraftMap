using System.IO;

namespace WebSocketServer
{
    public static class PathHelper
    {
        public static string RemoveLastExtension(string path, out string ext)
        {
            ext = Path.GetExtension(path);
            return path.Remove(path.Length - ext.Length);
        }
    }
}
