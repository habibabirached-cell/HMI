import React from 'react';

export const ASSET_COMPONENTS = [
  { id: 'grid', label: 'Grid', type: 'assetNode' },
  { id: 'gfl_bess', label: 'GFL BESS', type: 'assetNode' },
  { id: 'gfm_bess', label: 'GFM BESS', type: 'assetNode' },
  { id: 'syncon', label: 'Synchronous Condenser', type: 'assetNode' },
  { id: 'gfme_statcom', label: 'GFM e-STATCOM', type: 'assetNode' },
  { id: 'gfm_statcom', label: 'GFM STATCOM', type: 'assetNode' },
  { id: 'breaker', label: 'Breaker', type: 'assetNode' },
  { id: 'gep', label: 'GEP', type: 'assetNode' },
  { id: 'cfg1', label: 'CFG1 Syncon+Transformer', type: 'assetNode' },
  { id: 'fault', label: 'Three Phase Bolted Fault', type: 'eventNode' },
  { id: 'rocof', label: 'RoCoF', type: 'eventNode' },
];

export function AssetLibrary() {
  const onDragStart = (event: React.DragEvent<HTMLDivElement>, nodeType: string, label: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/reactflow-label', label);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="w-64 border-r border-white/10 bg-black/40 backdrop-blur-md p-4 flex flex-col gap-4 overflow-y-auto">
      <div className="text-xs font-bold uppercase tracking-widest text-lime/70 mb-2">
        Asset Library
      </div>
      <div className="flex flex-col gap-3">
        {ASSET_COMPONENTS.map((asset) => (
          <div
            key={asset.id}
            className="cursor-grab rounded-md border border-white/10 bg-white/5 p-3 text-sm font-medium text-foreground hover:border-lime/30 hover:bg-lime/10 transition-colors"
            onDragStart={(event) => onDragStart(event, asset.type, asset.label)}
            draggable
          >
            {asset.label}
          </div>
        ))}
      </div>
    </aside>
  );
}
