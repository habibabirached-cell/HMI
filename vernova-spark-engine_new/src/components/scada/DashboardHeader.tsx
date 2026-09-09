import { Link } from "@tanstack/react-router";
import { GeLogo } from "./icons";
import { Home, Settings, Pencil, Save, Zap, CircleHelp, Sun, Moon, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppWindowControls } from "./AppWindowControls";
import type { NetworkModel } from "./NetworkDiagram";
import type { HybridType } from "@/lib/types";

export function DashboardHeader({
  matchedUseCaseName,
  csvLoading,
  editMode,
  onToggleEdit,
  onSave,
  onOpenSettings,
  onOpenHelp,
  cbOn,
  onToggleCb,
  theme,
  onToggleTheme,
  model,
  hybrid,
}: {
  matchedUseCaseName?: string;
  csvLoading?: boolean;
  editMode: boolean;
  onToggleEdit: () => void;
  onSave: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  cbOn: boolean;
  onToggleCb: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  model: NetworkModel;
  hybrid: HybridType;
}) {
  return (
    <header className="dash-header mb-2 rounded-2xl border border-border/40 px-3 py-2 sm:px-4 sm:py-2.5">
      <div className="flex items-center gap-3">
        {/* Brand */}
        <div className="dash-brand flex shrink-0 items-center pr-3 sm:pr-4">
          <img 
            src={theme === 'dark' ? "/logos/ge_vernova_white.svg" : "/logos/ge_vernova_evergreen.svg"} 
            alt="GE Vernova" 
            className="h-12 sm:h-14 md:h-16 lg:h-[68px] w-auto max-w-[260px] sm:max-w-[300px] object-contain object-left" 
          />
        </div>

        <div className="dash-header-divider hidden h-9 w-px shrink-0 sm:block" />

        {/* Title block */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="dash-flexsim-badge shrink-0 rounded-md px-2 py-0.5 text-[10px] font-extrabold normal-case tracking-[0.18em] text-primary-foreground">
              FLEXIQsim
            </span>
            <h1 className="truncate font-display text-[11px] font-bold uppercase leading-tight text-lime sm:text-xs md:text-sm">
              IBR Farm Stabilization
            </h1>
          </div>
          {(matchedUseCaseName || csvLoading) && (
            <div className="mt-1 flex items-center gap-2 overflow-hidden">
              <span className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full border border-lime/25 bg-lime/8 px-2 py-0.5 text-[10px] text-foreground/75">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-lime shadow-[0_0_6px_var(--lime)]" />
                <span className="truncate">
                  {matchedUseCaseName}
                  {csvLoading && " · loading CSV…"}
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Toolbar */}
        <div className="dash-toolbar flex shrink-0 items-center gap-1 rounded-xl border border-border/50 p-1 sm:gap-1.5 sm:p-1.5">
          <Link to="/" className="dash-tool-btn" title="Home">
            <Home className="h-4 w-4" />
            <span className="sr-only">Home</span>
          </Link>
          <button type="button" onClick={onOpenHelp} className="dash-tool-btn" title="Help & user guide">
            <CircleHelp className="h-4 w-4" />
            <span className="sr-only">Help</span>
          </button>
          <button type="button" onClick={onOpenSettings} className="dash-tool-btn" title="Use case configuration">
            <Settings className="h-4 w-4" />
            <span className="sr-only">Settings</span>
          </button>
          <button
            type="button"
            onClick={onToggleTheme}
            className="dash-tool-btn"
            title={theme === "dark" ? "Switch to classic teal" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span className="sr-only">Toggle Theme</span>
          </button>

          <Link
            to="/analytics"
            search={{ model, hybrid }}
            className="dash-tool-btn dash-tool-btn--labeled"
            title="Open Analytics Console"
          >
            <BarChart3 className="h-3.5 w-3.5 text-lime" />
            <span className="hidden text-[11px] font-bold sm:inline">Analytics</span>
          </Link>

          <div className="mx-0.5 hidden h-6 w-px bg-border/60 sm:block" />

          <button
            type="button"
            onClick={onToggleEdit}
            className={cn("dash-tool-btn dash-tool-btn--labeled", editMode && "dash-tool-btn--active")}
            title={editMode ? "Exit edit mode" : "Edit network"}
          >
            <Pencil className="h-3.5 w-3.5" />
            <span className="hidden text-[11px] font-bold sm:inline">{editMode ? "Editing" : "Edit"}</span>
          </button>

          {editMode && (
            <button
              type="button"
              onClick={onSave}
              className="dash-tool-btn dash-tool-btn--labeled dash-tool-btn--save"
              title="Save network layout"
            >
              <Save className="h-3.5 w-3.5" />
              <span className="hidden text-[11px] font-bold sm:inline">Save</span>
            </button>
          )}

          <div className="mx-0.5 hidden h-6 w-px bg-border/60 sm:block" />

          <button
            type="button"
            onClick={onToggleCb}
            className={cn("dash-cb-toggle", cbOn ? "dash-cb-toggle--on" : "dash-cb-toggle--off")}
            title={`Circuit breaker ${cbOn ? "ON" : "OFF"}`}
          >
            <Zap className={cn("h-3.5 w-3.5", cbOn ? "text-lime" : "text-status-off")} />
            <span className="text-[10px] font-bold uppercase tracking-wide sm:text-[11px]">
              CB {cbOn ? "ON" : "OFF"}
            </span>
            <span className={cn("dash-cb-led", cbOn ? "bg-lime" : "bg-status-off")} />
          </button>

          <div className="mx-0.5 hidden h-6 w-px bg-border/60 sm:block" />
          <AppWindowControls showLabels />
        </div>
      </div>
    </header>
  );
}
