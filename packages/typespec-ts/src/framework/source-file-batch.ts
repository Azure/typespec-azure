import {
  ExportDeclarationStructure,
  SourceFile,
  StatementStructures,
  StructureKind,
} from "ts-morph";

/**
 * Generic per-source-file batch for ts-morph `add*` mutations.
 *
 * Each individual `sourceFile.addInterface/addFunction/addExportDeclaration/...`
 * call re-parses the entire source file in ts-morph. Calling them in a loop
 * therefore grows as O(N × file_size). This module collects structures while
 * a batch is open and, on flush, issues a single `addStatements` call per file,
 * collapsing N re-parses into 1.
 *
 * The batch is reference-counted so nested begin/flush pairs compose safely.
 * Statements flush in insertion order and produce byte-identical output.
 */

let batchDepth = 0;
const pendingByFile = new Map<SourceFile, StatementStructures[]>();

/**
 * Opens a batching scope. Subsequent `enqueueStatement` calls queue rather
 * than mutate the AST until the matching `flushSourceFileBatch` is called.
 */
export function beginSourceFileBatch(): void {
  batchDepth++;
}

/**
 * Closes the most recent batching scope. When the outermost scope closes,
 * all pending structures are written to their source files in bulk.
 */
export function flushSourceFileBatch(): void {
  if (batchDepth === 0) {
    return;
  }
  batchDepth--;
  if (batchDepth > 0) {
    return;
  }
  try {
    for (const [sourceFile, statements] of pendingByFile) {
      if (statements.length === 0) {
        continue;
      }
      sourceFile.addStatements(statements);
    }
  } finally {
    pendingByFile.clear();
  }
}

/**
 * Queues a statement structure for bulk-add on flush, or writes it
 * immediately when no batch is open.
 * @param sourceFile - Target source file.
 * @param structure - The statement structure to add.
 */
export function enqueueStatement(sourceFile: SourceFile, structure: StatementStructures): void {
  if (batchDepth > 0) {
    let pending = pendingByFile.get(sourceFile);
    if (!pending) {
      pending = [];
      pendingByFile.set(sourceFile, pending);
    }
    pending.push(structure);
    return;
  }
  sourceFile.addStatements([structure]);
}

/**
 * Returns the set of names exported from `sourceFile` considering both the
 * declarations already present in its AST and any export declarations queued
 * by the current batch. Use this in place of reading `getExportDeclarations`
 * directly when callers dedup against existing exports inside a batch.
 * @param sourceFile - The file to inspect.
 */
export function getEffectiveExportedNames(sourceFile: SourceFile): Set<string> {
  const names = new Set<string>();
  for (const decl of sourceFile.getExportDeclarations()) {
    for (const named of decl.getNamedExports()) {
      names.add(named.getAliasNode()?.getText() ?? named.getName());
    }
  }
  const pending = pendingByFile.get(sourceFile);
  if (pending) {
    for (const structure of pending) {
      if (structure.kind !== StructureKind.ExportDeclaration) {
        continue;
      }
      collectNamedExportNames(structure.namedExports, names);
    }
  }
  return names;
}

/**
 * Returns the set of named exports queued in the current batch for
 * `sourceFile`. Use this to union with any AST-based view of exports
 * (e.g. `getExportedDeclarations`) when deduplicating against still-pending
 * writes inside a batch.
 * @param sourceFile - The file to inspect.
 */
export function getQueuedExportNames(sourceFile: SourceFile): Set<string> {
  const names = new Set<string>();
  const pending = pendingByFile.get(sourceFile);
  if (!pending) {
    return names;
  }
  for (const structure of pending) {
    if (structure.kind !== StructureKind.ExportDeclaration) {
      continue;
    }
    collectNamedExportNames(structure.namedExports, names);
  }
  return names;
}

function collectNamedExportNames(
  named: ExportDeclarationStructure["namedExports"],
  into: Set<string>,
): void {
  if (!named || typeof named === "function") {
    // WriterFunction form is opaque to us; callers can't dedup by name.
    return;
  }
  for (const item of named) {
    if (typeof item === "string") {
      into.add(item);
    } else if (typeof item === "function") {
      continue;
    } else if (item) {
      into.add(item.alias ?? item.name);
    }
  }
}
