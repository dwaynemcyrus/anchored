import { slugify } from "@/lib/utils/slugify";

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatInline(text: string) {
  let output = escapeHtml(text);

  output = output.replace(/`([^`]+)`/g, "<code>$1</code>");
  output = output.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  output = output.replace(/\*(.+?)\*/g, "<em>$1</em>");
  output = output.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );
  output = output.replace(
    /\[\[([^\]|]+)(\|([^\]]+))?\]\]/g,
    (_match, target: string, _aliasGroup: string, alias: string) => {
      const label = alias || target;
      const slug = slugify(target);
      return `<a class="wiki-link" href="/writing/${slug}">${label}</a>`;
    }
  );

  return output;
}

export function renderMarkdownToHtml(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  const output: string[] = [];
  let inCodeBlock = false;
  let inList = false;
  let inParagraph = false;
  let inBlockquote = false;

  const closeParagraph = () => {
    if (inParagraph) {
      output.push("</p>");
      inParagraph = false;
    }
  };

  const closeList = () => {
    if (inList) {
      output.push("</ul>");
      inList = false;
    }
  };

  const closeBlockquote = () => {
    if (inBlockquote) {
      output.push("</blockquote>");
      inBlockquote = false;
    }
  };

  for (const rawLine of lines) {
    if (rawLine.startsWith("```")) {
      closeParagraph();
      closeList();
      closeBlockquote();
      if (inCodeBlock) {
        output.push("</code></pre>");
        inCodeBlock = false;
      } else {
        output.push("<pre><code>");
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      output.push(`${escapeHtml(rawLine)}\n`);
      continue;
    }

    const trimmed = rawLine.trim();
    if (!trimmed) {
      closeParagraph();
      closeList();
      closeBlockquote();
      continue;
    }

    const headingMatch = rawLine.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      closeParagraph();
      closeList();
      closeBlockquote();
      const level = headingMatch[1].length;
      const content = formatInline(headingMatch[2]);
      output.push(`<h${level}>${content}</h${level}>`);
      continue;
    }

    const listMatch = rawLine.match(/^[-*]\s+(.*)$/);
    if (listMatch) {
      closeParagraph();
      closeBlockquote();
      if (!inList) {
        output.push("<ul>");
        inList = true;
      }
      output.push(`<li>${formatInline(listMatch[1])}</li>`);
      continue;
    }

    const blockquoteMatch = rawLine.match(/^>\s+(.*)$/);
    if (blockquoteMatch) {
      closeParagraph();
      closeList();
      if (!inBlockquote) {
        output.push("<blockquote>");
        inBlockquote = true;
      }
      output.push(`<p>${formatInline(blockquoteMatch[1])}</p>`);
      continue;
    }

    closeList();
    closeBlockquote();
    if (!inParagraph) {
      output.push("<p>");
      inParagraph = true;
      output.push(formatInline(rawLine));
    } else {
      output.push("<br />");
      output.push(formatInline(rawLine));
    }
  }

  closeParagraph();
  closeList();
  closeBlockquote();

  if (inCodeBlock) {
    output.push("</code></pre>");
  }

  return output.join("");
}
