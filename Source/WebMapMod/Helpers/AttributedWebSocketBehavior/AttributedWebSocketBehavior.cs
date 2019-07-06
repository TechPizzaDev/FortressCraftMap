using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Text;
using GameDevWare.Serialization;
using TechPizza.WebMap.Extensions;
using WebSocketSharp;
using WebSocketSharp.Server;

namespace TechPizza.WebMap
{
    public abstract partial class AttributedWebSocketBehavior : WebSocketBehavior
    {
        private static Dictionary<Type, HandlerCollection> _handlerCache;
        private static Dictionary<Type, CodeCollection> _clientCodeCache;
        private static Dictionary<Type, CodeCollection> _serverCodeCache;

        /// <summary>
        /// Gets a UTF-8 encoding that does not emit an identifier.
        /// </summary>
        public static Encoding PlainUTF8 { get; } =
            new UTF8Encoding(encoderShouldEmitUTF8Identifier: false);

        private HandlerCollection _handlers;
        private CodeCollection _clientCodes;
        private CodeCollection _serverCodes;

        public bool VerboseDebug { get; set; }
        public bool UseNumericCodes { get; }

        #region Constructors

        static AttributedWebSocketBehavior()
        {
            _handlerCache = new Dictionary<Type, HandlerCollection>();
            _clientCodeCache = new Dictionary<Type, CodeCollection>();
            _serverCodeCache = new Dictionary<Type, CodeCollection>();
        }

        public AttributedWebSocketBehavior(
            CodeEnumDefinition codeTypeDefinition = default(CodeEnumDefinition))
        {
            UseNumericCodes = codeTypeDefinition.IsValid;

            if (UseNumericCodes)
                InitCodes(codeTypeDefinition);
            InitHandlers();
        }

        #endregion

        #region Initializing

        private void InitHandlers()
        {
            lock (_handlerCache)
            {
                Type type = GetType();
                if (!_handlerCache.TryGetValue(type, out _handlers))
                {
                    _handlers = HandlerCollection.Create(type, _clientCodes);
                    _handlerCache.Add(type, _handlers);
                }
            }
        }

        private void InitCodes(CodeEnumDefinition typeDefinition)
        {
            lock (_clientCodeCache)
            {
                if (!_clientCodeCache.TryGetValue(typeDefinition.Client, out _clientCodes))
                {
                    _clientCodes = new CodeCollection(typeDefinition.Client);
                    _clientCodeCache.Add(typeDefinition.Client, _clientCodes);
                }
            }

            lock (_serverCodeCache)
            {
                if (!_serverCodeCache.TryGetValue(typeDefinition.Server, out _serverCodes))
                {
                    _serverCodes = new CodeCollection(typeDefinition.Server);
                    _serverCodeCache.Add(typeDefinition.Server, _serverCodes);
                }
            }
        }

        #endregion

        /// <summary>
        /// Called when the WebSocket connection for a session has been established.
        /// Sends an initialization message to the client.
        /// </summary>
        protected override void OnOpen()
        {
            SendInitMessage();
        }

        #region Init Message

        private void SendInitMessage()
        {
            var codeInfo = GetCodeInfo();
            SendMessage(new
            {
                codeInfo
            });
        }

        private object GetCodeInfo()
        {
            if (UseNumericCodes)
            {
                return new
                {
                    numericCodes = true,
                    client = _clientCodes?.ByName,
                    server = _serverCodes?.ByName
                };
            }
            else
            {
                return new
                {
                    numericCodes = false,
                    client = _handlers.ByName.Keys,
                };
            }
        }

        #endregion

        #region 'Missing' Helper

        /// <summary>
        /// Helper for checking if <paramref name="token"/> is an empty 
        /// list or <see langword="null"/>, sending an error if it is.
        /// </summary>
        /// <param name="token">The token to check.</param>
        /// <param name="sendError"><see langword="true"/> to send an error if the token is invalid.</param>
        /// <returns></returns>
        protected bool Missing(object token, bool sendError = true)
        {
            var list = token as IList;
            if (token == null || (list != null && list.Count == 0))
            {
                if(sendError)
                    SendError(token, "Missing value.");
                return true;
            }
            return false;
        }

        /// <summary>
        /// Helper for checking if <paramref name="token"/> is a dictionary and
        /// has the specified property, sending an error if the property is missing.
        /// </summary>
        /// <param name="token">The token to check.</param>
        /// <param name="name">The name of the property.</param>
        /// <param name="value">The found value in the token.</param>
        /// <param name="sendError"><see langword="true"/> to send an error if the token is invalid.</param>
        /// <returns></returns>
        protected bool Missing<T>(object token, string name, out T value, bool sendError = true)
        {
            var dic = token as IDictionary<string, object>;
            if (dic != null)
            {
                object raw;
                if (dic.TryGetValue(name, out raw))
                {
                    if (raw is T)
                    {
                        value = (T)raw;
                        return false;
                    }
                }
            }
            if (sendError)
                SendError(token, "Missing property '" + name + "'.");
            value = default(T);
            return true;
        }

