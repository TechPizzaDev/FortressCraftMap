using System;

namespace WebSocketServer
{
    [AttributeUsage(AttributeTargets.Method, Inherited = false)]
    public sealed class MessageHandlerAttribute : Attribute
    {
        public int Code { get; set; }
        public string Name { get; set; }

        public MessageHandlerAttribute()
        {
            Code = -1;
        }

        public MessageHandlerAttribute(int code)
        {
            Code = code;
        }

        public MessageHandlerAttribute(ClientMessageCode code) : this((int)code)
        {
        }

        public MessageHandlerAttribute(string name) : this()
        {
            Name = name;
        }
    }
}
