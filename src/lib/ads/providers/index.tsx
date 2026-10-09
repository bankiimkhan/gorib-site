import React from "react";
import { AdPlacement, AdProviderType, PlaceholderMode } from "../types";
import { PlaceholderProvider } from "./PlaceholderProvider";
import { CustomScriptProvider } from "./CustomScriptProvider";

export { PlaceholderProvider, CustomScriptProvider };

interface AdProviderRendererProps {
  placement: AdPlacement;
  provider: AdProviderType;
  placeholderMode: PlaceholderMode;
  className?: string;
  /** The provider has confirmed that this slot contains a creative. */
  onFilled?: () => void;
  /** Called when the slot cannot be filled (blocked, failed, no inventory) so the host can collapse it. */
  onUnfilled?: () => void;
}

export function AdProviderRenderer({
  placement,
  provider,
  placeholderMode,
  className = "",
  onFilled,
  onUnfilled,
}: AdProviderRendererProps) {
  switch (provider) {
    case "custom":
      return <CustomScriptProvider placement={placement} className={className} onFilled={onFilled} onUnfilled={onUnfilled} />;
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
