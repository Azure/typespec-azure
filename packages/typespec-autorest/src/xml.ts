// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

// @typespec/xml is an optional dependency, so we try to await import it, and need three states:
// 1. Not initialized
// 2. Initialized and the module is not installed
// 3. Initialized and the module is installed

export type XmlModule = XmlModuleAvailable | XmlModuleUnavailable;

export interface XmlModuleUnavailable {
  readonly available: false;
}

export interface XmlModuleAvailable {
  readonly available: true;
  // test remove
  readonly module: typeof import("@typespec/xml");
}

let XML_MODULE: XmlModule | undefined;

export async function resolveXmlModule(): Promise<XmlModule> {
  if (XML_MODULE) return XML_MODULE;

  try {
    const module = await import("@typespec/xml");

    XML_MODULE = { available: true, module };
  } catch {
    XML_MODULE = { available: false };
  }

  return XML_MODULE;
}
