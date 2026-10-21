import { getDoc, paramMessage } from "@typespec/compiler";

export type DocumentationTarget = Parameters<typeof getDoc>[1];

export const documentationMessages = {
  default: paramMessage`The ${"kind"} named '${"name"}' should have a documentation or description, use doc comment /** */ to provide it.`,
  empty: "Descriptions cannot be empty or whitespace-only. Provide a meaningful doc string.",
  uninformative: paramMessage`Description must not match the name of the node it describes. Node name:'${"name"}' Description:'${"description"}'`,
};
