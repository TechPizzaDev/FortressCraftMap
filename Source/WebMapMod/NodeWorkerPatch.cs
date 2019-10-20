using System;
using Harmony;

namespace TechPizza.WebMapMod
{
    [HarmonyPatch(typeof(NodeWorker), "ProcessBuildOrders", typeof(Segment))]
    internal class NodeWorkerPatch
    {
#pragma warning disable IDE0051 // Remove unused private members
        [HarmonyPostfix]
        private static void BuildOrdersCallback(Segment segment, bool __result)
#pragma warning restore IDE0051 // Remove unused private members
        {
            try
            {
                WebMapMod.Instance.BuildOrdersCallback(segment, __result);
            }
            catch (Exception exc)
            {
                WebMapMod.Log("Build Order Callback Exception: " + exc);
            }
        }
    }
}
