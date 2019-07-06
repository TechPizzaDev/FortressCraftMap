using System.Collections.Generic;
using System.IO;

namespace TechPizza.WebMap
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
                FileHash hash;
                if (!_hashMap.TryGetValue(path, out hash))
                {
                    hash = new FileHash(path);
                    _hashMap.Add(path, hash);
                }

                if (!hash.IsUpToDate(file.Length, file.LastWriteTimeUtc))
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
