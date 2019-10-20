using System.Collections.Generic;
using System.IO;
using System.Text;

namespace TechPizza.WebMapMod
{
    public class WebOutgoingMessage : BinaryWriter
    {
        /// <summary>
        /// Gets a UTF-8 encoding that does not emit an identifier.
        /// </summary>
        public static Encoding PlainUTF8 { get; } =
            new UTF8Encoding(encoderShouldEmitUTF8Identifier: false);

        public MemoryStream Memory { get; }

        public WebOutgoingMessage() : base(Stream.Null, PlainUTF8)
        {
            Memory = new MemoryStream();
            OutStream = Memory;
        }

        public void Write(ICollection<string> collection)
        {
            int count = collection.Count;
            Write(count);

            var enumerator = collection.GetEnumerator();
            for (int i = 0; i < count; i++)
            {
                if (!enumerator.MoveNext())
                    break;

                Write(enumerator.Current);
            }
        }

        public void Write(ICollection<KeyValuePair<string, ushort>> collection)
        {
            int count = collection.Count;
            Write(count);

            var enumerator = collection.GetEnumerator();
            for (int i = 0; i < count; i++)
            {
                if (!enumerator.MoveNext())
                    break;

                Write(enumerator.Current.Key);
                Write(enumerator.Current.Value);
            }
        }
    }
}
