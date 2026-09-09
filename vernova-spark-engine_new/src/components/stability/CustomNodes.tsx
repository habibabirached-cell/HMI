import { Handle, Position } from '@xyflow/react';

export function AssetNode({ data }: { data: any }) {
  return (
    <div className="relative flex min-w-[140px] flex-col items-center justify-center rounded-lg border border-lime/30 bg-black/60 p-3 shadow-[0_0_15px_rgba(182,255,0,0.1)] backdrop-blur-md">
      <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-lime">
        Asset
      </div>
      <div className="text-sm font-semibold text-foreground text-center">
        {data.label}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2 !w-2 !border-lime !bg-black"
      />
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2 !w-2 !border-lime !bg-black"
      />
    </div>
  );
}

export function EventNode({ data }: { data: any }) {
  return (
    <div className="relative flex min-w-[140px] flex-col items-center justify-center rounded-lg border border-red-500/30 bg-black/60 p-3 shadow-[0_0_15px_rgba(239,68,68,0.1)] backdrop-blur-md">
      <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-red-400">
        Event
      </div>
      <div className="text-sm font-semibold text-foreground text-center">
        {data.label}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2 !w-2 !border-red-400 !bg-black"
      />
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2 !w-2 !border-red-400 !bg-black"
      />
    </div>
  );
}

export function BusNode({ data }: { data: any }) {
  return (
    <div className="relative flex h-4 w-[600px] items-center justify-center rounded-full bg-white/20 shadow-[0_0_10px_rgba(255,255,255,0.2)]">
      <div className="absolute -top-6 text-[10px] font-bold uppercase tracking-widest text-white/50">
        Grid Entry Point (GEP)
      </div>
      <Handle
        type="target"
        position={Position.Top}
        className="!h-full !w-full !opacity-0"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-full !w-full !opacity-0"
      />
    </div>
  );
}
