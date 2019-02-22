using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;

namespace WebSocketServer
{
    public class FileHash
    {
        public string Path { get; }
        public long Length { get; private set; }
        public DateTime LastChange { get; private set; }
        
        public string Tag { get; private set; }

        public FileHash(string path)
        {
            if (path.Length > BufferPool.DefaultBufferSize)
                throw new ArgumentOutOfRangeException(nameof(path));

            Path = path;

            Length = -1;
            LastChange = DateTime.MinValue;
        }

        public bool Refresh(long length, DateTime lastChange)
        {
            if (Length != length || LastChange != lastChange)
            {
                Tag = null;

                Length = length;
                LastChange = lastChange;
                return true;
            }
            return false;
        }

        public void RefreshTag(Stream stream)
        {
            byte[] buffer = BufferPool.Rent();
            try
            {
                using (var md5 = MD5.Create())
                {
                    int pathBytes = Encoding.UTF8.GetBytes(Path, 0, Path.Length, buffer, 0);
                    md5.TransformBlock(buffer, 0, pathBytes, buffer, 0);

                    int read;
                    while ((read = stream.Read(buffer, 0, buffer.Length)) != 0)
                        md5.TransformBlock(buffer, 0, read, buffer, 0);
                    md5.TransformFinalBlock(buffer, 0, 0);

                    Tag = Convert.ToBase64String(md5.Hash);
                }
            }
            finally
            {
                BufferPool.Return(buffer);
            }
        }
    }
}
