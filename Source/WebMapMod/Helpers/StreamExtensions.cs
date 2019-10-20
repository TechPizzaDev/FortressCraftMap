using System.IO;

namespace TechPizza.WebMapMod
{
    public static class StreamExtensions
    {
        public static void CopyTo(this Stream src, Stream dst)
        {
            byte[] buffer = BufferPool.Rent();
            try
            {
                int read;
                while ((read = src.Read(buffer, 0, buffer.Length)) != 0)
                {
                    dst.Write(buffer, 0, read);
                }
            }
            finally
            {
                BufferPool.Return(buffer);
            }
        }

        public static void Write(this Stream dst, byte[] buffer)
        {
            dst.Write(buffer, 0, buffer.Length);
        }
    }
}
