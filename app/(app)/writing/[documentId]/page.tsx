"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  useCreateSnapshot,
  useDocument,
  usePublishDocument,
  useUpdateDocument,
} from "@/lib/hooks/use-documents";
import type { Json } from "@/types/database";
import { slugify } from "@/lib/utils/slugify";
import { MarkdownEditor } from "@/components/editor/markdown-editor";
import {
  FrontmatterPanel,
  FrontmatterState,
} from "@/components/editor/frontmatter-panel";
import { PreviewPane } from "@/components/editor/preview-pane";
import styles from "./page.module.css";

const emptyFrontmatter: FrontmatterState = {
  title: "",
  summary: "",
  slug: "",
  collection: "notes",
  status: "draft",
  visibility: "private",
  canonical: "",
  tags: "",
  date: "",
  metadata: {
    source: "",
    chains: "",
    resources: "",
    visual: false,
    sourceUrl: "",
    sourceTitle: "",
  },
};

function tagsToInput(tags: string[] | null) {
  return tags?.join(", ") ?? "";
}

function inputToTags(input: string) {
  const tags = input
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  return tags.length > 0 ? tags : null;
}

export default function WritingEditorPage() {
  const params = useParams<{ documentId: string }>();
  const rawId = params?.documentId;
  const documentId = Array.isArray(rawId) ? rawId[0] : rawId ?? "";

  const { data: document, isLoading } = useDocument(documentId);
  const updateDocument = useUpdateDocument();
  const publishDocument = usePublishDocument();
  const createSnapshot = useCreateSnapshot();

  const [frontmatter, setFrontmatter] =
    useState<FrontmatterState>(emptyFrontmatter);
  const [bodyMd, setBodyMd] = useState("");
  const [showPreview, setShowPreview] = useState(true);

  const lastSavedRef = useRef<string>("");
  const hydratedRef = useRef(false);
  const baseMetadataRef = useRef<Record<string, Json | undefined>>({});

  useEffect(() => {
    if (!document) return;

    const metadata = (document.metadata ?? {}) as Record<string, Json | undefined>;
    baseMetadataRef.current = { ...metadata };

    setFrontmatter({
      title: document.title ?? "",
      summary: document.summary ?? "",
      slug: document.slug ?? "",
      collection: document.collection ?? "notes",
      status: document.status ?? "draft",
      visibility: document.visibility ?? "private",
      canonical: document.canonical ?? "",
      tags: tagsToInput(document.tags ?? null),
      date: document.date ?? "",
      metadata: {
        source: typeof metadata.source === "string" ? metadata.source : "",
        chains: typeof metadata.chains === "string" ? metadata.chains : "",
        resources: Array.isArray(metadata.resources)
          ? metadata.resources.join(", ")
          : "",
        visual: Boolean(metadata.visual),
        sourceUrl:
          typeof metadata.source_url === "string" ? metadata.source_url : "",
        sourceTitle:
          typeof metadata.source_title === "string" ? metadata.source_title : "",
      },
    });
    setBodyMd(document.body_md ?? "");

    const initialPayload = {
      id: document.id,
      title: document.title,
      slug: document.slug,
      collection: document.collection,
      status: document.status,
      visibility: document.visibility,
      summary: document.summary,
      canonical: document.canonical,
      tags: document.tags,
      date: document.date,
      metadata: document.metadata ?? {},
      body_md: document.body_md ?? "",
    };

    lastSavedRef.current = JSON.stringify(initialPayload);
    hydratedRef.current = true;
  }, [document]);

  const buildMetadata = () => {
    const metadata: Record<string, Json | undefined> = {
      ...baseMetadataRef.current,
    };

    const applyField = (key: string, value: string) => {
      if (value && value.trim().length > 0) {
        metadata[key] = value.trim();
      } else {
        delete metadata[key];
      }
    };

    if (frontmatter.collection === "notes") {
      applyField("source", frontmatter.metadata.source);
      applyField("chains", frontmatter.metadata.chains);
    }

    if (frontmatter.collection === "essays") {
      const resources = frontmatter.metadata.resources
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
      if (resources.length > 0) {
        metadata.resources = resources;
      } else {
        delete metadata.resources;
      }
      if (frontmatter.metadata.visual) {
        metadata.visual = true;
      } else {
        delete metadata.visual;
      }
    }

    if (frontmatter.collection === "linked") {
      applyField("source_url", frontmatter.metadata.sourceUrl);
      applyField("source_title", frontmatter.metadata.sourceTitle);
    }

    return metadata;
  };

  const buildUpdatePayload = () => {
    const title = frontmatter.title.trim() || "Untitled";
    const slugValue = frontmatter.slug.trim();
    return {
      id: documentId,
      title,
      slug: slugValue.length > 0 ? slugify(slugValue) : slugify(title),
      collection: frontmatter.collection,
      status: frontmatter.status,
      visibility: frontmatter.visibility,
      summary: frontmatter.summary.trim() || null,
      canonical: frontmatter.canonical.trim() || null,
      tags: inputToTags(frontmatter.tags),
      date: frontmatter.date || null,
      metadata: buildMetadata(),
      body_md: bodyMd,
    };
  };

  const payloadSignature = useMemo(() => {
    if (!hydratedRef.current) return "";
    return JSON.stringify(buildUpdatePayload());
  }, [frontmatter, bodyMd, documentId]);

  useEffect(() => {
    if (!document || !hydratedRef.current) return;
    if (payloadSignature === lastSavedRef.current) return;

    const timeout = window.setTimeout(() => {
      updateDocument.mutate(buildUpdatePayload(), {
        onSuccess: () => {
          lastSavedRef.current = payloadSignature;
        },
      });
    }, 800);

    return () => window.clearTimeout(timeout);
  }, [payloadSignature, document, updateDocument]);

  const handleSnapshot = async () => {
    if (!document) return;
    const payload = buildUpdatePayload();
    const updated = await updateDocument.mutateAsync(payload);
    lastSavedRef.current = JSON.stringify(payload);
    await createSnapshot.mutateAsync({
      document: updated,
      reason: "manual",
    });
  };

  const handlePublish = async () => {
    if (!document) return;
    const payload = buildUpdatePayload();
    const updated = await updateDocument.mutateAsync(payload);
    lastSavedRef.current = JSON.stringify(payload);
    const published = await publishDocument.mutateAsync(updated.id);
    setFrontmatter((prev) => ({ ...prev, status: "published" }));
    await createSnapshot.mutateAsync({
      document: published,
      reason: "publish",
    });
  };

  if (isLoading) {
    return <div className={styles.empty}>Loading document…</div>;
  }

  if (!document) {
    return <div className={styles.empty}>Document not found.</div>;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerMeta}>
          <p className={styles.kicker}>Writing</p>
          <h1 className={styles.title}>{frontmatter.title || "Untitled"}</h1>
          <p className={styles.subTitle}>
            {frontmatter.collection} · {frontmatter.status} ·{" "}
            {frontmatter.visibility}
          </p>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => setShowPreview((prev) => !prev)}
          >
            {showPreview ? "Hide preview" : "Show preview"}
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={handleSnapshot}
            disabled={createSnapshot.isPending || updateDocument.isPending}
          >
            Save snapshot
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={handlePublish}
            disabled={publishDocument.isPending || updateDocument.isPending}
          >
            Publish
          </button>
        </div>
      </header>

      <div className={styles.statusBar}>
        {updateDocument.isPending ? "Saving..." : "Saved"}
      </div>

      <div className={styles.main}>
        <div
          className={`${styles.workspace} ${
            showPreview ? styles.workspaceSplit : ""
          }`}
        >
          <MarkdownEditor
            value={bodyMd}
            onChange={setBodyMd}
            placeholder="Start writing..."
          />
          {showPreview && <PreviewPane value={bodyMd} />}
        </div>

        <FrontmatterPanel value={frontmatter} onChange={setFrontmatter} />
      </div>
    </div>
  );
}
