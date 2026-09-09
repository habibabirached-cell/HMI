import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { NoFullScreen } from "../lib/appConfig";
import { requestAppFullscreen } from "@/components/scada/AppWindowControls";
import { BackendStatusBanner } from "@/components/scada/BackendStatusBanner";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "FLEXIQsim" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "theme-color", content: "#004745" },
      { name: "format-detection", content: "telephone=no" },
      { title: "GE Vernova FLEXIQsim" },
      { name: "description", content: "GE Vernova FLEXIQsim: IBR Farm Stabilization and Stability Characterization SCADA platform." },
      { name: "author", content: "GE Vernova" },
      { property: "og:title", content: "GE Vernova FLEXIQsim" },
      { property: "og:description", content: "GE Vernova FLEXIQsim: IBR Farm Stabilization and Stability Characterization SCADA platform." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@GEVernova" },
      { name: "twitter:title", content: "GE Vernova FLEXIQsim" },
      { name: "twitter:description", content: "GE Vernova FLEXIQsim: IBR Farm Stabilization and Stability Characterization SCADA platform." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/1d2f8039-e213-4540-b5ff-c33fddc068c4/id-preview-5123afb1--2c10f4d0-4fe2-4a53-890e-9566a0c1fce9.lovable.app-1781715968147.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/1d2f8039-e213-4540-b5ff-c33fddc068c4/id-preview-5123afb1--2c10f4d0-4fe2-4a53-890e-9566a0c1fce9.lovable.app-1781715968147.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    if (NoFullScreen) return undefined;

    // Attempt auto-fullscreen on application launch and on first user interaction anywhere
    const triggerFullscreen = () => {
      requestAppFullscreen();
    };

    // Immediate attempt on load/mount
    triggerFullscreen();

    // Catch any earliest user gesture
    const events = ["click", "touchstart", "pointerdown", "mousedown", "keydown", "focus"];
    events.forEach((ev) => window.addEventListener(ev, triggerFullscreen, { passive: true }));

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, triggerFullscreen));
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BackendStatusBanner />
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <Toaster />
    </QueryClientProvider>
  );
}

