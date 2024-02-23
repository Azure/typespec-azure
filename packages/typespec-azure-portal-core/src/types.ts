import { EnumMember } from "@typespec/compiler";

export interface FilePath {
  filePath: string;
}

export interface AboutOption {
  icon?: FilePath;
  displayName?: string;
  description?: string;
  keywords?: string[];
  learnMoreDocs?: string[];
}

export interface BrowseOption {
  argQuery?: string | FilePath;
}

export interface marketplaceOfferOption {
  id?: string;
}

export interface PromotionOption {
  readonly apiVersion: string | EnumMember;
  readonly autoUpdate?: boolean;
}
