import { createReservedWordRule } from "./create-reserved-word-rule.js";
import { pythonReservedWords } from "./words.js";

export const pythonReservedWordsRule = createReservedWordRule(
  "python",
  "Python",
  pythonReservedWords,
);
