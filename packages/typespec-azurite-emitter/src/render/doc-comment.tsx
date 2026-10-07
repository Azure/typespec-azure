import { code } from "@alloy-js/core";

export interface DocCommentProps {
  doc: string | undefined;
}

export function DocComment(props: DocCommentProps) {
  if (props.doc === undefined) return null;

  return (
    <>
      {code`/** ${props.doc} */`}
      <hbr />
    </>
  );
}