        /// <summary>
        /// Helper for checking if <paramref name="token"/> is a list and 
        /// has an element at the specified index, sending an error if the value is missing.
        /// </summary>
        /// <param name="token"></param>
        /// <param name="index">The index of the value.</param>
        /// <param name="value">The found value in the token.</param>
        /// <param name="sendError"><see langword="true"/> to send an error if the token is invalid.</param>
        /// <returns></returns>
        protected bool Missing<T>(object token, int index, out T value, bool sendError = true)
        {
            var list = token as IList<object>;
            if (list != null)
            {
                if (index < list.Count)
                {
                    object raw = list[index];
                    if (raw is T)
                    {
                        value = (T)raw;
                        return false;
                    }
                }
            }
            if (sendError)
                SendError(token, "Missing value at index '" + index + "'.");
            value = default(T);
            return true;
        }

        #endregion

        #region OnMessage and Send

        /// <summary>
        /// Called when the WebSocket instance for a session receives a message.
        /// </summary>
        /// <param name="e">
        /// A <see cref="MessageEvent"/> that represents the event data passed
        /// from a <see cref="WebSocket.OnMessage"/> event.
        /// </param>
        protected override void OnMessage(MessageEventArgs e)
        {
            if (e.IsPing)
                return;

            if (!e.IsBinary)
            {
                SendError("Only binary messages are supported.");
                return;
            }

            List<object> list;
            var rawData = new MemoryStream(e.RawData, writable: false);
            var reader = new StreamReader(rawData, Encoding.UTF8);
            try
            {
                list = MsgPack.Deserialize<List<object>>(rawData);
            }
            catch (Exception ex)
            {
                reader.DiscardBufferedData();
                reader.BaseStream.Position = 0;

                SendError(reader.ReadToEnd(), ex.Message);
                return;
            }

            if (list == null) // this should never happen
            {
                SendError("Message was parsed as null.");
                return;
            }

            object codeToken = list.Count > 0 ? list[0] : null;
            if (codeToken == null)
            {
                SendError(list, "Message code missing.");
                return;
            }

            object bodyToken = list.Count > 1 ? list[1] : null;
            if (bodyToken == null)
            {
                SendError(list, "Message body missing.");
                return;
            }

            var typeCode = Type.GetTypeCode(codeToken.GetType());
            switch (typeCode)
            {
                case TypeCode.String:
                {
                    HandlerCollection.HandlerDelegate handler;
                    if (_handlers.ByName.TryGetValue((string)codeToken, out handler))
                    {
                        handler.Invoke(this, null);
                        break;
                    }
                    SendUnknownCodeError(list, codeToken);
                    break;
                }

                case TypeCode.SByte:
                case TypeCode.Byte:
                case TypeCode.Int16:
                case TypeCode.UInt16:
                case TypeCode.Int32:
                {
                    int code = codeToken.ToInt32();
                    if (code == -1)
                    {
                        SendError(list, $"Message code '{codeToken}' is reserved.");
                        return;
                    }

                    HandlerCollection.HandlerDelegate handler;
                    if (_handlers.ByCode.TryGetValue(code, out handler))
                    {
                        handler.Invoke(this, bodyToken);
                        return;
                    }
                    SendUnknownCodeError(list, codeToken);
                    break;
                }

                default:
                    SendError(list, "Message code must be of type string or an integer within bounds of signed 32-bit.");
                    break;
            }
        }

        private void SendUnknownCodeError(object list, object codeToken)
        {
            SendError(list, $"Message code '{codeToken}' is unknown.");
        }

        protected void SendMessage(object value, SerializationContext context)
        {
            using (var output = new MemoryStream())
            {
                MsgPack.Serialize(value, output, context);
                Send(output.ToArray());
            }
        }

        protected void SendMessage(object value)
        {
            SendMessage(value, new SerializationContext());
        }

        protected void SendMessage(string key, object body, SerializationContext context)
        {
            using (var output = new MemoryStream())
            {
                MsgPack.Serialize(new object[] { key, body }, output, context);
                Send(output.ToArray());
            }
        }

        protected void SendMessage(string key, object body)
        {
            SendMessage(key, body, new SerializationContext());
        }

        protected void SendMessage(int key, object body, SerializationContext context)
        {
            using (var output = new MemoryStream())
            {
                MsgPack.Serialize(new object[] { key, body }, output, context);
                Send(output.ToArray());
            }
        }

        protected void SendMessage(int key, object body)
        {
            SendMessage(key, body, new SerializationContext());
        }

        protected void SendError(object message)
        {
            SendMessage(-1, message);
        }

        protected void SendError(object source, object message)
        {
            if (VerboseDebug)
                SendError(new object[] { source, message });
            else
                SendError(message);
        }

        [DebuggerHidden]
        protected void AssertOpen()
        {
            if (State != WebSocketState.Open)
                throw new InvalidOperationException("The connection is not open.");
        }

        #endregion
    }
}