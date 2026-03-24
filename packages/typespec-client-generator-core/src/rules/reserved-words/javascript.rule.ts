import { createReservedWordRule } from "./create-reserved-word-rule.js";
import { javascriptReservedWords } from "./words.js";

export const javascriptReservedWordsRule = createReservedWordRule(
  "javascript",
  "JavaScript",
  javascriptReservedWords,
);
