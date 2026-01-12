"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { format, parse } from "date-fns";
import { useCreateDocument, useDocuments } from "@/lib/hooks/use-documents";

const DAILY_SLUG_PATTERN = /^daily-(\d{4}-\d{2}-\d{2})$/;

type UseDailyNoteOptions = {
  /** Called before navigation (e.g., to close a modal) */
  onBeforeNavigate?: () => void;
};

/**
 * Check if a slug is a daily note slug and extract the date
 */
export function parseDailyNoteSlug(slug: string | null | undefined): Date | null {
  if (!slug) return null;
  const match = slug.match(DAILY_SLUG_PATTERN);
  if (!match) return null;
  try {
    return parse(match[1], "yyyy-MM-dd", new Date());
  } catch {
    return null;
  }
}

/**
 * Check if a slug is a daily note
 */
export function isDailyNote(slug: string | null | undefined): boolean {
  return parseDailyNoteSlug(slug) !== null;
}

export function useDailyNote(options: UseDailyNoteOptions = {}) {
  const router = useRouter();
  const createDocument = useCreateDocument();

  // Fetch recent documents to check if today's note exists
  // Using a broader search to find daily notes
  const { data: documents = [] } = useDocuments({ limit: 30 });

  const getDailyNoteSlug = useCallback((date: Date) => {
    return `daily-${format(date, "yyyy-MM-dd")}`;
  }, []);

  const getDailyNoteTitle = useCallback((date: Date) => {
    return format(date, "MMMM d, yyyy");
  }, []);

  const findDailyNote = useCallback(
    (date: Date) => {
      const slug = getDailyNoteSlug(date);
      return documents.find((doc) => doc.slug === slug);
    },
    [documents, getDailyNoteSlug]
  );

  const goToDate = useCallback(
    async (date: Date) => {
      options.onBeforeNavigate?.();

      const existingDoc = findDailyNote(date);

      if (existingDoc) {
        router.push(`/writing/${existingDoc.id}`);
        return existingDoc;
      }

      // Create new daily note
      const doc = await createDocument.mutateAsync({
        title: getDailyNoteTitle(date),
        collection: "notes",
        visibility: "private",
        status: "draft",
        body_md: "",
        slug: getDailyNoteSlug(date),
        tags: ["daily"],
        date: format(date, "yyyy-MM-dd"),
        metadata: {},
      });

      router.push(`/writing/${doc.id}`);
      return doc;
    },
    [
      createDocument,
      findDailyNote,
      getDailyNoteSlug,
      getDailyNoteTitle,
      options,
      router,
    ]
  );

  const goToToday = useCallback(() => {
    return goToDate(new Date());
  }, [goToDate]);

  const goToYesterday = useCallback(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return goToDate(yesterday);
  }, [goToDate]);

  const goToTomorrow = useCallback(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return goToDate(tomorrow);
  }, [goToDate]);

  const goToPreviousDay = useCallback(
    (currentDate: Date) => {
      const prevDay = new Date(currentDate);
      prevDay.setDate(prevDay.getDate() - 1);
      return goToDate(prevDay);
    },
    [goToDate]
  );

  const goToNextDay = useCallback(
    (currentDate: Date) => {
      const nextDay = new Date(currentDate);
      nextDay.setDate(nextDay.getDate() + 1);
      return goToDate(nextDay);
    },
    [goToDate]
  );

  return {
    goToToday,
    goToYesterday,
    goToTomorrow,
    goToDate,
    goToPreviousDay,
    goToNextDay,
    findDailyNote,
    getDailyNoteSlug,
    getDailyNoteTitle,
    isCreating: createDocument.isPending,
  };
}
