using System;

namespace TechPizza.WebMapMod
{
    public static class WebMapMod
    {
        public static void Log(string value)
        {
            Console.WriteLine(value);
        }

        public static void LogWarning(string value)
        {
            Log(value);
        }
    }

    class Program
    {
        private const string _wwwRoot = "Public";

        static void Main(string[] args)
        {
            var host = new HttpHost(_wwwRoot, 1337);

            host.Start();
            Console.WriteLine("Listening on port " + host.Port);

            Console.ReadKey();
        }
    }
}