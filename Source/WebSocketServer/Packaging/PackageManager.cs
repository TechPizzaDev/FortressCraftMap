using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
using System.Text;

namespace WebSocketServer.Packaging
{
    public class PackageManager
    {
        private const string PrimaryDefintionExtension = ".json";
        private const string SecondaryDefintionExtension = ".def";

        private Dictionary<string, PackageDefinition> _definitions;
        private Dictionary<string, CachedPackage> _cache;

        public string RootDirectory { get; }

        public PackageManager(string rootDirectory)
        {
            RootDirectory = rootDirectory ?? throw new ArgumentNullException(nameof(rootDirectory));
            
            _definitions = new Dictionary<string, PackageDefinition>();
            _cache = new Dictionary<string, CachedPackage>();
        }

        public void AddDefinitions(string searchPath)
        {
            // search for package definitions
            foreach (var file in Directory.GetFiles(searchPath))
            {
                string lessExtPath = PathHelper.RemoveLastExtension(file, out string ext1);
                string ext2 = Path.GetExtension(lessExtPath);
                if (ext1.Equals(PrimaryDefintionExtension, StringComparison.OrdinalIgnoreCase) &&
                    ext2.Equals(SecondaryDefintionExtension, StringComparison.OrdinalIgnoreCase))
                {
                    var def = JsonHelper.Deserialize<PackageDefinition>(file);
                    _definitions.Add(def.Name, def);
                }
            }
        }

        public bool TryGetDefinition(string name, out PackageDefinition definition)
        {
            return _definitions.TryGetValue(name, out definition);
        }

        public CachedPackage GetPackage(PackageDefinition definition, FileHashMap hashMap)
        {
            lock (_cache)
            {
                if (!_cache.TryGetValue(definition.Name, out CachedPackage package))
                {
                    package = CreatePackage(definition, hashMap);
                    _cache.Add(definition.Name, package);
                }
                else if (!package.IsUpToDate(hashMap))
                {
                    package = CreatePackage(definition, hashMap);
                    _cache[definition.Name] = package;
                }
                return package;
            }
        }

        public CachedPackage CreatePackage(PackageDefinition definition, FileHashMap hashMap)
        {
            string[] tags = new string[definition.Files.Length];
            for (int i = 0; i < tags.Length; i++)
            {
                string path = GetPathInRoot(definition.Files[i]);
                tags[i] = hashMap.GetHash(path).Tag;
            }

            char[] charBuffer = new char[1024 * 4];
            var builder = new StringBuilder();
            foreach (var file in definition.Files)
            {
                string path = GetPathInRoot(file);
                using (var reader = File.OpenText(path))
                {
                    builder.AppendLine("//##############################");
                    builder.AppendLine("// Start of " + file);
                    int read;
                    while ((read = reader.ReadBlock(charBuffer, 0, charBuffer.Length)) > 0)
                        builder.Append(charBuffer, 0, read);
                    builder.AppendLine();
                    builder.AppendLine("// End of " + file);
                }
            }

            byte[] result = Encoding.UTF8.GetBytes(builder.ToString());
            using (var sha256 = SHA256.Create())
            {
                byte[] hash = sha256.ComputeHash(result);
                string tag = Convert.ToBase64String(hash);
                return new CachedPackage(this, definition, tags, result, tag);
            }
        }

        public string GetPathInRoot(string path)
        {
            if (!path.StartsWith("/") && !RootDirectory.EndsWith("/"))
                return RootDirectory + "/" + path;
            else
                return RootDirectory + path;
        }
    }
}