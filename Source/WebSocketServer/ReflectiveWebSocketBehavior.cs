using System;
using System.Collections.Generic;
using System.Reflection;
using System.Text.RegularExpressions;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using WebSocketSharp;
using WebSocketSharp.Server;

namespace WebSocketServer
{
    public abstract class ReflectiveWebSocketBehavior : WebSocketBehavior
    {
        public delegate void RequestHandlerDelegate(JToken request);

        private static Dictionary<Type, List<CachedHandlerInfo>> _handlerCache;
        private static Regex _handlerRegex;

        private Dictionary<string, RequestHandlerDelegate> _handlers;

        static ReflectiveWebSocketBehavior()
        {
            _handlerCache = new Dictionary<Type, List<CachedHandlerInfo>>();
            _handlerRegex = new Regex("(?<=On)(.*)(?=Request)");
        }

        public ReflectiveWebSocketBehavior()
        {
            List<CachedHandlerInfo> handlerInfos;
            lock (_handlerCache)
            {
                var type = GetType();
                if(!_handlerCache.TryGetValue(type, out handlerInfos))
                {
                    handlerInfos = GetRequestHandlers(type);
                    _handlerCache.Add(type, handlerInfos);
                }
            }

            _handlers = new Dictionary<string, RequestHandlerDelegate>(StringComparer.OrdinalIgnoreCase);
            foreach (var handlerInfo in handlerInfos)
            {
                _handlers.Add(
                    handlerInfo.Name, 
                    handlerInfo.Method.CreateDelegate<RequestHandlerDelegate>(this));
            }
        }

        private List<CachedHandlerInfo> GetRequestHandlers(Type type)
        {
            // TODO: consider finding public properties and returning
            // a serialized version of the value returned by getter

            var list = new List<CachedHandlerInfo>();
            var methods = type.GetMethods(BindingFlags.Public | BindingFlags.Instance);
            foreach(var method in methods)
            {
                if (method.IsSpecialName)
                    continue;

                var match = _handlerRegex.Match(method.Name);
                if (!match.Success)
                    continue;

                list.Add(new CachedHandlerInfo(match.Value, method));
            }
            return list;
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
                Send("Missing request code.");
                return;
            }

            if (codeToken.Type != JTokenType.String)
            {
                Send("Request code must be of type String.");
                return;
            }

            string code = codeToken.ToObject<string>();
            if (_handlers.TryGetValue(code, out var handler))
            {
                handler.Invoke(msg["request"]);
            }
            else
            {
                Send($"Unknown request code '{code}'");
            }
        }

        protected void SendAsJson(object value)
        {
            string str = JsonConvert.SerializeObject(value, Formatting.None);
            Send(str);
        }

        private class CachedHandlerInfo
        {
            public string Name { get; }
            public MethodInfo Method { get; }

            public CachedHandlerInfo(string name, MethodInfo method)
            {
                Name = name;
                Method = method;
            }
        }
    }
}
