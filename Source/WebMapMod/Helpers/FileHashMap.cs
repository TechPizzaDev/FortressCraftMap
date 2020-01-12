using System.Collections.Generic;
using System.IO;

namespace TechPizza.WebMapMod
{
    public class FileHashMap
    {
        private Dictionary<string, FileHash> _hashMap;

        public FileHashMap()
        {
            _hashMap = new Dictionary<string, FileHash>();
        }

        public FileHash GetHash(FileInfo file, out bool wasChanged)
        {
            string path = file.FullName;
            FileHash hash;
            lock (_hashMap)
            {
                if (!_hashMap.TryGetValue(path, out hash))
                {
                    hash = new FileHash(path);
                    _hashMap.Add(path, hash);
                }

                if (hash.IsUpToDate(file.Length, file.LastWriteTimeUtc))
                {
                    wasChanged = false;
                }
                else
                {
                    using (var fs = file.OpenRead())
                        hash.RefreshTag(fs);
                    wasChanged = true;
                }
            }
            return hash;
        }

        public FileHash GetHash(string path, out bool wasChanged)
        {
            return GetHash(new FileInfo(path), out wasChanged);
        }
    }
}
