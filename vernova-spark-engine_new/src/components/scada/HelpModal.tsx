import { useState } from "react";
import {
  X,
  BookOpen,
  Rocket,
  Network,
  Pencil,
  Zap,
  BarChart3,
  Settings,
  ChevronRight,
  Home,
  ToggleLeft,
  Upload,
  MousePointerClick,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SectionId =
  | "overview"
  | "quickstart"
  | "scenarios"
  | "diagram"
  | "edit"
  | "events"
  | "data";

const SECTIONS: { id: SectionId; label: string; icon: typeof BookOpen }[] = [
  { id: "overview", label: "What is FLEXIQsim?", icon: BookOpen },
  { id: "quickstart", label: "Quick start", icon: Rocket },
  { id: "scenarios", label: "Example scenarios", icon: Layers },
  { id: "diagram", label: "Network & telemetry", icon: Network },
  { id: "edit", label: "Edit mode", icon: Pencil },
  { id: "events", label: "Events & replay", icon: Zap },
  { id: "data", label: "CSV & configuration", icon: Settings },
];

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="help-step">
      <span className="help-step__num">{n}</span>
      <div>
        <h4 className="help-step__title">{title}</h4>
        <p className="help-step__body">{children}</p>
      </div>
    </li>
  );
}

function ScenarioCard({
  title,
  network,
  hybrid,
  goal,
  steps,
}: {
  title: string;
  network: string;
  hybrid: string;
  goal: string;
  steps: string[];
}) {
  return (
    <article className="help-scenario-card">
      <div className="help-scenario-card__header">
        <h4 className="help-scenario-card__title">{title}</h4>
        <div className="help-scenario-card__tags">
          <span>{network}</span>
          <span>{hybrid}</span>
        </div>
      </div>
      <p className="help-scenario-card__goal">{goal}</p>
      <ol className="help-scenario-card__steps">
        {steps.map((s, i) => (
          <li key={i}>
            <ChevronRight className="h-3 w-3 shrink-0 text-lime" aria-hidden />
            {s}
          </li>
        ))}
      </ol>
    </article>
  );
}

function SectionOverview() {
  return (
    <div className="help-section">
      <h3 className="help-section__title">Renewable farm stabilisation showcase</h3>
      <p className="help-section__lead">
        FLEXIQsim is an interactive SCADA-style dashboard for exploring how hybrid renewable farms
        (wind, battery storage, grid connection) behave under disturbances — and how stabilisation
        assets such as STATCOM or a synchronous condenser (SynCon) help keep the network secure.
      </p>

      <div className="help-info-grid">
        <div className="help-info-card">
          <Network className="h-5 w-5 text-lime" />
          <h4>Network models</h4>
          <p>
            <strong>SMIB</strong>, <strong>MMIB</strong>, and <strong>Two-Area</strong> diagrams
            represent different grid topologies from the FLEXIQsim study — from a single machine
            infinite bus to a two-area interconnection.
          </p>
        </div>
        <div className="help-info-card">
          <Zap className="h-5 w-5 text-lime" />
          <h4>Hybrid strategies</h4>
          <p>
            <strong>GFM e-STATCOM</strong>, <strong>GFM STATCOM</strong>, or <strong>SynCon</strong>
            change which components appear in the library and which simulation CSV is loaded.
          </p>
        </div>
        <div className="help-info-card">
          <BarChart3 className="h-5 w-5 text-lime" />
          <h4>Live analytics</h4>
          <p>
            Active power, reactive power, voltage, and frequency at the point of common coupling
            (PCC) are shown as live sparklines driven by simulation CSV data.
          </p>
        </div>
      </div>

      <div className="help-callout">
        <strong>What this tool is for:</strong> demonstrating stabilisation concepts to clients and
        engineers — not replacing a full power-system simulator. The built-in diagram is always
        shown; edit mode lets you add extra components on top for configuration experiments.
      </div>
    </div>
  );
}

