import { createTypeSpecLibrary } from "@typespec/compiler";

export const $lib = createTypeSpecLibrary({
  name: "@azure-tools/typespec-azure-portal-core",
  diagnostics: {
    invalidType: {
      severity: "error",
      messages: {
        aboutDisplayName: `invalidType for $about.displayName.`,
        aboutKeywords: `invalidType for $about.keywords.`,
        aboutKeywordsItem: `invalidType for $about.keywords : only accept string item.`,
        aboutLearnMoreDocs: `invalidType for $about.LearnMoreDocs.`,
        aboutLearnMoreDocsItem: `invalidType for $about.keywords : only accept string item.`,
        marketplaceOfferId: `invalidType for $marketplaceOffer.id.`,
      },
    },
    fileNotFound: {
      severity: "error",
      messages: {
        browseargQuery: `cannot find file argQuery`,
        aboutIcon: `cannot find file icon`,
      },
    },
    invalidUsageDecorator: {
      severity: "error",
      messages: {
        browse: `@browse decorator can be only applied to trackedResource and proxyResource`,
        about: `@about decorator can be only applied to trackedResource and proxyResource`,
        marketPlaceOffer: `@marketPlaceOffer decorator can be only applied to trackedResource and proxyResource`,
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
