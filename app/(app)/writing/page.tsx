"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { InlineError } from "@/components/error-boundary";
import { useCreateDocument, useDocuments } from "@/lib/hooks/use-documents";
import { CollectionFilter } from "@/components/writer/documents/CollectionFilter";
import { CommandPalette } from "@/components/writer/ui/CommandPalette";
import styles from "./page.module.css";

const collectionOrder = ["notes", "essays", "linked"] as const;
const collectionLabels: Record<(typeof collectionOrder)[number], string> = {
  notes: "Notes",
  essays: "Essays",
  linked: "Linked",
};

function buildSnippet(summary: string | null, body: string | null): string {
  const source = summary?.trim() || body?.trim() || "";
  if (!source) return "";
  const line = source.split("\n").find((entry) => entry.trim().length > 0) ?? "";
  return line.length > 160 ? `${line.slice(0, 157)}…` : line;
}

export default function WriterV3Page() {
  const router = useRouter();
  const { data: documents = [], isLoading, error } = useDocuments();
  const createDocument = useCreateDocument();
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const collections = useMemo(() => {
    const counts = documents.reduce<Record<string, number>>((acc, doc) => {
      if (!doc.collection) return acc;
      acc[doc.collection] = (acc[doc.collection] ?? 0) + 1;
      return acc;
    }, {});
    return collectionOrder
      .filter((collection) => counts[collection])
      .map((collection) => ({
        id: collection,
        label: collectionLabels[collection],
        count: counts[collection],
      }));
  }, [documents]);

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
    router.push(`/writing/${doc.id}`);
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
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.textButton}
            onClick={() => setCommandPaletteOpen(true)}
          >
            Search
          </button>
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

      <CollectionFilter
        collections={collections}
        activeCollection={activeCollection}
        onCollectionChange={setActiveCollection}
        showAll={true}
        totalCount={documents.length}
      />

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
                href={`/writing/${doc.id}`}
                className={styles.card}
              >
                <div className={styles.cardMain}>
                  <h2 className={styles.cardTitle}>{doc.title}</h2>
                  {snippet && <p className={styles.cardSnippet}>{snippet}</p>}
                  <span className={styles.cardMeta}>{updatedAt}</span>
                </div>
              </Link>
            );
          })}
      </div>

      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />
    </div>
  );
}
