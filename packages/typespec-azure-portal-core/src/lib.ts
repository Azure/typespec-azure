import { createTypeSpecLibrary, paramMessage } from "@typespec/compiler";

export const $lib = createTypeSpecLibrary({
  name: "@azure-tools/typespec-azure-portal-core",
  diagnostics: {
    "file-not-found": {
      severity: "error",
      messages: {
        default: paramMessage`cannot find @${"decoratorName"} file ${"propertyName"} from path ${"filePath"}`,
      },
    },
    "invalid-type": {
      severity: "error",
      messages: {
        iconSvg: paramMessage`@about.icon.filePath only allows svg file, current file: ${"filePath"}`,
        argQueryFile: paramMessage`@browse.argQuery.filePath only allows kql or kml file, current file: ${"filePath"}`,
        argQueryString: paramMessage`@browse.argQuery only allows literal string query value, current query: ${"query"}`,
      },
    },
    "not-a-resource": {
      severity: "error",
      messages: {
        browse: `@browse can only be applied to TrackedResource models`,
        default: paramMessage`@${"decoratorName"} can only be applied to TrackedResource and ProxyResource models`,
      },
    },
    "invalid-offer-id": {
      severity: "error",
      messages: {
        marketplaceOfferId: `@marketplaceOffer id cannot have a blank space.`,
      },
    },
    "too-many-essentials": {
      severity: "error",
      messages: {
        default: `essentials can be only used 5 times in ModelProperty.`,
      },
    },
    "invalid-apiversion": {
      severity: "error",
      messages: {
        versionsList: paramMessage`@promotion apiVersion ${"version"} is not listed on ARM service API Version lists`,
        serviceVersion: paramMessage`@promotion apiVersion ${"version"} is not same as the @service.version`,
        promotionVersion: paramMessage`@promotion apiVersion ${"version"} is invalid, should be yyyy-mm-dd or yyyy-mm-dd-preview format`,
      },
    },
    "invalid-link": {
      severity: "error",
      messages: {
        default: paramMessage`@about learnMoreDocs ${"link"} does not start with https://`,
      },
    },
  },
  state: {
    browse: { description: "State for the @browse decorator" },
    about: { description: "State for the @about decorator" },
    marketplaceOffer: { description: "State for the @marketplaceOffer decorator" },
    displayName: { description: "State for the @displayName decorator" },
    promotion: { description: "State for the @promotion decorator" },
  },
} as const);

// Optional but convenient, those are meant to be used locally in your library.
export const { reportDiagnostic, createDiagnostic, stateKeys: PortalCoreKeys } = $lib;
