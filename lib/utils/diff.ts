export type DiffLineType = "unchanged" | "added" | "removed";

export type DiffLine = {
  type: DiffLineType;
  content: string;
  lineNumber?: number;
};

export type DiffResult = {
  lines: DiffLine[];
  addedCount: number;
  removedCount: number;
};

/**
 * Simple line-based diff using longest common subsequence (LCS).
 * Compares old text to new text and returns a list of diff lines.
 */
export function diffLines(oldText: string, newText: string): DiffResult {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");

  // Build LCS table
  const m = oldLines.length;
  const n = newLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to build diff
  const result: DiffLine[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.unshift({
        type: "unchanged",
        content: oldLines[i - 1],
        lineNumber: j,
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({
        type: "added",
        content: newLines[j - 1],
        lineNumber: j,
      });
      j--;
    } else {
      result.unshift({
        type: "removed",
        content: oldLines[i - 1],
      });
      i--;
    }
  }

  const addedCount = result.filter((l) => l.type === "added").length;
  const removedCount = result.filter((l) => l.type === "removed").length;

  return { lines: result, addedCount, removedCount };
}

export type MetadataChange = {
  field: string;
  oldValue: string | null;
  newValue: string | null;
};

/**
 * Compare metadata fields between two versions.
 */
export function diffMetadata(
  oldMeta: Record<string, unknown>,
  newMeta: Record<string, unknown>,
  fields: string[]
): MetadataChange[] {
  const changes: MetadataChange[] = [];

  for (const field of fields) {
    const oldVal = formatValue(oldMeta[field]);
    const newVal = formatValue(newMeta[field]);

    if (oldVal !== newVal) {
      changes.push({
        field,
        oldValue: oldVal,
        newValue: newVal,
      });
    }
  }

  return changes;
}

function formatValue(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  return String(value);
}