function SectionQuickstart() {
  return (
    <div className="help-section">
      <h3 className="help-section__title">Get started in five steps</h3>
      <p className="help-section__lead">
        Follow this path on your first visit. No setup is required — sample data is already loaded.
      </p>
      <ol className="help-steps">
        <Step n={1} title="Choose network and hybrid">
          Use the left sidebar: pick a <strong>Network Model</strong> (e.g. SMIB) and a{" "}
          <strong>Hybrid</strong> option (e.g. GFM e-STATCOM). The centre diagram and analytics
          update immediately.
        </Step>
        <Step n={2} title="Observe the network diagram">
          The main canvas shows the reference topology — grid, transmission, wind farm, BESS, and
          stabilisation equipment. Animated lines indicate power flow when the circuit breaker (CB)
          is <strong>ON</strong> (toggle in the top-right toolbar).
        </Step>
        <Step n={3} title="Read live telemetry">
          Below the diagram, two panels show <strong>Grid side (GEP)</strong> and{" "}
          <strong>Wind farm side (RS)</strong> metrics with sparklines. Hover the PCC point on the
          diagram for a quick P / Q / V / f summary.
        </Step>
        <Step n={4} title="Trigger an event">
          Open <strong>Events</strong> on the right sidebar and select e.g. Line Trip or 3-ph Fault.
          If a matching use-case CSV is loaded, analytics jump to that event timestamp and replay.
        </Step>
        <Step n={5} title="Explore further">
          Use <strong>Full view</strong> on the diagram or graphs for presentations. Open{" "}
          <strong>Edit</strong> in the header to place extra components, or the gear icon to
          configure custom use cases.
        </Step>
      </ol>
    </div>
  );
}

function SectionScenarios() {
  return (
    <div className="help-section">
      <h3 className="help-section__title">Example walk-through scenarios</h3>
      <p className="help-section__lead">
        Use these guided paths in client demos. Each combines a network model, hybrid type, and a
        clear story to tell.
      </p>

      <div className="help-scenario-grid">
        <ScenarioCard
          title="SMIB wind farm with GFM e-STATCOM"
          network="SMIB"
          hybrid="GFM e-STATCOM"
          goal="Show how a grid-following STATCOM supports PCC voltage during a line disturbance."
          steps={[
            "Select SMIB + GFM e-STATCOM.",
            "Confirm the header badge shows the matched use-case name and CSV is loading.",
            "Keep CB ON and note steady GEP / RS telemetry.",
            "Trigger Line Trip — CB opens; flow animation stops on affected paths.",
            "Open Analytics to see playback time advance from the event marker.",
          ]}
        />
        <ScenarioCard
          title="SMIB with synchronous condenser"
          network="SMIB"
          hybrid="SynCon"
          goal="Compare SynCon-based stabilisation — library includes generator and capacitor items."
          steps={[
            "Switch Hybrid to SynCon.",
            "Open Component Library — note SynCon and Generator are available.",
            "Click Edit and add a SynCon icon to experiment with layout.",
            "Save layout to store your arrangement for SMIB.",
            "Trigger P Q Change and discuss reactive support at PCC.",
          ]}
        />
        <ScenarioCard
          title="Two-area interconnection"
          network="Two-Area"
          hybrid="GFM STATCOM"
          goal="Demonstrate a larger network with multiple buses and area coupling."
          steps={[
            "Select Two-Area network model.",
            "Use Full view on the diagram for a clearer bus layout.",
            "Trigger Generator Trip or 3-ph Fault from Events.",
            "Compare grid-side vs wind-side panels during the replay window.",
            "Export CSV to share the current trace with stakeholders.",
          ]}
        />
        <ScenarioCard
          title="Custom client CSV workshop"
          network="Any"
          hybrid="Matching hybrid"
          goal="Load your own simulation output and map events to timestamps."
          steps={[
            "Click the gear icon → Create Use Case Configuration.",
            "Name the case, pick network + hybrid, select allowed components, upload CSV.",
            "Add event markers with time (seconds) matching CSV columns.",
            "Save — then select the same network/hybrid on the dashboard.",
            "Click each event to seek and replay analytics at that moment.",
          ]}
        />
      </div>
    </div>
  );
}

