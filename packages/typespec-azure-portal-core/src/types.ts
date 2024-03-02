import { EnumMember } from "@typespec/compiler";

export interface FilePath {
  filePath: string;
}

export interface AboutOptions {
  icon?: FilePath;
  displayNames?: DisplayNamesOptions;
  description?: string;
  keywords?: string[];
  learnMoreDocs?: LearnMoreDocsOptions[];
}

export interface BrowseOptions {
  argQuery?: string | FilePath;
}

export interface MarketplaceOfferOptions {
  id?: string;
}

export interface PromotionOptions {
  readonly apiVersion: string | EnumMember;
  readonly autoUpdate?: boolean;
}

export interface LearnMoreDocsOptions {
  title: string;
  uri: string;
}

export interface DisplayNamesOptions {
  singular: string;
  plural: string;
}
