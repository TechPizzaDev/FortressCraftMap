using System;
using System.Collections.Generic;
using System.Linq.Expressions;
using System.Reflection;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using WebSocketSharp;
using WebSocketSharp.Server;

namespace WebSocketServer
{
    public abstract class AttributedWebSocketBehavior : WebSocketBehavior
    {
        public delegate void HandlerDelegate(AttributedWebSocketBehavior behavior, JToken message);

        private static Dictionary<Type, Dictionary<string, HandlerDelegate>> _handlerCache;

        private Dictionary<string, HandlerDelegate> _handlers;

        static AttributedWebSocketBehavior()
        {
            _handlerCache = new Dictionary<Type, Dictionary<string, HandlerDelegate>>();
        }

        public AttributedWebSocketBehavior()
        {
            lock (_handlerCache)
            {
                var type = GetType();
                if (!_handlerCache.TryGetValue(type, out _handlers))
                {
                    _handlers = CreateMessageHandlers(type);
                    _handlerCache.Add(type, _handlers);
                }
            }
        }

        public static Dictionary<string, HandlerDelegate> CreateMessageHandlers(Type type)
        {
            // TODO: consider finding public properties and returning
            // a serialized version of the value returned by the getter

            var handlers = new Dictionary<string, HandlerDelegate>();
            var methods = type.GetMethods(BindingFlags.Public | BindingFlags.Instance);
            foreach (var method in methods)
            {
                if (method.IsSpecialName)
                    continue;

                var attribs = method.GetCustomAttributes(typeof(MessageHandlerAttribute), false);
                if (attribs.Length != 1)
                    continue;

                var attrib = attribs[0] as MessageHandlerAttribute;
                string name = attrib.Name ?? method.Name;

                var targetBase = Expression.Parameter(typeof(AttributedWebSocketBehavior), "target");
                var message = Expression.Parameter(typeof(JToken), "message");
                var target = Expression.Convert(targetBase, type);
                var call = Expression.Call(target, method, message);

                // (target, message) => ((type)target).Invoke(message)
                var handler = Expression.Lambda<HandlerDelegate>(call, targetBase, message).Compile();
                handlers.Add(name, handler);
            }
            return handlers;
        }

        protected bool Missing(JToken token, string name, out JToken value)
        {
            if (token == null || (value = token[name]) == null)
            {
                Send("Missing property '" + name + "'.");
                value = null;
                return true;
            }
            return false;
        }

        protected override void OnMessage(MessageEventArgs e)
        {
            if (e.IsPing)
                return;

            if (!e.IsText)
            {
                Send("Only text messages are supported.");
                return;
            }

            var msg = JObject.Parse(e.Data);
            var codeToken = msg["code"];
            if (codeToken == null)
            {
                Send("Message code missing.");
                return;
            }

            if (codeToken.Type != JTokenType.String)
            {
                Send("Message code must be of type String.");
                return;
            }

            string code = codeToken.ToObject<string>();
            if (_handlers.TryGetValue(code, out var handler))
            {
                handler.Invoke(this, msg["message"]);
            }
            else
            {
                Send($"Unknown message code '{code}'");
            }
        }

        protected void SendAsJson(object value)
        {
            if (State == WebSocketState.Closed ||
                State == WebSocketState.Closing)
                return;

            string str = JsonConvert.SerializeObject(value, Formatting.None);
            Send(str);
        }
    }
}
