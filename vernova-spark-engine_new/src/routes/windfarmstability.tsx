import { createFileRoute } from "@tanstack/react-router";
import { WindFarmStabilityDashboard } from "@/components/scada/windfarm/WindFarmStabilityDashboard";

export const Route = createFileRoute("/windfarmstability")({
  head: () => ({
    meta: [
      { title: "GE Vernova FLEXIQsim — IBR Farm Stabilization" },
      {
        name: "description",
        content:
          "FLEXIQsim IBR Farm Stabilization: SMIB/MMIB/Two-Area models, GFM e-STATCOM hybrids, events, and CB OFF/ON PCC analytics.",
      },
      { property: "og:title", content: "GE Vernova FLEXIQsim IBR Farm Stabilization" },
    ],
  }),
  component: WindFarmStabilityDashboard,
});
