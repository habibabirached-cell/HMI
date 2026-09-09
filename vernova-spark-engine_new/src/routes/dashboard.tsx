import { createFileRoute } from "@tanstack/react-router";
import { WindFarmDashboard } from "@/components/scada/windfarm/WindFarmDashboard";

/** Backup / legacy wind-farm page (previous home-card target). Primary UI is `/windfarmstability`. */
export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "GE Vernova FLEXIQsim — IBR Farm Stabilization (Legacy Backup)" },
      {
        name: "description",
        content:
          "Legacy FLEXIQsim IBR Farm Stabilization backup route. Primary experience: /windfarmstability.",
      },
      { property: "og:title", content: "GE Vernova FLEXIQsim IBR Farm Stabilization (Legacy)" },
    ],
  }),
  component: WindFarmDashboard,
});
