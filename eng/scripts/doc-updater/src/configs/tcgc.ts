import type { DocUpdateConfig } from "../config.js";

/**
 * TCGC (TypeSpec Client Generator Core) documentation update config.
 *
 * Agent instructions live in .github/skills/doc-update-tcgc/SKILL.md
 * which is also auto-loaded by Copilot as an Agent Skill.
 */
export const tcgcConfig: DocUpdateConfig = {
  name: "tcgc",
  displayName: "TypeSpec Client Generator Core",
  description:
    "Maintains and updates TCGC documentation including user guides, emitter developer docs, design docs, and Spector test specs.",

  skillPath: ".github/skills/doc-update-tcgc/SKILL.md",

  sourceCodePaths: [
    "packages/typespec-client-generator-core/src/**",
    "packages/typespec-client-generator-core/lib/**",
    "packages/typespec-client-generator-core/generated-defs/**",
    "packages/typespec-client-generator-core/test/**",
  ],

  validationCommands: [
    "cd packages/azure-http-specs && pnpm build && pnpm validate-mock-apis && pnpm cspell && pnpm format && pnpm lint && pnpm regen-docs",
  ],

  focusAreas: {
    all: "Execute across all documentation areas. Prioritize: user docs → emitter docs → design docs → Spector specs.",
    "user-docs":
      "Focus on user documentation in website/src/content/docs/docs/howtos/Generate client libraries/",
    "emitter-docs":
      "Focus on emitter developer documentation in website/src/content/docs/docs/libraries/typespec-client-generator-core/guideline.md",
    "design-docs":
      "Focus on design documents in packages/typespec-client-generator-core/design-docs/",
    spector: "Focus on Spector test coverage in packages/azure-http-specs/specs/",
  },
};
