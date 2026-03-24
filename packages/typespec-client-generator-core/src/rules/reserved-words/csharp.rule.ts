import { createReservedWordRule } from "./create-reserved-word-rule.js";
import { csharpReservedWords } from "./words.js";

export const csharpReservedWordsRule = createReservedWordRule(
  "csharp",
  "C#",
  csharpReservedWords,
);
