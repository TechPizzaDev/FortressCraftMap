using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using WebSocketSharp;
using WebSocketSharp.Server;

namespace TechPizza.WebMapMod
{
    public abstract partial class AttributedWebSocketBehavior : WebSocketBehavior
    {
        public const int ReservedCode = 0;
        public const int StringCode = 1;
        public const int ErrorCode = 2;

        private static Dictionary<Type, HandlerCollection> _handlerCache;
        private static Dictionary<Type, CodeCollection> _clientCodeCache;
        private static Dictionary<Type, CodeCollection> _serverCodeCache;

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
            var message = WebOutgoingMessagePool.Rent();

            WriteCodeInfo(message);

            SendMessage(message);
            WebOutgoingMessagePool.Return(message);
        }

        private void WriteCodeInfo(WebOutgoingMessage writer)
        {
            if (UseNumericCodes)
            {
                writer.Write(UseNumericCodes);

                if (_clientCodes != null)
                    writer.Write(_clientCodes.ByName);

                if (_serverCodes != null)
                    writer.Write(_serverCodes.ByName);
            }
            else
            {
                writer.Write(UseNumericCodes);

                writer.Write(_handlers.ByName.Keys);
            }
        }

        #endregion

        #region OnMessage

        /// <summary>
        /// Called when the WebSocket instance for a session receives a message.
        /// </summary>
        /// <param name="e">
        /// A <see cref="MessageEvent"/> that represents the event data passed
        /// from a <see cref="WebSocket.OnMessage"/> event.
        /// </param>
        protected override void OnMessage(MessageEventArgs e)
        {
            WebOutgoingMessage outgoing = null;

            if (e.IsPing)
                return;

            if (!e.IsBinary)
            {
                outgoing = ErrorMessage("Only binary messages are supported.");
                goto Send;
            }

            var rawData = new MemoryStream(e.RawData, writable: false);
            var message = new WebIncomingMessage(rawData);

            ushort code = message.ReadUInt16();
            if(code == ReservedCode)
            {
                outgoing = ErrorMessage("The message code '0' is reserved.");
                goto Send;
            }

            HandlerCollection.HandlerDelegate handler;
            string codeId = null;

            if (code == StringCode) 
            {
                string codeName = message.ReadString();
                if (_handlers.ByName.TryGetValue(codeName, out handler))
                    codeId = codeName;
            }
            else
            {
                if (_handlers.ByCode.TryGetValue(code, out handler))
                    codeId = code.ToString();
            }

            if (codeId == null)
            {
                outgoing = ErrorMessage($"The message code '{code}' is unknown.");
            }
            else
            {
                try
                {
                    outgoing = handler.Invoke(this, message);
                }
                catch (Exception exc)
                {
                    outgoing = ErrorMessage("Internal server error: " + exc.Message);
                }
            }

            Send:
            if (outgoing != null)
                SendMessage(outgoing);
            WebOutgoingMessagePool.Return(outgoing);
        }

        #endregion

        public WebOutgoingMessage CreateMessage(ushort code)
        {
            var message = WebOutgoingMessagePool.Rent();
            message.Write(code);
            return message;
        }

        #region Send 

        public void SendMessage(WebOutgoingMessage message)
        {
            message.Flush();
            Send(message.Memory.ToArray());
        }

        public WebOutgoingMessage ErrorMessage(string text)
        {
            var message = CreateMessage(ErrorCode);
            message.Write(text);
            return message;
        }

        #endregion

        [DebuggerHidden]
        protected void AssertOpen()
        {
            if (State != WebSocketState.Open)
                throw new InvalidOperationException("The connection is not open.");
        }
    }
}