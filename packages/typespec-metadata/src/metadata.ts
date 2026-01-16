export interface TypeSpecMetadata {
  /** Fully-qualified namespace, e.g. Contoso.Example. */
  namespace: string;
  /** Documentation from @doc decorator. */
  documentation?: string;
  /** Type of service: 'data' for data plane, 'management' for management plane. */
  type: "data" | "management";
}

export interface LanguagePackageMetadata {
  /** Name of the emitter entry in tspconfig (package or path). */
  emitterName: string;
  /** Package/Binary identifier configured for the language emitter. */
  packageName?: string;
  /** Service namespace configured for the language emitter. */
  namespace?: string;
  /** Output directory for the emitter. */
  outputDir?: string;
  /** Flavor of the emitter (e.g., 'azure'). */
  flavor?: string;
  /** Service directory path for this language emitter. */
  serviceDir?: string;
}

export interface MetadataSnapshot {
  /** Semantic version for the metadata payload schema. */
  emitterVersion: string;
  /** ISO timestamp to simplify debugging when metadata was produced. */
  generatedAt: string;
  /** TypeSpec-level metadata (namespace, documentation, type). */
  typespec: TypeSpecMetadata;
  /** Per-language package metadata extracted from tspconfig, keyed by language. */
  languages: Record<string, LanguagePackageMetadata>;
  /** Absolute tspconfig path when available. */
  sourceConfigPath?: string;
}
