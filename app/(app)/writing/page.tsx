"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  DocumentStatus,
  DocumentVisibility,
  useCreateDocument,
  useDocuments,
} from "@/lib/hooks/use-documents";
import styles from "./page.module.css";

const STORAGE_KEY = "anchored.editor.collection";

export default function WritingPage() {
  const router = useRouter();
  const [collection, setCollection] = useState<"notes" | "essays" | "linked">(
    "notes"
  );
  const [status, setStatus] = useState<"all" | DocumentStatus>("all");
  const [visibility, setVisibility] = useState<"all" | DocumentVisibility>(
    "all"
  );
  const [query, setQuery] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "notes" || saved === "essays" || saved === "linked") {
      setCollection(saved);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, collection);
  }, [collection]);

  const filters = useMemo(() => {
    return {
      collection,
      status: status === "all" ? undefined : status,
      visibility: visibility === "all" ? undefined : visibility,
      query: query.trim() ? query : undefined,
    };
  }, [collection, status, visibility, query]);

  const { data: documents = [], isLoading } = useDocuments(filters);
  const createDocument = useCreateDocument();

  const handleCreate = async () => {
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

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Writing</p>
          <h1 className={styles.title}>Documents</h1>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleCreate}
            disabled={createDocument.isPending}
          >
            New document
          </button>
        </div>
      </header>

      <section className={styles.filters}>
        <div className={styles.filterGroup}>
          <label className={styles.label} htmlFor="filter-collection">
            Collection
          </label>
          <select
            id="filter-collection"
            className={styles.select}
            value={collection}
            onChange={(event) =>
              setCollection(event.target.value as "notes" | "essays" | "linked")
            }
          >
            <option value="notes">Notes</option>
            <option value="essays">Essays</option>
            <option value="linked">Linked</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.label} htmlFor="filter-status">
            Status
          </label>
          <select
            id="filter-status"
            className={styles.select}
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as "all" | DocumentStatus)
            }
          >
            <option value="all">All</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.label} htmlFor="filter-visibility">
            Visibility
          </label>
          <select
            id="filter-visibility"
            className={styles.select}
            value={visibility}
            onChange={(event) =>
              setVisibility(event.target.value as "all" | DocumentVisibility)
            }
          >
            <option value="all">All</option>
            <option value="private">Private</option>
            <option value="personal">Personal</option>
            <option value="public">Public</option>
          </select>
        </div>
        <div className={styles.searchGroup}>
          <label className={styles.label} htmlFor="filter-search">
            Search
          </label>
          <input
            id="filter-search"
            className={styles.input}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Title or slug"
          />
        </div>
      </section>

      <section className={styles.list}>
        {isLoading && <div className={styles.empty}>Loading documents…</div>}
        {!isLoading && documents.length === 0 && (
          <div className={styles.empty}>No documents yet.</div>
        )}
        {!isLoading &&
          documents.map((doc) => {
            const updatedAt = doc.updated_at
              ? format(new Date(doc.updated_at), "MMM d, yyyy")
              : "—";
            return (
              <Link
                key={doc.id}
                href={`/writing/${doc.id}`}
                className={styles.card}
              >
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>{doc.title}</h2>
                  <div className={styles.badges}>
                    <span className={styles.badge}>{doc.status}</span>
                    <span className={styles.badgeSecondary}>
                      {doc.visibility}
                    </span>
                  </div>
                </div>
                <p className={styles.cardMeta}>
                  {doc.collection} · Updated {updatedAt}
                </p>
                {doc.summary && (
                  <p className={styles.cardSummary}>{doc.summary}</p>
                )}
              </Link>
            );
          })}
      </section>
    </div>
  );
}
