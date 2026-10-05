import { Caption1, makeStyles, Subtitle2, tokens } from "@fluentui/react-components";
import type { ReactNode } from "react";

const useStyles = makeStyles({
  header: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalM,
  },
  heading: {
    display: "flex",
    alignItems: "baseline",
    gap: tokens.spacingHorizontalM,
    minWidth: 0,
  },
  hint: {
    color: tokens.colorNeutralForeground3,
  },
  note: {
    display: "block",
    color: tokens.colorNeutralForeground3,
  },
});

/**
 * Title, optional caption, and trailing controls for a dashboard section.
 *
 * Shared so every section announces itself the same way rather than each one
 * inventing its own heading markup.
 */
export function SectionHeader({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: ReactNode;
  /** Controls aligned to the trailing edge, such as a metric picker. */
  children?: ReactNode;
}) {
  const styles = useStyles();
  return (
    <div className={styles.header}>
      <div className={styles.heading}>
        <Subtitle2 as="h2">{title}</Subtitle2>
        {hint && <Caption1 className={styles.hint}>{hint}</Caption1>}
      </div>
      {children}
    </div>
  );
}

/** Muted text shown where a section has nothing to report. */
export function EmptyNote({ children }: { children: ReactNode }) {
  const styles = useStyles();
  return <Caption1 className={styles.note}>{children}</Caption1>;
}
