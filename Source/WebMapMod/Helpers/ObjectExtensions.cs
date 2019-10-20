using System;

namespace TechPizza.WebMapMod.Extensions
{
    public static class ObjectExtensions
    {
        public static int CastToInt32(this object obj)
        {
            if (obj == null)
                throw new ArgumentNullException(nameof(obj));

            switch (Type.GetTypeCode(obj.GetType()))
            {
                case TypeCode.SByte:
                    return (sbyte)obj;

                case TypeCode.Byte:
                    return (byte)obj;

                case TypeCode.Int16:
                    return (short)obj;

                case TypeCode.UInt16:
                    return (ushort)obj;

                case TypeCode.Int32:
                    return (int)obj;

                default:
                    throw new ArgumentException(
                        $"Could not convert '{obj.GetType()}' to Int32.", nameof(obj));
            }
        }
    }
}