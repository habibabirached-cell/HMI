import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";

function RenewablePage() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground p-8">
      <Link to="/" className="absolute top-8 left-8 flex items-center gap-2 text-lime hover:opacity-80">
        <ArrowLeft className="h-4 w-4" /> Back to Home
      </Link>
      <h1 className="text-4xl font-display font-bold uppercase tracking-widest text-lime mb-4">
        Renewable Stablization
      </h1>
      <p className="text-foreground/70 max-w-lg text-center">
        This use case is currently under construction.
      </p>
    </div>
  );
}

export const Route = createFileRoute("/renewable")({
  component: RenewablePage,
});
