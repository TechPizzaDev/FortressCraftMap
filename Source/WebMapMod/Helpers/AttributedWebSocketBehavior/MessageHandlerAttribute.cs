using System;

namespace TechPizza.WebMap
{
    [AttributeUsage(AttributeTargets.Method, Inherited = false)]
    public sealed class MessageHandlerAttribute : Attribute
    {
        public int Code { get; set; }
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

        public MessageHandlerAttribute(int code)
        {
            if (code == -1)
                throw new ArgumentException("Value -1 is reserved.", nameof(code));
            Code = code;
            HasCode = true;
        }

        public MessageHandlerAttribute(ClientMessageCode code) : this((int)code)
        {
        }
    }
}
