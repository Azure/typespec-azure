export const scenarioTiers = {
  default: "Core",
  tiers: {
    Core: [], // Since default is "core", this tier will be used for all scenarios that don't specify a different tier. Empty will catch all scenarios not explicitly categorized in other tiers.
    Backlog: [],
  },
};
