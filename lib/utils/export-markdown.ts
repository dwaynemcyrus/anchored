import type { Document } from "@/types/database";

/**
 * Build YAML frontmatter from document metadata.
 */
function buildFrontmatter(document: Document): string {
  const lines: string[] = ["---"];

  lines.push(`title: "${document.title.replace(/"/g, '\\"')}"`);

  if (document.date) {
    lines.push(`date: ${document.date}`);
  }

  if (document.collection) {
    lines.push(`collection: ${document.collection}`);
  }

  if (document.status) {
    lines.push(`status: ${document.status}`);
  }

  if (document.visibility) {
    lines.push(`visibility: ${document.visibility}`);
  }

  if (document.tags && document.tags.length > 0) {
    lines.push(`tags:`);
    for (const tag of document.tags) {
      lines.push(`  - ${tag}`);
    }
  }

  if (document.summary) {
    lines.push(`summary: "${document.summary.replace(/"/g, '\\"')}"`);
  }

  if (document.canonical) {
    lines.push(`canonical: ${document.canonical}`);
  }

  lines.push("---");

  return lines.join("\n");
}

/**
 * Build full markdown with frontmatter.
 */
export function buildMarkdownWithFrontmatter(document: Document): string {
  const frontmatter = buildFrontmatter(document);
  const body = document.body_md || "";
  return `${frontmatter}\n\n${body}`;
}

/**
 * Get plain markdown body only.
 */
export function getMarkdownBody(document: Document): string {
  return document.body_md || "";
}

/**
 * Convert markdown to basic HTML.
 * This is a simple conversion for clipboard purposes.
 */
export function markdownToHtml(markdown: string): string {
  let html = markdown;

  // Convert headers
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Convert bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Convert links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Convert wiki links to plain text
  html = html.replace(/\[\[([^\]]+)\]\]/g, "$1");

  // Convert inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Convert paragraphs (double newlines)
  const paragraphs = html.split(/\n\s*\n/);
  html = paragraphs
    .map((p) => {
      const trimmed = p.trim();
      if (!trimmed) return "";
      // Don't wrap if it's already a block element
      if (trimmed.startsWith("<h") || trimmed.startsWith("<ul") || trimmed.startsWith("<ol")) {
        return trimmed;
      }
      return `<p>${trimmed.replace(/\n/g, "<br>")}</p>`;
    })
    .filter(Boolean)
    .join("\n");

  return html;
}

/**
 * Copy text to clipboard and return success status.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Copy markdown body to clipboard.
 */
export async function copyMarkdownBody(document: Document): Promise<boolean> {
  return copyToClipboard(getMarkdownBody(document));
}

/**
 * Copy markdown with frontmatter to clipboard.
 */
export async function copyMarkdownWithFrontmatter(document: Document): Promise<boolean> {
  return copyToClipboard(buildMarkdownWithFrontmatter(document));
}

/**
 * Copy as HTML to clipboard.
 */
export async function copyAsHtml(document: Document): Promise<boolean> {
  const html = markdownToHtml(document.body_md || "");
  return copyToClipboard(html);
}

/**
 * Download document as markdown file.
 */
export function downloadAsMarkdown(doc: Document): void {
  const content = buildMarkdownWithFrontmatter(doc);
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = window.document.createElement("a");
  link.href = url;
  link.download = `${doc.slug}.md`;
  window.document.body.appendChild(link);
  link.click();
  window.document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
