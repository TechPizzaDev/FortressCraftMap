using System;

namespace TechPizza.WebMapMod
{
    [AttributeUsage(AttributeTargets.Method, Inherited = false)]
    public sealed class MessageHandlerAttribute : Attribute
    {
        public ushort Code { get; set; }
        public string Name { get; set; }
        public bool HasCode { get; }

        public MessageHandlerAttribute()
        {
            HasCode = false;
        }

        public MessageHandlerAttribute(string name) : this()
        {
            Name = name;
        }

        public MessageHandlerAttribute(ushort code)
        {
            if (code == AttributedWebSocketBehavior.ReservedCode)
                throw new ArgumentException("The message code is reserved.", nameof(code));
            Code = code;
            HasCode = true;
        }

        public MessageHandlerAttribute(ClientMessageCode code) : this((ushort)code)
        {
        }
    }
}
