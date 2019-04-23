using System.Collections.Generic;
using System.IO;

namespace WebSocketServer
{
    public class FileHashMap
    {
        private Dictionary<string, FileHash> _hashMap;

        public FileHashMap()
        {
            _hashMap = new Dictionary<string, FileHash>();
        }

        public FileHash GetHash(FileInfo file)
        {
            string path = file.FullName;
            lock (_hashMap)
            {
                if (!_hashMap.TryGetValue(path, out var hash))
                {
                    hash = new FileHash(path);
                    _hashMap.Add(path, hash);
                }

                if (hash.Refresh(file.Length, file.LastWriteTimeUtc))
                {
                    using (var fs = file.OpenRead())
                        hash.RefreshTag(fs);
                }

                return hash;
            }
        }

        public FileHash GetHash(string path)
        {
            return GetHash(new FileInfo(path));
        }
    }
}
