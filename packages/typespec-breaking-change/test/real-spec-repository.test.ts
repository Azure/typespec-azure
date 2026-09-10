import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { findRealSpecRepository } from "./real-spec-repository.js";

const temporaryRepositories: string[] = [];

afterEach(() => {
  for (const repository of temporaryRepositories.splice(0)) {
    rmSync(repository, { recursive: true, force: true });
  }
});

describe("real-spec repository discovery", () => {
  it("uses an explicitly configured repository", () => {
    const repository = createSpecsRepository();

    expect(findRealSpecRepository(repository)).toBe(repository);
  });

  it("uses a valid fallback repository", () => {
    const repository = createSpecsRepository();

    expect(findRealSpecRepository(undefined, repository)).toBe(repository);
  });

  it("returns undefined when no repository is available", () => {
    expect(findRealSpecRepository(undefined)).toBeUndefined();
  });

  it("rejects an invalid explicitly configured repository", () => {
    const repository = createTemporaryRepository();

    expect(() => findRealSpecRepository(repository)).toThrow(
      "does not point to an azure-rest-api-specs checkout",
    );
  });
});

function createSpecsRepository(): string {
  const repository = createTemporaryRepository();
  mkdirSync(join(repository, "specification"), { recursive: true });
  writeFileSync(join(repository, "package.json"), "{}");
  return repository;
}

function createTemporaryRepository(): string {
  const repository = mkdtempSync(join(tmpdir(), "typespec-breaking-change-"));
  temporaryRepositories.push(repository);
  return repository;
}
