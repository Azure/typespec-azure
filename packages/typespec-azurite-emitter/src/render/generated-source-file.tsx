import type { Children } from "@alloy-js/core";
import * as ts from "@alloy-js/typescript";
import { GENERATED_FILE_HEADER } from "./file-header.js";

export function GeneratedSourceFile(props: { path: string; children?: Children }) {
  return (
    <ts.SourceFile path={props.path} header={GENERATED_FILE_HEADER}>
      {props.children}
    </ts.SourceFile>
  );
}
