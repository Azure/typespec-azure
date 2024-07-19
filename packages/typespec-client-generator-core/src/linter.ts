import { defineLinter } from "@typespec/compiler";
import { requireClientSuffixRule } from "./rules/require-client-suffix.js";


export const $linter = defineLinter({
  rules: [requireClientSuffixRule],
});
