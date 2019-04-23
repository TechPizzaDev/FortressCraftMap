
using System.IO;

namespace WebSocketServer.Packaging
{
    public struct CachedPackage
    {
        public PackageManager Manager { get; }
        public PackageDefinition Definition { get; }
        public string[] Tags { get; }
        public byte[] Content { get; }
        public string Tag { get; }

        public CachedPackage(PackageManager manager, PackageDefinition definition, string[] tags, byte[] content, string tag)
        {
            Manager = manager;
            Definition = definition;
            Tags = tags;
            Content = content;
            Tag = tag;
        }

        public bool IsUpToDate(FileHashMap map)
        {
            for (int i = 0; i < Definition.Files.Length; i++)
            {
                string path = Manager.GetPathInRoot(Definition.Files[i]);
                var file = new FileInfo(path);
                if (Tags[i] != map.GetHash(file).Tag)
                    return false;
            }
            return true;
        }
    }
}
