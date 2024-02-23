import "../dist/src/index.js";

using TypeSpec.Reflection;
namespace Azure.Portal;

/**
 * Provides a Model describing about of ARM resource.
 * @param options Property options allows more detailed infomation about the resourceType.
 */
extern dec about(target: Model, options: AboutOptions);

/**
 * Provides a Model customizing browse view of ARM resource.
 * @param options Property options provides browsing information of the resourceType.
 */
extern dec browse(target: Model, options: BrowseOptions);

/**
 * Provides a Model customizing deployment promotion apiVersion for ARM resource.
 * The apiVersion will be used as a version to deploy to Portal.
 * @param options Property options provides promotion information of the resourceType.
 */
extern dec promotion(target: Model, options: PromotionOptions);

/**
 * Provides a Model marketplace offer information of ARM resource.
 * @param options Property options provides marketplace offer information of the resourceType.
 */
extern dec marketplaceOffer(target: Model, options: marketplaceOfferOptions);

/**
 * Provides a Model Property a display name
 */
extern dec displayName(target: ModelProperty, name: valueof string);

// this decorator will be available in next iteration
//extern dec essentials(target: ModelProperty);

/** Options for browse of ARM resource. */
model BrowseOptions {
  /** argQuery can be a literal string query or KQL file path.
   * KQL query which represents all possible data for your desired browse view.
   */
  argQuery?: string | FilePath;
}

/** File path of a file */
model FilePath {
  /** File path of a file */
  filePath: string;
}

/** Options for marketplaceOffer */
model marketplaceOfferOptions {
  /** Marketplace offer id of a resource */
  id?: string;
}

/** Options for about of ARM resource. */
model AboutOptions {
  /** Icon which represent resource */
  icon?: FilePath;

  /** Display name which represent the resource */
  displayName?: string;

  /** Comma-separated set of words or phrases which allow users to search for your asset by identifiers. */
  keywords?: string[];

  /** Set of links which can help learn more about the resource */
  learnMoreDocs?: string[];
}

/** Options for promotion of ARM resource. */
model PromotionOptions {
  apiVersion: string | EnumMember;
  autoUpdate?: boolean;
}
