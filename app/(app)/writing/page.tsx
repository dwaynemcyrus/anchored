"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { InlineError } from "@/components/error-boundary";
import { useCreateDocument, useDocuments } from "@/lib/hooks/use-documents";
import { CollectionFilter } from "@/components/writer/documents/CollectionFilter";
import { TagList } from "@/components/writer/documents/TagBadge";
import { TagFilter } from "@/components/writer/documents/TagFilter";
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
  const [activeTags, setActiveTags] = useState<string[]>([]);
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

  // Compute all unique tags with counts
  const allTags = useMemo(() => {
    const counts = documents.reduce<Record<string, number>>((acc, doc) => {
      if (!doc.tags) return acc;
      for (const tag of doc.tags) {
        acc[tag] = (acc[tag] ?? 0) + 1;
      }
      return acc;
    }, {});
    return Object.entries(counts).map(([tag, count]) => ({ tag, count }));
  }, [documents]);

  // Filter documents by collection and tags (AND logic)
  const filteredDocs = useMemo(() => {
    let result = documents;

    if (activeCollection) {
      result = result.filter((doc) => doc.collection === activeCollection);
    }

    if (activeTags.length > 0) {
      result = result.filter((doc) =>
        activeTags.every((tag) => doc.tags?.includes(tag))
      );
    }

    return result;
  }, [documents, activeCollection, activeTags]);

  const handleTagToggle = (tag: string) => {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleClearTags = () => {
    setActiveTags([]);
  };

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

      <div className={styles.filters}>
        <CollectionFilter
          collections={collections}
          activeCollection={activeCollection}
          onCollectionChange={setActiveCollection}
          showAll={true}
          totalCount={documents.length}
        />
        {allTags.length > 0 && (
          <TagFilter
            tags={allTags}
            activeTags={activeTags}
            onTagToggle={handleTagToggle}
            onClearAll={handleClearTags}
          />
        )}
      </div>

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
                  <div className={styles.cardFooter}>
                    <span className={styles.cardMeta}>{updatedAt}</span>
                    {doc.tags && doc.tags.length > 0 && (
                      <TagList
                        tags={doc.tags}
                        activeTags={activeTags}
                        limit={3}
                      />
                    )}
                  </div>
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
