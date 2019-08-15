using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using Encoder = System.Drawing.Imaging.Encoder;

namespace TexturePipeline
{
    unsafe class Program
    {
        static void Main(string[] args)
        {
            using (var source = (Bitmap)Image.FromFile("TB_diffuse.png"))
            {
                using (var result = new Bitmap(source.Width, source.Height, PixelFormat.Format8bppIndexed))
                {
                    var palette = result.Palette;
                    for (int i = 0; i < byte.MaxValue; i++)
                        palette.Entries[i] = Color.FromArgb(i, 255, 255, 255);
                    result.Palette = palette;

                    var rect = new Rectangle(0, 0, source.Width, source.Height);
                    var sourceBits = source.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
                    var resultBits = result.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format8bppIndexed);
                    try
                    {
                        byte* srcPtr = (byte*)sourceBits.Scan0;
                        byte* dstPtr = (byte*)resultBits.Scan0;

                        for (int y = 0; y < rect.Height; y++)
                        {
                            int* srcRowPtr = (int*)(srcPtr + sourceBits.Stride * y);
                            byte* dstRowPtr = (dstPtr + resultBits.Stride * y);

                            for (int x = 0; x < rect.Width; x++)
                            {
                                int color = srcRowPtr[x];
                                long alpha = (color & 0xFF000000) >> 24;

                                dstRowPtr[x] = (byte)alpha;
                            }
                        }
                    }
                    finally
                    {
                        source.UnlockBits(sourceBits);
                        result.UnlockBits(resultBits);
                    }

                    result.Save("opaque.png");
                }
            }
        }
    }
}
