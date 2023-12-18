import { createTypeSpecLibrary } from "@typespec/compiler";

export const $lib = createTypeSpecLibrary({
  name: "@azure-tools/typespec-azure-portal-core",
  diagnostics: {
    fileNotFound: {
      severity: "error",
      messages: {
        browseargQuery: `cannot find @browse file argQuery`,
        aboutIcon: `cannot find @about file icon`,
      },
    },
    invalidUsageDecorator: {
      severity: "error",
      messages: {
        browse: `@browse decorator can be only applied to trackedResource and proxyResource`,
        about: `@about decorator can be only applied to trackedResource and proxyResource`,
        marketplaceOffer: `@marketPlaceOffer decorator can be only applied to trackedResource and proxyResource`,
      },
    },
    "essentials-maximum-usage": {
      severity: "error",
      messages: {
        default: `essentials can be only used 5 times in ModelProperty.`,
      },
    },
  },
} as const);

// Optional but convenient, those are meant to be used locally in your library.
export const { reportDiagnostic, createDiagnostic, createStateSymbol } = $lib;
