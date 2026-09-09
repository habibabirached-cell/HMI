import { useState } from "react";
import { ScadaAccordion, ScadaOption } from "./ScadaAccordion";

export interface Opt {
  value: string;
  label: string;
}

export function ScadaDropdown({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: Opt[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value)?.label ?? value;

  return (
    <ScadaAccordion
      label={title}
      selectedLabel={selected}
      open={open}
      onToggle={() => setOpen((o) => !o)}
    >
      {options.map((o) => (
        <ScadaOption
          key={o.value}
          active={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </ScadaOption>
      ))}
    </ScadaAccordion>
  );
}
