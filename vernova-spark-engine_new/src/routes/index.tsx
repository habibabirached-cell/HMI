import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/components/scada/HomePage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GE Vernova FLEXIQsim — Renewable Farm Stabilisation" },
      {
        name: "description",
        content: "FLEXIQsim Interactive Showcase — explore hybrid renewable energy stabilisation strategies and network simulation.",
      },
      { property: "og:title", content: "GE Vernova FLEXIQsim" },
    ],
  }),
  component: HomePage,
});
