using System;
using System.IO;
using System.Reflection;
using Harmony;

namespace TechPizza.WebMap
{
    public partial class WebMapMod : FortressCraftMod
    {
        public const int ModVersion = 1;
        public const string ModName = nameof(TechPizza) + "." + nameof(WebMap);

        public static WebMapMod Instance { get; private set; }

        private HarmonyInstance _harmonyInstance;
        private HttpHost _httpHost;

        // this is not really needed for the map... yet
        //private void Update()
        //{   
        //    if (!IsGameActive())
        //        return;
        //
        //}

        public override void LowFrequencyUpdate()
        {
            if (!IsGameActive())
                return;

            base.LowFrequencyUpdate();
        }

        /// <summary>
        /// Gets if the game is playing.
        /// Use this to leave if the game is not in the playing state or
        /// there is no local player instance.
        /// </summary>
        /// <returns></returns>
        private bool IsGameActive()
        {
            return WorldScript.instance != null && GameState.State == GameStateEnum.Playing;
        }

        public override ModRegistrationData Register()
        {
            Instance = this;
            PatchHarmony();

            StartHttp();

            // setup registration data
            var data = new ModRegistrationData();

            Log($"Version {ModVersion} ready");
            return data;
        }

        private void StartHttp()
        {
            Log("Starting HTTP server...");

            string assemblyDir = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
            string wwwRoot = assemblyDir + "/wwwroot";
            Log("Serving assets from " + wwwRoot);

            _httpHost = new HttpHost(wwwRoot, 1338);
            _httpHost.LogOutput = (data, str) =>
            {
                LogWarning(data);
            };
            _httpHost.Start();

            Log("Listening for requests on port " + _httpHost.Port);
        }

        private void PatchHarmony()
        {
            try
            {
                Log("Applying Harmony patches");

                _harmonyInstance = HarmonyInstance.Create(ModName);
                _harmonyInstance.PatchAll(Assembly.GetExecutingAssembly());
            }
            catch (Exception exc)
            {
                LogWarning("Harmony Initialization Error: " + exc);
            }
        }

        internal void BuildOrdersCallback(Segment segment, bool result)
        {
            //MapPartContainer.SegmentToCoords(segment.baseX, segment.baseZ, out int segOriX, out int segOriZ);
            //var part = partContainer.GetPart(segOriX, segOriZ);
            //if (part != null)
            //{
            //    part.HasBeenDrawn = false;
            //    part.LastBuild = 0;
            //}
        }
    }
}