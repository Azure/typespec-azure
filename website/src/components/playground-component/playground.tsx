import { TypeSpecPlaygroundConfig } from "@azure-tools/typespec-azure-playground-website";
import { useTheme } from "@typespec/astro-utils/utils/theme-react";

import {
  Footer,
  FooterVersionItem,
  StandalonePlayground,
  type VersionSelectorProps,
  type VersionSelectorVersion,
} from "@typespec/playground/react";
import { SwaggerUIViewer } from "@typespec/playground/react/viewers";
import { type FunctionComponent, useMemo } from "react";
import versions from "../../../playground-versions.json";
import { type VersionData } from "./import-map";
import { LoadingSpinner } from "./loading-spinner";

import "@typespec/playground/styles.css";

export interface WebsitePlaygroundProps {
  versionData: VersionData;
}

export const WebsitePlayground = ({ versionData }: WebsitePlaygroundProps) => {
  const theme = useTheme();

  const editorOptions = useMemo(() => {
    return { theme: theme === "dark" ? "typespec-dark" : "typespec" };
  }, [theme]);

  return (
    <StandalonePlayground
      {...TypeSpecPlaygroundConfig}
      emitterViewers={{
        "@typespec/openapi3": [SwaggerUIViewer],
        "@azure-tools/typespec-autorest": [SwaggerUIViewer],
      }}
      importConfig={{ useShim: true }}
      editorOptions={editorOptions}
      footer={<PlaygroundFooter versionData={versionData} />}
      fallback={<LoadingSpinner message="Loading libraries..." />}
      onFileBug={fileBugToGithub}
    />
  );
};

const fileBugToGithub = () => {
  const bodyPayload = encodeURIComponent(`\n\n\n[Playground Link](${document.location.href})`);
  const url = `https://github.com/Azure/typespec-azure/issues/new?body=${bodyPayload}`;
  window.open(url, "_blank");
};

interface PlaygroundFooterProps {
  versionData: VersionData;
}

const PlaygroundFooter: FunctionComponent<PlaygroundFooterProps> = ({ versionData }) => {
  const versionSelectorProps: VersionSelectorProps = useMemo(() => {
    return {
      versions: versions.map((x) => ({ name: x, label: x })),
      selected: versionData.resolved,
      latest: versionData.latest,
      onChange: changeVersion,
    };
  }, [versionData.resolved, versionData.latest]);
  return (
    <Footer>
      <FooterVersionItem versionSelector={versionSelectorProps} />
    </Footer>
  );
};

function changeVersion(version: VersionSelectorVersion): void {
  const query = new URLSearchParams(window.location.search);
  query.set("version", version.name);
  const newUrl = window.location.pathname + "?" + query.toString();
  window.location.replace(newUrl);
}
