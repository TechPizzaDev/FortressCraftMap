using System;
using Map = System.Collections.Generic.Dictionary<string, int>;

namespace TechPizza.WebMap
{
    public abstract partial class AttributedWebSocketBehavior
    {
        public class CodeCollection
        {
            public Map ByName { get; }

            public CodeCollection(Type enumType)
            {
                if (enumType == null)
                    throw new ArgumentNullException(nameof(enumType));

                if (!CodeEnumDefinition.IsValidEnum(enumType))
                    throw new ArgumentException(InvalidEnumError, nameof(enumType));

                var enumValues = Enum.GetValues(enumType);
                ByName = new Map(enumValues.Length, StringComparer.OrdinalIgnoreCase);

                foreach(int enumValue in enumValues)
                {
                    string enumName = Enum.GetName(enumType, enumValue);
                    if (enumValue == -1)
                        throw new ArgumentException($"Value -1 ({enumName}) is reserved.", nameof(enumType));

                    if (ByName.ContainsKey(enumName))
                        throw new ArgumentException(
                            "There are enum names that only differ in casing.", nameof(enumType));

                    ByName.Add(enumName.ToLower(), enumValue);
                }
            }

            public bool TryGetCode(string name, out int code)
            {
                return ByName.TryGetValue(name, out code);
            }
        }
    }
}
