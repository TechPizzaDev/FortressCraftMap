using System;
using System.Collections.Generic;
using System.Reflection;
using Newtonsoft.Json;

namespace WebSocketServer
{
    public class StructArrayConverter<T> : JsonConverter<T> where T : struct
    {
        private static Dictionary<Type, FieldInfo[]> _fieldCache =
            new Dictionary<Type, FieldInfo[]>();

        public override T ReadJson(
            JsonReader reader, Type objectType, T existingValue, 
            bool hasExistingValue, JsonSerializer serializer)
        {
            while (reader.Read())
            {
                if (reader.TokenType == JsonToken.StartArray)
                {

                }
                else if (reader.TokenType != JsonToken.EndArray)
                {
                    throw new JsonReaderException();
                }
            }
        }

        public override void WriteJson(
            JsonWriter writer, T value, JsonSerializer serializer)
        {

        }

        private static void GetDefinition(Type type)
        {
            var fields = type.GetFields(BindingFlags.Public | BindingFlags.Instance);
            
            for (int i = 0; i < fields.Length; i++)
            {

            }
        }
    }
}
