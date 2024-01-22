import { TypeSpecPlaygroundConfig } from "@azure-tools/typespec-azure-playground-website";
import { useColorMode } from "@docusaurus/theme-common";
import { FluentProvider, webDarkTheme, webLightTheme } from "@fluentui/react-components";
import versions from "@site/playground-versions.json" assert { type: "json" };
import Layout from "@theme/Layout";
import {
  Footer,
  FooterVersionItem,
  StandalonePlayground,
  VersionSelectorProps,
  VersionSelectorVersion,
} from "@typespec/playground/react";
import { SwaggerUIViewer } from "@typespec/playground/react/viewers";
import { FunctionComponent, useMemo } from "react";
import { VersionData } from "./import-map";

import "@typespec/playground/style.css";
import { LoadingSpinner } from "./loading-spinner";

export const FluentLayout = ({ children }) => {
  return (
    <Layout>
      <FluentWrapper>{children}</FluentWrapper>
    </Layout>
  );
};

const FluentWrapper = ({ children }) => {
  const { colorMode } = useColorMode();

  return (
    <FluentProvider theme={colorMode === "dark" ? webDarkTheme : webLightTheme}>
      {children}
    </FluentProvider>
  );
};

export interface WebsitePlaygroundProps {
  versionData: VersionData;
}

export const WebsitePlayground = ({ versionData }: WebsitePlaygroundProps) => {
  const { colorMode } = useColorMode();

  const editorOptions = useMemo(() => {
    return { theme: colorMode === "dark" ? "typespec-dark" : "typespec" };
  }, [colorMode]);

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
  }, []);
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
