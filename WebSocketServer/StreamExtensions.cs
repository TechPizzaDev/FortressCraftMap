using System.IO;

namespace WebSocketServer
{
    public static class StreamExtensions
    {
        public static void CopyTo(this Stream src, Stream destination)
        {
            byte[] buffer = BufferPool.Rent();
            try
            {
                int read;
                while ((read = src.Read(buffer, 0, buffer.Length)) != 0)
                    destination.Write(buffer, 0, read);
            }
            catch
            {
                throw;
            }
            finally
            {
                BufferPool.Return(buffer);
            }
        }
    }
}
