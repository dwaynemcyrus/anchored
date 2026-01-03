import { renderMarkdownToHtml } from "@/lib/utils/markdown";
import styles from "./preview-pane.module.css";

type PreviewPaneProps = {
  value: string;
};

export function PreviewPane({ value }: PreviewPaneProps) {
  const html = renderMarkdownToHtml(value);
  return (
    <article
      className={styles.preview}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
