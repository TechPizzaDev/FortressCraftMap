using System;

namespace WebSocketServer
{
    [AttributeUsage(AttributeTargets.Method, Inherited = false)]
    public sealed class MessageHandlerAttribute : Attribute
    {
        public string Name { get; }

        public MessageHandlerAttribute(string name = null)
        {
            Name = name;
        }
    }
}
