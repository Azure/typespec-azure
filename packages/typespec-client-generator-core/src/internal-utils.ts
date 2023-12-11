export function parseEmitterName(emitterName?: string): string {
  if (!emitterName) {
    throw new Error("No emitter name found in program");
  }
  const regex = /.*(?:cadl|typespec)-([^\\/]*)/;
  const match = emitterName.match(regex);
  if (!match || match.length < 2) return "none";
  const language = match[1];
  if (["typescript", "ts"].includes(language)) return "javascript";
  return language;
}
