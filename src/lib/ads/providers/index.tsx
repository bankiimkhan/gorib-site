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
}

export function AdProviderRenderer({
  placement,
  provider,
  placeholderMode,
  className = "",
}: AdProviderRendererProps) {
  switch (provider) {
    case "adsense":
      return <AdSenseProvider placement={placement} className={className} />;
    case "custom":
      return <CustomScriptProvider placement={placement} className={className} />;
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
