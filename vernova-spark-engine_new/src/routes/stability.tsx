import { createFileRoute } from "@tanstack/react-router";
import { StabilityDashboard } from "@/components/stability/StabilityDashboard";

export const Route = createFileRoute("/stability")({
  head: () => ({
    meta: [
      { title: "Stability Solution Characterization" },
    ],
  }),
  component: StabilityDashboard,
});
