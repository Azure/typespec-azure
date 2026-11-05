import {
  FluentProvider,
  MessageBar,
  MessageBarBody,
  webLightTheme,
} from "@fluentui/react-components";
import { MANIFEST } from "@typespec/compiler";
import PlaygroundManifest from "@typespec/playground/manifest";
import {
  Footer,
  FooterItem,
  FooterVersionItem,
  StandalonePlayground,
} from "@typespec/playground/react";
import { SwaggerUIViewer } from "@typespec/playground/react/viewers";
import "@typespec/playground/styles.css";
import { registerMonacoDefaultWorkersForVite } from "@typespec/playground/vite/workers";
import { createRoot } from "react-dom/client";
import samples from "../samples/dist/samples.js";
import { loadCSharpEmitters } from "./csharp-emitters.js";
import { useImportCommandBarItem } from "./import.js";
import "./style.css";

registerMonacoDefaultWorkersForVite();

declare const __PR__: string | undefined;
declare const __COMMIT_HASH__: string | undefined;

const commit = typeof __COMMIT_HASH__ !== "undefined" ? __COMMIT_HASH__ : undefined;
const pr = typeof __PR__ !== "undefined" ? __PR__ : undefined;
let csharpEmitters: string[] = [];
let csharpError: string | undefined;
try {
  csharpEmitters = await loadCSharpEmitters();
} catch (error) {
  csharpError = error instanceof Error ? error.message : String(error);
}
const libraries = [...PlaygroundManifest.libraries, ...csharpEmitters];
const PlaygroundFooter = () => {
  const prItem = pr ? (
    <FooterItem link={`https://github.com/azure/typespec-azure/pull/${pr}`}>
      <span>PR </span>
      <span>{pr}</span>
    </FooterItem>
  ) : (
    <></>
  );

  return (
    <Footer className={pr && "pr-footer"}>
      {prItem}
      <FooterVersionItem />
      <FooterItem link={`https://github.com/microsoft/typespec/commit/${commit}`}>
        <span>Commit </span>
        <span>{MANIFEST.commit.slice(0, 6)}</span>
      </FooterItem>
    </Footer>
  );
};

const onFileBug = () => {
  const bodyPayload = encodeURIComponent(`\n\n\n[Playground Link](${document.location.href})`);
  const url = `https://github.com/Azure/typespec-azure/issues/new?body=${bodyPayload}`;
  window.open(url, "_blank");
};

const App = () => {
  const importItem = useImportCommandBarItem();

  return (
    <StandalonePlayground
      {...PlaygroundManifest}
      libraries={libraries}
      deferredEmitters={csharpEmitters}
      samples={samples}
      emitterViewers={{
        "@typespec/openapi3": [SwaggerUIViewer],
        "@azure-tools/typespec-autorest": [SwaggerUIViewer],
        "@azure-tools/typespec-client-generator-core": [SwaggerUIViewer],
      }}
      importConfig={{ useShim: true }}
      footer={<PlaygroundFooter />}
      commandBarItems={[importItem]}
      onFileBug={onFileBug}
    />
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(
  <FluentProvider
    theme={webLightTheme}
    style={{ height: "100vh", display: "flex", flexDirection: "column" }}
  >
    {csharpError && (
      <MessageBar intent="warning">
        <MessageBarBody>
          Azure C# emitters are unavailable: {csharpError} Other emitters remain available.
        </MessageBarBody>
      </MessageBar>
    )}
    <div style={{ flex: 1, minHeight: 0 }}>
      <App />
    </div>
  </FluentProvider>,
);
