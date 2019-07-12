using System;
using System.Collections.Generic;
using System.Linq.Expressions;
using System.Reflection;

namespace TechPizza.WebMap
{
    public abstract partial class AttributedWebSocketBehavior
    {
        public class HandlerCollection
        {
            public delegate void HandlerDelegate(AttributedWebSocketBehavior behavior, object body);

            public Dictionary<int, HandlerDelegate> ByCode { get; }
            public Dictionary<string, HandlerDelegate> ByName { get; }

            public HandlerCollection()
            {
                ByCode = new Dictionary<int, HandlerDelegate>();
                ByName = new Dictionary<string, HandlerDelegate>(StringComparer.OrdinalIgnoreCase);
            }

            public void Add(int code, HandlerDelegate handler)
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
                            "The handler method cannot be generic in any way.");

                    var parameters = method.GetParameters();
                    var paramType = parameters[0].ParameterType;

                    var target = Expression.Parameter(typeof(AttributedWebSocketBehavior), "target");
                    var message = Expression.Parameter(typeof(object), "message");
                    var behavior = Expression.Convert(target, behaviorType);
                    var body = Expression.Convert(message, paramType);

                    // lambda visualized: (target, message) => ((behaviorType)target).Invoke((paramType)message)
                    var call = Expression.Call(behavior, method, body);
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
                        int code;
                        if (codes.TryGetCode(name, out code))
                            collection.Add(code, handler);
                    }
                }
                return collection;
            }
        }
    }
}