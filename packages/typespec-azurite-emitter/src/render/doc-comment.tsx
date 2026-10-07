import * as ts from "@alloy-js/typescript";

export interface DocCommentProps {
  doc: string | undefined;
}

export function DocComment(props: DocCommentProps) {
  if (props.doc === undefined) return null;

  return (
    <>
      <ts.JSDocComment>{props.doc}</ts.JSDocComment>
      <hbr />
    </>
  );
}