function SectionDiagram() {
  return (
    <div className="help-section">
      <h3 className="help-section__title">Network diagram & telemetry</h3>

      <h4 className="help-subtitle">Built-in diagram (always visible)</h4>
      <p className="help-section__lead">
        The SVG network is the authoritative reference layout from the FLEXIQsim GUI specification.
        It is <em>not</em> removed when you exit edit mode — your placed components appear as
        overlays only while editing.
      </p>

      <ul className="help-bullet-list">
        <li>
          <ToggleLeft className="h-4 w-4 text-lime" />
          <span>
            <strong>CB ON / OFF</strong> (header) — simulates breaker state. OFF stops energised
            flow animation and affects metric behaviour for demo events.
          </span>
        </li>
        <li>
          <MousePointerClick className="h-4 w-4 text-lime" />
          <span>
            <strong>PCC hover</strong> — move over the coupling point on the diagram for live P, Q,
            V, and f from the active CSV row.
          </span>
        </li>
        <li>
          <BarChart3 className="h-4 w-4 text-lime" />
          <span>
            <strong>Metric panels</strong> — GEP = grid export point; RS = renewable source side.
            Sparklines scroll as playback advances.
          </span>
        </li>
      </ul>

      <h4 className="help-subtitle mt-6">Full view mode</h4>
      <p className="help-section__lead">
        Use the maximise icon on the diagram or the <strong>Full view</strong> link above the graphs
        for presentation mode on large screens.
      </p>
    </div>
  );
}

function SectionEdit() {
  return (
    <div className="help-section">
      <h3 className="help-section__title">Edit mode — layout & wiring</h3>
      <p className="help-section__lead">
        Edit mode is for experimenting with component placement on top of the reference diagram.
        Changes are saved <strong>per network model</strong> (SMIB, MMI, Two-Area separately).
      </p>

      <ol className="help-steps">
        <Step n={1} title="Enter edit mode">
          Click <strong>Edit</strong> in the header. The diagram gets a lime border; a hint bar
          appears at the bottom.
        </Step>
        <Step n={2} title="Add components">
          Expand <strong>Component Library</strong> (left). Click an icon to place it. The library
          is filtered by your hybrid selection — e.g. SynCon hybrid adds generator and capacitor
          items. Invalid components for the active use case show a toast message.
        </Step>
        <Step n={3} title="Move components">
          Drag any placed icon to reposition it on the canvas.
        </Step>
        <Step n={4} title="Wire connections">
          Click the <strong>⚡</strong> button on a component, then click{" "}
          <strong>Connect here</strong> on another. A dashed line appears in edit mode. Click the
          red × on a line midpoint to remove it.
        </Step>
        <Step n={5} title="Animation control">
          Right-click a placed component → <strong>Animation Off / On</strong> to freeze its icon
          animation during demos.
        </Step>
        <Step n={6} title="Save">
          Click <strong>Save</strong> in the header. Layout persists in your browser for that
          network model. Click Edit again to exit — overlays hide, built-in diagram remains.
        </Step>
      </ol>

      <div className="help-callout help-callout--warn">
        Removing a component: use the red × on the icon (edit mode) or right-click → Remove.
      </div>
    </div>
  );
}

