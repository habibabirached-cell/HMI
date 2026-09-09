export type NetworkModel = "SMIB" | "MMI" | "TWOAREA";

export function NetworkDiagram({ model, cbOn, editMode }: { model: NetworkModel; cbOn: boolean; editMode?: boolean }) {
  return (
    <svg viewBox="0 0 1180 540" className="h-full w-full text-diagram-line" preserveAspectRatio="xMidYMid meet">
      {/* Clean SCADA grid workspace. Users add components from the library and connect them. */}
    </svg>
  );
}