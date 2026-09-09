import { useState } from "react";
import { ScadaAccordion, ScadaOption } from "./ScadaAccordion";

const EVENTS = [
  { value: "LINE_TRIP", label: "Line Trip" },
  { value: "LOAD", label: "Load" },
  { value: "PQ_CHANGE", label: "P Q change" },
  { value: "FAULT_3PH", label: "3-ph Fault" },
  { value: "GEN_TRIP", label: "Generator Trip" },
];

export function EventsPanel({
  active,
  onTrigger,
}: {
  active: string | null;
  onTrigger: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = EVENTS.find((e) => e.value === active)?.label;

  return (
    <ScadaAccordion
      label="Events"
      selectedLabel={selected ?? "None"}
      open={open}
      onToggle={() => setOpen((o) => !o)}
      variant="accent"
    >
      {EVENTS.map((e) => (
        <ScadaOption
          key={e.value}
          active={active === e.value}
          onClick={() => onTrigger(e.value)}
        >
          {e.label}
        </ScadaOption>
      ))}
    </ScadaAccordion>
  );
}
