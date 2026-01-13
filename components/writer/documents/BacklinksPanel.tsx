"use client";

import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { useBacklinks, type Backlink } from "@/lib/hooks/use-backlinks";
import styles from "./BacklinksPanel.module.css";

type BacklinksPanelProps = {
  slug: string;
  documentId: string;
};

export function BacklinksPanel({ slug, documentId }: BacklinksPanelProps) {
  const router = useRouter();
  const { data: backlinks = [], isLoading } = useBacklinks(slug, documentId);

  const handleClick = (backlink: Backlink) => {
    router.push(`/writing/${backlink.id}`);
  };

  if (isLoading) {
    return (
      <div className={styles.panel}>
        <div className={styles.loading}>Loading backlinks...</div>
      </div>
    );
  }

  if (backlinks.length === 0) {
    return (
      <div className={styles.panel}>
        <div className={styles.empty}>
          No documents link to this page yet.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.list}>
        {backlinks.map((backlink) => (
          <button
            key={backlink.id}
            type="button"
            className={styles.item}
            onClick={() => handleClick(backlink)}
          >
            <div className={styles.itemMain}>
              <span className={styles.itemTitle}>{backlink.title}</span>
              {backlink.snippet && (
                <span className={styles.itemSnippet}>{backlink.snippet}</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

type BacklinksDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
  documentId: string;
};

export function BacklinksDialog({
  open,
  onOpenChange,
  slug,
  documentId,
}: BacklinksDialogProps) {
  const { data: backlinks = [] } = useBacklinks(slug, documentId);
  const count = backlinks.length;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.dialog} aria-describedby={undefined}>
          <VisuallyHidden.Root>
            <Dialog.Title>Backlinks</Dialog.Title>
          </VisuallyHidden.Root>
          <div className={styles.dialogHeader}>
            <h2 className={styles.dialogTitle}>
              Backlinks {count > 0 && <span className={styles.count}>({count})</span>}
            </h2>
            <Dialog.Close asChild>
              <button type="button" className={styles.closeButton}>
                Close
              </button>
            </Dialog.Close>
          </div>
          <div className={styles.dialogBody}>
            <BacklinksPanel slug={slug} documentId={documentId} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

type BacklinksButtonProps = {
  slug: string;
  documentId: string;
  onClick: () => void;
};

export function BacklinksButton({ slug, documentId, onClick }: BacklinksButtonProps) {
  const { data: backlinks = [] } = useBacklinks(slug, documentId);
  const count = backlinks.length;

  return (
    <button type="button" className={styles.headerButton} onClick={onClick}>
      Backlinks{count > 0 && <span className={styles.headerCount}>({count})</span>}
    </button>
  );
}
