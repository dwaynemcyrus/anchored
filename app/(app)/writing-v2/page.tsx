"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import * as Dialog from "@radix-ui/react-dialog";
import { InlineError } from "@/components/error-boundary";
import { useCreateDocument, useDocuments } from "@/lib/hooks/use-documents";
import styles from "./page.module.css";

function buildSnippet(summary: string | null, body: string | null): string {
  const source = summary?.trim() || body?.trim() || "";
  if (!source) return "";
  const line = source.split("\n").find((entry) => entry.trim().length > 0) ?? "";
  return line.length > 160 ? `${line.slice(0, 157)}…` : line;
}

export default function WritingV2Page() {
  const router = useRouter();
  const { data: documents = [], isLoading, error } = useDocuments();
  const createDocument = useCreateDocument();
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [collectionsOpen, setCollectionsOpen] = useState(false);

  const collections = useMemo(() => {
    const values = documents.map((doc) => doc.collection).filter(Boolean);
    return Array.from(new Set(values)).sort();
  }, [documents]);

  useEffect(() => {
    if (activeCollection) return;
    if (collections.length === 0) return;
    setActiveCollection(collections[0]);
  }, [collections, activeCollection]);

  const filteredDocs = useMemo(() => {
    if (!activeCollection) return documents;
    return documents.filter((doc) => doc.collection === activeCollection);
  }, [documents, activeCollection]);

  const handleCreate = async () => {
    const collection = activeCollection ?? "notes";
    const doc = await createDocument.mutateAsync({
      title: "Untitled",
      collection,
      visibility: "private",
      status: "draft",
      body_md: "",
      metadata: {},
    });
    router.push(`/writing-v2/${doc.id}`);
  };

  if (error) {
    return <InlineError message={`Error loading documents: ${error.message}`} />;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            type="button"
            className={styles.textButton}
            onClick={() => router.push("/")}
          >
            Back
          </button>
          <span className={styles.headerDivider}>|</span>
          <Dialog.Root open={collectionsOpen} onOpenChange={setCollectionsOpen}>
            <Dialog.Trigger asChild>
              <button type="button" className={styles.textButton}>
                Collections
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className={styles.drawerOverlay} />
              <Dialog.Content className={styles.drawerContent}>
                <div className={styles.drawerHeader}>
                  <Dialog.Title className={styles.drawerTitle}>
                    Collections
                  </Dialog.Title>
                  <Dialog.Close asChild>
                    <button type="button" className={styles.textButton}>
                      Close
                    </button>
                  </Dialog.Close>
                </div>
                <div className={styles.drawerList}>
                  {collections.length === 0 && (
                    <div className={styles.drawerEmpty}>
                      No collections yet.
                    </div>
                  )}
                  {collections.map((collection) => (
                    <button
                      key={collection}
                      type="button"
                      className={`${styles.drawerItem} ${
                        collection === activeCollection
                          ? styles.drawerItemActive
                          : ""
                      }`}
                      onClick={() => {
                        setActiveCollection(collection);
                        setCollectionsOpen(false);
                      }}
                    >
                      {collection}
                    </button>
                  ))}
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleCreate}
            disabled={createDocument.isPending}
          >
            New
          </button>
        </div>
      </header>

      <div className={styles.scroll}>
        {isLoading && <div className={styles.empty}>Loading documents…</div>}
        {!isLoading && filteredDocs.length === 0 && (
          <div className={styles.empty}>No documents yet.</div>
        )}
        {!isLoading &&
          filteredDocs.map((doc) => {
            const updatedAt = doc.updated_at
              ? format(new Date(doc.updated_at), "MMM d, yyyy")
              : "—";
            const snippet = buildSnippet(doc.summary, doc.body_md ?? null);
            return (
              <Link
                key={doc.id}
                href={`/writing-v2/${doc.id}`}
                className={styles.card}
              >
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>{doc.title}</h2>
                  <span className={styles.cardMeta}>{updatedAt}</span>
                </div>
                {snippet && <p className={styles.cardSnippet}>{snippet}</p>}
              </Link>
            );
          })}
      </div>
    </div>
  );
}
