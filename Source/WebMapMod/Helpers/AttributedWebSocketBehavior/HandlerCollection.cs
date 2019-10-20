using System;
using System.Collections.Generic;
using System.Linq.Expressions;
using System.Reflection;

namespace TechPizza.WebMapMod
{
    public abstract partial class AttributedWebSocketBehavior
    {
        public class HandlerCollection
        {
            public delegate WebOutgoingMessage HandlerDelegate(
                AttributedWebSocketBehavior behavior, WebIncomingMessage message);

            public Dictionary<ushort, HandlerDelegate> ByCode { get; }
            public Dictionary<string, HandlerDelegate> ByName { get; }

            public HandlerCollection()
            {
                ByCode = new Dictionary<ushort, HandlerDelegate>();
                ByName = new Dictionary<string, HandlerDelegate>(StringComparer.OrdinalIgnoreCase);
            }

            public void Add(ushort code, HandlerDelegate handler)
            {
                ByCode.Add(code, handler);
            }

            public void Add(string code, HandlerDelegate handler)
            {
                if (ByName.ContainsKey(code))
                    throw new ArgumentException(
                        "There is already a handler whose name only differs in casing.");
                ByName.Add(code.ToLower(), handler);
            }

            public static HandlerCollection Create(Type behaviorType, CodeCollection codes = null)
            {
                // TODO: consider finding public properties and returning
                // a serialized version of the value returned by the getter

                if (!behaviorType.IsSubclassOf(typeof(AttributedWebSocketBehavior)))
                    throw new ArgumentException(
                        $"Behavior type must be a subclass of {nameof(AttributedWebSocketBehavior)}.");

                var collection = new HandlerCollection();
                var methods = behaviorType.GetMethods(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance);
                foreach (var method in methods)
                {
                    if (method.IsSpecialName)
                        continue;

                    var attribs = method.GetCustomAttributes(typeof(MessageHandlerAttribute), inherit: false);
                    if (attribs.Length != 1)
                        continue;

                    if (method.IsGenericMethod ||
                        method.IsGenericMethodDefinition ||
                        method.ContainsGenericParameters)
                        throw new InvalidOperationException(
                            "The handler method may not be generic in any way.");

                    var target = Expression.Parameter(typeof(AttributedWebSocketBehavior), "target");
                    var message = Expression.Parameter(typeof(WebIncomingMessage), "message");
                    var behavior = Expression.Convert(target, behaviorType);

                    // lambda visualized: (target, message) => ((behaviorType)target).Invoke(message)
                    var call = Expression.Call(behavior, method, message);
                    var handler = Expression.Lambda<HandlerDelegate>(call, target, message).Compile();

                    var attrib = attribs[0] as MessageHandlerAttribute;
                    string name = attrib.Name ?? method.Name;

                    collection.Add(name, handler);
                    if (attrib.HasCode)
                    {
                        collection.Add(attrib.Code, handler);
                    }
                    else if (codes != null)
                    {
                        ushort code;
                        if (codes.TryGetCode(name, out code))
                            collection.Add(code, handler);
                    }
                }
                return collection;
            }
        }
    }
}