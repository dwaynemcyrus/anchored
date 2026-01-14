"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import {
  useDeleteDocument,
  useDuplicateDocument,
  useArchiveDocument,
} from "@/lib/hooks/use-documents";
import {
  copyMarkdownBody,
  copyMarkdownWithFrontmatter,
  copyAsHtml,
} from "@/lib/utils/export-markdown";
import type { Document } from "@/types/database";
import styles from "./DocumentActions.module.css";

type DocumentActionsProps = {
  document: Document;
  onStatusChange?: (status: string) => void;
};

export function DocumentActions({ document, onStatusChange }: DocumentActionsProps) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const deleteDocument = useDeleteDocument();
  const duplicateDocument = useDuplicateDocument();
  const archiveDocument = useArchiveDocument();

  const showCopyFeedback = (message: string) => {
    setCopyFeedback(message);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const handleCopyMarkdown = async () => {
    const success = await copyMarkdownBody(document);
    showCopyFeedback(success ? "Copied markdown" : "Failed to copy");
  };

  const handleCopyWithFrontmatter = async () => {
    const success = await copyMarkdownWithFrontmatter(document);
    showCopyFeedback(success ? "Copied with frontmatter" : "Failed to copy");
  };

  const handleCopyHtml = async () => {
    const success = await copyAsHtml(document);
    showCopyFeedback(success ? "Copied as HTML" : "Failed to copy");
  };

  const handleDuplicate = async () => {
    const newDoc = await duplicateDocument.mutateAsync(document);
    router.push(`/writing/${newDoc.id}`);
  };

  const handleArchive = async () => {
    await archiveDocument.mutateAsync(document.id);
    onStatusChange?.("archived");
  };

  const handleDelete = async () => {
    await deleteDocument.mutateAsync(document.id);
    router.push("/writing");
  };

  const isArchived = document.status === "archived";

  return (
    <>
      <DropdownMenu.Root open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenu.Trigger asChild>
          <button type="button" className={styles.trigger}>
            Actions
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className={styles.content} sideOffset={5} align="end">
            <DropdownMenu.Sub>
              <DropdownMenu.SubTrigger className={styles.item}>
                Copy
                <span className={styles.submenuArrow}>→</span>
              </DropdownMenu.SubTrigger>
              <DropdownMenu.Portal>
                <DropdownMenu.SubContent className={styles.subContent} sideOffset={4}>
                  <DropdownMenu.Item className={styles.item} onSelect={handleCopyMarkdown}>
                    Markdown
                  </DropdownMenu.Item>
                  <DropdownMenu.Item className={styles.item} onSelect={handleCopyWithFrontmatter}>
                    With frontmatter
                  </DropdownMenu.Item>
                  <DropdownMenu.Item className={styles.item} onSelect={handleCopyHtml}>
                    As HTML
                  </DropdownMenu.Item>
                </DropdownMenu.SubContent>
              </DropdownMenu.Portal>
            </DropdownMenu.Sub>

            <DropdownMenu.Item
              className={styles.item}
              onSelect={handleDuplicate}
              disabled={duplicateDocument.isPending}
            >
              Duplicate
            </DropdownMenu.Item>

            {!isArchived && (
              <DropdownMenu.Item
                className={styles.item}
                onSelect={handleArchive}
                disabled={archiveDocument.isPending}
              >
                Archive
              </DropdownMenu.Item>
            )}

            <DropdownMenu.Separator className={styles.separator} />

            <DropdownMenu.Item
              className={`${styles.item} ${styles.destructive}`}
              onSelect={(e) => {
                e.preventDefault();
                setDropdownOpen(false);
                setDeleteDialogOpen(true);
              }}
            >
              Delete
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <AlertDialog.Root open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className={styles.overlay} />
          <AlertDialog.Content className={styles.dialog}>
            <AlertDialog.Title className={styles.dialogTitle}>
              Delete document?
            </AlertDialog.Title>
            <AlertDialog.Description className={styles.dialogDescription}>
              This will permanently delete &ldquo;{document.title}&rdquo;. This action
              cannot be undone.
            </AlertDialog.Description>
            <div className={styles.dialogActions}>
              <AlertDialog.Cancel asChild>
                <button type="button" className={styles.cancelButton}>
                  Cancel
                </button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button
                  type="button"
                  className={styles.deleteButton}
                  onClick={handleDelete}
                  disabled={deleteDocument.isPending}
                >
                  {deleteDocument.isPending ? "Deleting..." : "Delete"}
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      {copyFeedback && (
        <div className={styles.toast}>{copyFeedback}</div>
      )}
    </>
  );
}
