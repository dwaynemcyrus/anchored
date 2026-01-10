"use client";

import styles from "./frontmatter-panel.module.css";

export type FrontmatterState = {
  title: string;
  summary: string;
  slug: string;
  collection: string;
  status: string;
  visibility: string;
  canonical: string;
  tags: string;
  date: string;
  metadata: {
    source: string;
    chains: string;
    resources: string;
    visual: boolean;
    sourceUrl: string;
    sourceTitle: string;
  };
};

type FrontmatterPanelProps = {
  value: FrontmatterState;
  onChange: (next: FrontmatterState) => void;
  showMetadata?: boolean;
  showTitle?: boolean;
};

export function FrontmatterPanel({
  value,
  onChange,
  showMetadata = true,
  showTitle = true,
}: FrontmatterPanelProps) {
  const update = (patch: Partial<FrontmatterState>) => {
    onChange({ ...value, ...patch });
  };

  const updateMetadata = (patch: Partial<FrontmatterState["metadata"]>) => {
    onChange({ ...value, metadata: { ...value.metadata, ...patch } });
  };

  return (
    <section className={styles.panel}>
      {showTitle && <h2 className={styles.title}>Frontmatter</h2>}

      <div className={styles.field}>
        <label className={styles.label} htmlFor="doc-title">
          Title
        </label>
        <input
          id="doc-title"
          className={styles.input}
          value={value.title}
          onChange={(event) => update({ title: event.target.value })}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="doc-summary">
          Summary
        </label>
        <textarea
          id="doc-summary"
          className={styles.textarea}
          value={value.summary}
          onChange={(event) => update({ summary: event.target.value })}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="doc-slug">
          Slug
        </label>
        <input
          id="doc-slug"
          className={styles.input}
          value={value.slug}
          onChange={(event) => update({ slug: event.target.value })}
        />
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="doc-collection">
            Collection
          </label>
          <select
            id="doc-collection"
            className={styles.select}
            value={value.collection}
            onChange={(event) => update({ collection: event.target.value })}
          >
            <option value="notes">Notes</option>
            <option value="essays">Essays</option>
            <option value="linked">Linked</option>
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="doc-status">
            Status
          </label>
          <select
            id="doc-status"
            className={styles.select}
            value={value.status}
            onChange={(event) => update({ status: event.target.value })}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="doc-visibility">
            Visibility
          </label>
          <select
            id="doc-visibility"
            className={styles.select}
            value={value.visibility}
            onChange={(event) => update({ visibility: event.target.value })}
          >
            <option value="private">Private</option>
            <option value="personal">Personal</option>
            <option value="public">Public</option>
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="doc-date">
            Date
          </label>
          <input
            id="doc-date"
            className={styles.input}
            type="date"
            value={value.date}
            onChange={(event) => update({ date: event.target.value })}
          />
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="doc-tags">
          Tags
        </label>
        <input
          id="doc-tags"
          className={styles.input}
          value={value.tags}
          onChange={(event) => update({ tags: event.target.value })}
          placeholder="focus, leadership, systems"
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="doc-canonical">
          Canonical
        </label>
        <input
          id="doc-canonical"
          className={styles.input}
          value={value.canonical}
          onChange={(event) => update({ canonical: event.target.value })}
          placeholder="/library/example"
        />
      </div>

      {showMetadata && value.collection === "notes" && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Notes</div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="doc-source">
              Source
            </label>
            <input
              id="doc-source"
              className={styles.input}
              value={value.metadata.source}
              onChange={(event) =>
                updateMetadata({ source: event.target.value })
              }
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="doc-chains">
              Chains
            </label>
            <input
              id="doc-chains"
              className={styles.input}
              value={value.metadata.chains}
              onChange={(event) =>
                updateMetadata({ chains: event.target.value })
              }
            />
          </div>
        </div>
      )}

      {showMetadata && value.collection === "essays" && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Essays</div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="doc-resources">
              Resources
            </label>
            <input
              id="doc-resources"
              className={styles.input}
              value={value.metadata.resources}
              onChange={(event) =>
                updateMetadata({ resources: event.target.value })
              }
              placeholder="Book, article, source"
            />
          </div>
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={value.metadata.visual}
              onChange={(event) =>
                updateMetadata({ visual: event.target.checked })
              }
            />
            Visual emphasis
          </label>
        </div>
      )}

      {showMetadata && value.collection === "linked" && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Linked</div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="doc-source-url">
              Source URL
            </label>
            <input
              id="doc-source-url"
              className={styles.input}
              value={value.metadata.sourceUrl}
              onChange={(event) =>
                updateMetadata({ sourceUrl: event.target.value })
              }
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="doc-source-title">
              Source title
            </label>
            <input
              id="doc-source-title"
              className={styles.input}
              value={value.metadata.sourceTitle}
              onChange={(event) =>
                updateMetadata({ sourceTitle: event.target.value })
              }
            />
          </div>
        </div>
      )}
    </section>
  );
}
