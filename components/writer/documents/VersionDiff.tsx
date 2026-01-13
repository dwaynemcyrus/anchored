"use client";

import { useMemo } from "react";
import { diffLines, diffMetadata, type DiffLine, type MetadataChange } from "@/lib/utils/diff";
import type { DocumentVersion } from "@/types/database";
import styles from "./VersionDiff.module.css";

type VersionDiffProps = {
  version: DocumentVersion;
  currentBodyMd: string;
  currentTitle: string;
  currentStatus: string;
  currentTags: string[] | null;
};

function MetadataChanges({ changes }: { changes: MetadataChange[] }) {
  if (changes.length === 0) {
    return null;
  }

  return (
    <div className={styles.metadataSection}>
      <div className={styles.sectionLabel}>Metadata changes</div>
      <div className={styles.metadataList}>
        {changes.map((change) => (
          <div key={change.field} className={styles.metadataChange}>
            <span className={styles.metadataField}>{change.field}:</span>
            {change.oldValue && (
              <span className={styles.metadataOld}>{change.oldValue}</span>
            )}
            {change.oldValue && change.newValue && (
              <span className={styles.metadataArrow}>→</span>
            )}
            {change.newValue && (
              <span className={styles.metadataNew}>{change.newValue}</span>
            )}
            {!change.oldValue && change.newValue && (
              <span className={styles.metadataAdded}>(added)</span>
            )}
            {change.oldValue && !change.newValue && (
              <span className={styles.metadataRemoved}>(removed)</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DiffLineRow({ line }: { line: DiffLine }) {
  const prefix = line.type === "added" ? "+" : line.type === "removed" ? "-" : " ";
  const className =
    line.type === "added"
      ? styles.lineAdded
      : line.type === "removed"
      ? styles.lineRemoved
      : styles.lineUnchanged;

  return (
    <div className={`${styles.diffLine} ${className}`}>
      <span className={styles.linePrefix}>{prefix}</span>
      <span className={styles.lineContent}>{line.content || " "}</span>
    </div>
  );
}

export function VersionDiff({
  version,
  currentBodyMd,
  currentTitle,
  currentStatus,
  currentTags,
}: VersionDiffProps) {
  const diff = useMemo(() => {
    return diffLines(version.body_md || "", currentBodyMd);
  }, [version.body_md, currentBodyMd]);

  const metadataChanges = useMemo(() => {
    const oldMeta = {
      title: version.title,
      status: version.status,
      tags: version.tags,
    };
    const newMeta = {
      title: currentTitle,
      status: currentStatus,
      tags: currentTags,
    };
    return diffMetadata(oldMeta, newMeta, ["title", "status", "tags"]);
  }, [version, currentTitle, currentStatus, currentTags]);

  const hasChanges = diff.addedCount > 0 || diff.removedCount > 0 || metadataChanges.length > 0;

  if (!hasChanges) {
    return (
      <div className={styles.container}>
        <div className={styles.noChanges}>
          No changes between this version and current document.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.summary}>
        <span className={styles.summaryAdded}>+{diff.addedCount} added</span>
        <span className={styles.summaryRemoved}>-{diff.removedCount} removed</span>
      </div>

      <MetadataChanges changes={metadataChanges} />

      {(diff.addedCount > 0 || diff.removedCount > 0) && (
        <div className={styles.contentSection}>
          <div className={styles.sectionLabel}>Content changes</div>
          <div className={styles.diffContent}>
            {diff.lines.map((line, index) => (
              <DiffLineRow key={index} line={line} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
