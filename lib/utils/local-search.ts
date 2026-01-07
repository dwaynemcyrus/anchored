const HIGHLIGHT_ATTR = "data-local-search";
const HIGHLIGHT_CLASS = "localSearchHighlight";
const ACTIVE_CLASS = "localSearchHighlightActive";

const EXCLUDED_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT"]);

export function clearLocalSearchHighlights(root: HTMLElement) {
  const highlights = root.querySelectorAll(`span[${HIGHLIGHT_ATTR}]`);
  highlights.forEach((node) => {
    const parent = node.parentNode;
    if (!parent) return;
    const text = document.createTextNode(node.textContent ?? "");
    parent.replaceChild(text, node);
    parent.normalize();
  });
}

function collectTextNodes(root: HTMLElement): Text[] {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        const text = node.nodeValue ?? "";
        if (!text.trim()) return NodeFilter.FILTER_SKIP;
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_SKIP;
        if (EXCLUDED_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
        if (parent.hasAttribute(HIGHLIGHT_ATTR)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );

  let current = walker.nextNode();
  while (current) {
    nodes.push(current as Text);
    current = walker.nextNode();
  }
  return nodes;
}

export function applyLocalSearch(
  root: HTMLElement,
  query: string
): HTMLElement[] {
  clearLocalSearchHighlights(root);

  const normalized = query.trim();
  if (!normalized) {
    return [];
  }

  const queryLower = normalized.toLowerCase();
  const matches: HTMLElement[] = [];
  const textNodes = collectTextNodes(root);

  textNodes.forEach((node) => {
    let currentNode: Text | null = node;
    while (currentNode && currentNode.nodeValue) {
      const text = currentNode.nodeValue;
      const lower = text.toLowerCase();
      const index = lower.indexOf(queryLower);
      if (index === -1) break;

      const before = currentNode.splitText(index);
      const after = before.splitText(normalized.length);

      const highlight = document.createElement("span");
      highlight.setAttribute(HIGHLIGHT_ATTR, "true");
      highlight.className = HIGHLIGHT_CLASS;
      highlight.textContent = before.nodeValue ?? "";
      before.parentNode?.replaceChild(highlight, before);
      matches.push(highlight);

      currentNode = after;
    }
  });

  return matches;
}

export function setActiveMatch(
  matches: HTMLElement[],
  index: number
) {
  matches.forEach((match, i) => {
    if (i === index) {
      match.classList.add(ACTIVE_CLASS);
      match.scrollIntoView({ block: "center", behavior: "smooth" });
    } else {
      match.classList.remove(ACTIVE_CLASS);
    }
  });
}

export function getHighlightClasses() {
  return { highlightClass: HIGHLIGHT_CLASS, activeClass: ACTIVE_CLASS };
}
