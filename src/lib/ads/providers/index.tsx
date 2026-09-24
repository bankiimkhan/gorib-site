import React from "react";
import { AdPlacement, AdProviderType, PlaceholderMode } from "../types";
import { PlaceholderProvider } from "./PlaceholderProvider";
import { AdSenseProvider } from "./AdSenseProvider";
import { CustomScriptProvider } from "./CustomScriptProvider";

export { PlaceholderProvider, AdSenseProvider, CustomScriptProvider };

interface AdProviderRendererProps {
  placement: AdPlacement;
  provider: AdProviderType;
  placeholderMode: PlaceholderMode;
  className?: string;
  /** Called when the slot cannot be filled (blocked, failed, no inventory) so the host can collapse it. */
  onUnfilled?: () => void;
}

export function AdProviderRenderer({
  placement,
  provider,
  placeholderMode,
  className = "",
  onUnfilled,
}: AdProviderRendererProps) {
  switch (provider) {
    case "adsense":
      return <AdSenseProvider placement={placement} className={className} onUnfilled={onUnfilled} />;
    case "custom":
      return <CustomScriptProvider placement={placement} className={className} onUnfilled={onUnfilled} />;
    case "placeholder":
    default:
      return (
        <PlaceholderProvider
          placement={placement}
          mode={placeholderMode}
          className={className}
        />
      );
  }
}
