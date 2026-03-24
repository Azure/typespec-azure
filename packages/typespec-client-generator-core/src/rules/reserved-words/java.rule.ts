import { createReservedWordRule } from "./create-reserved-word-rule.js";
import { javaReservedWords } from "./words.js";

export const javaReservedWordsRule = createReservedWordRule("java", "Java", javaReservedWords);
