using System;
using System.Reflection;

namespace WebSocketServer
{
    public static class MethodInfoExtensions
    {
        public static TDelegate CreateDelegate<TDelegate>(this MethodInfo method, object target)
        {
            return (TDelegate)(object)Delegate.CreateDelegate(typeof(TDelegate), target, method, true);
        }
    }
}
