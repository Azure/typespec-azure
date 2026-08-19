/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging -- codemodel intentionally merges interface and class declarations of the same name to define its public API shape. */

import * as module from "./module.js";
import { type GoEmitterOptions } from "../lib.js";

/** a Go-specific abstraction over REST endpoints */
export interface CodeModel {
  /** the info for this code model */
  info: Info;

  /** the service type for this code model */
  type: CodeModelType;

  /** contains the options for this code model */
  options: Options;

  /** package metadata */
  metadata?: {};

  /** the root container of content to emit */
  root: module.ContainingModule | module.Module;
}

/** the service type that the code model represents */
export type CodeModelType = "azure-arm" | "data-plane";

/** contains top-level info about the input source */
export interface Info {
  title: string;
}

/**
 * contains global options set on the CodeModel.
 * most of the values come from command-line args.
 */
export interface Options extends GoEmitterOptions {
  /**
   * the header text to emit per file. usually contains license and copyright info.
   * the default is the MIT license with a Microsoft copyright.
   */
  headerText?: string;

  /**
   * custom content for the LICENSE.txt file to be emitted.
   * the default is the MIT license with a Microsoft copyright.
   */
  licenseText?: string;

}

///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////

export class CodeModel implements CodeModel {
  constructor(
    info: Info,
    type: CodeModelType,
    options: Options,
    root: module.ContainingModule | module.Module,
  ) {
    this.info = info;
    this.options = options;
    this.type = type;
    this.root = root;
  }
}

export class Info implements Info {
  constructor(title: string) {
    this.title = title;
  }
}