function SectionEvents() {
  return (
    <div className="help-section">
      <h3 className="help-section__title">Events, disturbances & replay</h3>

      <p className="help-section__lead">
        The <strong>Events</strong> panel lists disturbance types used in the FLEXIQsim studies. Selecting
        an event highlights it and drives demo behaviour.
      </p>

      <div className="help-table-wrap">
        <table className="help-table">
          <thead>
            <tr>
              <th>Event</th>
              <th>Typical effect in demo</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Line Trip</td>
              <td>Opens CB; flow animation stops — simulates cleared line outage</td>
            </tr>
            <tr>
              <td>Load Change</td>
              <td>Load step — CB stays closed; metrics shift</td>
            </tr>
            <tr>
              <td>P Q Change</td>
              <td>Active / reactive set-point change at PCC</td>
            </tr>
            <tr>
              <td>3-ph Fault</td>
              <td>Severe fault — CB opens for demo</td>
            </tr>
            <tr>
              <td>Generator Trip</td>
              <td>Generation loss — CB opens for demo</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h4 className="help-subtitle mt-6">CSV event replay</h4>
      <p className="help-section__lead">
        When a use case with event markers is active (shown in the header badge), clicking an event
        seeks the CSV to that timestamp. The <strong>Analytics</strong> panel shows playback time
        and highlights the active marker. This lets you align graphs with simulation study moments
        during client reviews.
      </p>
    </div>
  );
}

function SectionData() {
  return (
    <div className="help-section">
      <h3 className="help-section__title">CSV data & use-case configuration</h3>

      <h4 className="help-subtitle">Automatic CSV loading</h4>
      <p className="help-section__lead">
        Pre-configured use cases ship with sample CSV files. When your network + hybrid selection
        matches a use case, data loads automatically — no import needed for standard demos.
      </p>

      <h4 className="help-subtitle mt-6">Import / export</h4>
      <ul className="help-bullet-list">
        <li>
          <Upload className="h-4 w-4 text-lime" />
          <span>
            <strong>Import CSV</strong> — load ad-hoc simulation output from disk. Sample count
            appears below the buttons.
          </span>
        </li>
        <li>
          <Upload className="h-4 w-4 text-lime" />
          <span>
            <strong>Export CSV</strong> — download the currently loaded trace (named with network
            and CB state).
          </span>
        </li>
      </ul>

      <h4 className="help-subtitle mt-6">Settings (gear icon)</h4>
      <p className="help-section__lead">
        Create a new use-case configuration: name, network, hybrid, allowed components, CSV file,
        and event markers with time in seconds. Saved configurations are stored locally and used
        for matching when you build a compatible component set on the canvas.
      </p>

      <div className="help-callout">
        <strong>Tip for workshops:</strong> prepare one CSV per client scenario in advance, register
        it via Settings, then demo by switching network/hybrid and firing events — no live file
        browsing during the meeting.
      </div>
    </div>
  );
}

const SECTION_CONTENT: Record<SectionId, () => React.ReactNode> = {
  overview: SectionOverview,
  quickstart: SectionQuickstart,
  scenarios: SectionScenarios,
  diagram: SectionDiagram,
  edit: SectionEdit,
  events: SectionEvents,
  data: SectionData,
};

export function HelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [section, setSection] = useState<SectionId>("overview");

  if (!open) return null;

  const Active = SECTION_CONTENT[section];

  return (
    <div className="help-modal" role="dialog" aria-modal="true" aria-labelledby="help-modal-title">
      <div className="help-modal__backdrop" onClick={onClose} aria-hidden />

      <div className="help-modal__panel">
        <header className="help-modal__header">
          <div className="flex items-center gap-3">
            <div className="help-modal__icon-ring">
              <BookOpen className="h-5 w-5 text-lime" />
            </div>
            <div>
              <h2 id="help-modal-title" className="help-modal__title">
                FLEXIQsim user guide
              </h2>
              <p className="help-modal__subtitle">
                How to operate the renewable farm stabilisation dashboard
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="help-modal__close" aria-label="Close help">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="help-modal__body">
          <nav className="help-modal__nav" aria-label="Help sections">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setSection(id)}
                className={cn("help-modal__nav-btn", section === id && "help-modal__nav-btn--active")}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <div className="help-modal__content">
            <Active />
          </div>
        </div>

        <footer className="help-modal__footer">
          <span className="flex items-center gap-1.5 text-foreground/50">
            <Home className="h-3.5 w-3.5" />
            Return home anytime via the house icon in the toolbar
          </span>
          <button type="button" onClick={onClose} className="help-modal__done-btn">
            Got it — close guide
          </button>
        </footer>
      </div>
    </div>
  );
}
