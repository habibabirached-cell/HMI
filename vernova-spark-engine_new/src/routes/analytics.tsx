import { createFileRoute } from "@tanstack/react-router";
import { AnalyticsPage } from "@/components/scada/AnalyticsPage";
import type { NetworkModel } from "@/components/scada/NetworkDiagram";
import type { HybridType } from "@/lib/types";

interface SearchParams {
  model?: NetworkModel;
  hybrid?: HybridType;
}

export const Route = createFileRoute("/analytics")({
  validateSearch: (search: Record<string, unknown>): SearchParams => {
    return {
      model: (search.model as NetworkModel) || "SMIB",
      hybrid: (search.hybrid as HybridType) || "GFMe",
    };
  },
  head: () => ({
    meta: [
      { title: "GE Vernova FLEXIQsim — IBR Farm Stabilization Analytics" },
      {
        name: "description",
        content: "IBR Farm Stabilization analytics: telemetry, events, and playback.",
      },
    ],
  }),
  component: AnalyticsPage,
});
