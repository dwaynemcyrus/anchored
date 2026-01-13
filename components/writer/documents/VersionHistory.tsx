"use client";

import { useState } from "react";
import { format } from "date-fns";
import * as Dialog from "@radix-ui/react-dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { useDocumentVersions } from "@/lib/hooks/use-documents";
import { VersionDiff } from "./VersionDiff";
import type { DocumentVersion } from "@/types/database";
import styles from "./VersionHistory.module.css";

type CurrentDocumentState = {
  bodyMd: string;
  title: string;
  status: string;
  tags: string[] | null;
};

type VersionHistoryProps = {
  documentId: string;
  current: CurrentDocumentState;
  onRestore: (version: DocumentVersion) => void;
};

type VersionDetailProps = {
  version: DocumentVersion;
  current: CurrentDocumentState;
  onRestore: () => void;
  onClose: () => void;
};

type ViewMode = "preview" | "diff";

function VersionDetail({ version, current, onRestore, onClose }: VersionDetailProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("diff");

  const handleRestore = () => {
    onRestore();
    onClose();
  };

  return (
    <div className={styles.detail}>
      <div className={styles.detailHeader}>
        <div className={styles.detailMeta}>
          <span className={styles.detailDate}>
            {version.created_at
              ? format(new Date(version.created_at), "MMM d, yyyy 'at' h:mm a")
              : "Unknown date"}
          </span>
          <span className={styles.detailReason}>
            {version.snapshot_reason === "publish" ? "Published" : "Manual save"}
          </span>
        </div>
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
        >
          Back
        </button>
      </div>

      <div className={styles.viewToggle}>
        <button
          type="button"
          className={`${styles.viewToggleButton} ${viewMode === "diff" ? styles.viewToggleActive : ""}`}
          onClick={() => setViewMode("diff")}
        >
          Changes
        </button>
        <button
          type="button"
          className={`${styles.viewToggleButton} ${viewMode === "preview" ? styles.viewToggleActive : ""}`}
          onClick={() => setViewMode("preview")}
        >
          Preview
        </button>
      </div>

      {viewMode === "diff" ? (
        <VersionDiff
          version={version}
          currentBodyMd={current.bodyMd}
          currentTitle={current.title}
          currentStatus={current.status}
          currentTags={current.tags}
        />
      ) : (
        <>
          <div className={styles.detailInfo}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Title</span>
              <span className={styles.infoValue}>{version.title}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Status</span>
              <span className={styles.infoValue}>{version.status}</span>
            </div>
            {version.tags && version.tags.length > 0 && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Tags</span>
                <span className={styles.infoValue}>{version.tags.join(", ")}</span>
              </div>
            )}
          </div>

          <div className={styles.detailPreview}>
            <div className={styles.previewLabel}>Content preview</div>
            <pre className={styles.previewContent}>
              {version.body_md || "(empty)"}
            </pre>
          </div>
        </>
      )}

      <div className={styles.detailActions}>
        {showConfirm ? (
          <div className={styles.confirmBox}>
            <span className={styles.confirmText}>
              Restore this version? Current changes will be replaced.
            </span>
            <div className={styles.confirmButtons}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.restoreButton}
                onClick={handleRestore}
              >
                Restore
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className={styles.restoreButton}
            onClick={() => setShowConfirm(true)}
          >
            Restore this version
          </button>
        )}
      </div>
    </div>
  );
}

export function VersionHistory({
  documentId,
  current,
  onRestore,
}: VersionHistoryProps) {
  const { data: versions = [], isLoading } = useDocumentVersions(documentId);
  const [selectedVersion, setSelectedVersion] = useState<DocumentVersion | null>(
    null
  );

  if (selectedVersion) {
    return (
      <VersionDetail
        version={selectedVersion}
        current={current}
        onRestore={() => onRestore(selectedVersion)}
        onClose={() => setSelectedVersion(null)}
      />
    );
  }

  if (isLoading) {
    return (
      <div className={styles.panel}>
        <div className={styles.loading}>Loading history...</div>
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className={styles.panel}>
        <div className={styles.empty}>
          No snapshots yet. Save a snapshot or publish to create one.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.list}>
        {versions.map((version) => {
          const date = version.created_at
            ? new Date(version.created_at)
            : null;

          return (
            <button
              key={version.id}
              type="button"
              className={styles.item}
              onClick={() => setSelectedVersion(version)}
            >
              <div className={styles.itemMain}>
                <span className={styles.itemDate}>
                  {date ? format(date, "MMM d, yyyy") : "Unknown"}
                </span>
                <span className={styles.itemTime}>
                  {date ? format(date, "h:mm a") : ""}
                </span>
              </div>
              <div className={styles.itemMeta}>
                <span
                  className={`${styles.itemReason} ${
                    version.snapshot_reason === "publish"
                      ? styles.itemReasonPublish
                      : ""
                  }`}
                >
                  {version.snapshot_reason === "publish" ? "Published" : "Manual"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

type VersionHistoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  current: CurrentDocumentState;
  onRestore: (version: DocumentVersion) => void;
};

export function VersionHistoryDialog({
  open,
  onOpenChange,
  documentId,
  current,
  onRestore,
}: VersionHistoryDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.dialog} aria-describedby={undefined}>
          <VisuallyHidden.Root>
            <Dialog.Title>Version History</Dialog.Title>
          </VisuallyHidden.Root>
          <div className={styles.dialogHeader}>
            <h2 className={styles.dialogTitle}>Version History</h2>
            <Dialog.Close asChild>
              <button type="button" className={styles.closeButton}>
                Close
              </button>
            </Dialog.Close>
          </div>
          <div className={styles.dialogBody}>
            <VersionHistory
              documentId={documentId}
              current={current}
              onRestore={(version) => {
                onRestore(version);
                onOpenChange(false);
              }}
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
