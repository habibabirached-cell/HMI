import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class Canvas3DErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn("3D WebGL rendering error caught by Canvas3DErrorBoundary:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex h-full w-full items-center justify-center p-4 text-center bg-black/80">
            <div className="flex flex-col items-center gap-1.5 font-mono text-xs text-lime/80">
              <span className="font-bold text-amber-400">3D View Unavailable</span>
              <span className="text-[10px] text-white/60">WebGL or model load limit reached</span>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
