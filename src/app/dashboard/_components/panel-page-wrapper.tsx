import { type ReactNode } from "react";

interface PanelPageWrapperProps {
  children: ReactNode;
}

/**
 * Wrapper component for panel pages to ensure consistent structure
 * This component provides the basic layout structure that was previously
 * handled by the BioView component
 */
export function PanelPageWrapper({ children }: PanelPageWrapperProps) {
  return <div className="flex-1 overflow-y-auto p-6">{children}</div>;
}
