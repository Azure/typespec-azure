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
    "not-a-resource": {
      severity: "error",
      messages: {
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
  },
  state: {
    browse: { description: "State for the @browse decorator" },
    about: { description: "State for the @about decorator" },
    marketplaceOffer: { description: "State for the @marketplaceOffer decorator" },
    displayName: { description: "State for the @displayName decorator" },
  },
} as const);

// Optional but convenient, those are meant to be used locally in your library.
export const { reportDiagnostic, createDiagnostic, stateKeys: PortalCoreKeys } = $lib;
