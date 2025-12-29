"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import type {
  ReviewSession,
  ReviewSessionInsert,
  ReviewSessionUpdate,
} from "@/types/database";

export type DailyReviewData = {
  step?: 1 | 2;
  inboxStartCount?: number;
  inboxRemaining?: number;
  inboxProcessed?: number;
  todayCompleted?: number;
  todayRemaining?: number;
  habitsCompleted?: number;
  habitsTotal?: number;
  totalTrackedSeconds?: number;
};

const reviewKeys = {
  all: ["reviews"] as const,
  daily: (date: string) => [...reviewKeys.all, "daily", date] as const,
};

function formatReviewDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

async function fetchDailyReviewSession(): Promise<ReviewSession | null> {
  const supabase = createClient();
  const reviewDate = formatReviewDate(new Date());

  const { data, error } = await supabase
    .from("review_sessions")
    .select("*")
    .eq("review_type", "daily")
    .eq("review_date", reviewDate)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function createDailyReviewSession(
  data?: DailyReviewData
): Promise<ReviewSession> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const reviewDate = formatReviewDate(new Date());

  const insert: ReviewSessionInsert = {
    owner_id: user.id,
    review_type: "daily",
    review_date: reviewDate,
    started_at: new Date().toISOString(),
    data: data ?? null,
  };

  const { data: session, error } = await supabase
    .from("review_sessions")
    .insert(insert)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return session;
}

async function updateReviewSession({
  id,
  ...updates
}: ReviewSessionUpdate & { id: string }): Promise<ReviewSession> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("review_sessions")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export function useDailyReviewSession() {
  const reviewDate = formatReviewDate(new Date());

  return useQuery({
    queryKey: reviewKeys.daily(reviewDate),
    queryFn: fetchDailyReviewSession,
  });
}

export function useCreateDailyReviewSession() {
  const queryClient = useQueryClient();
  const reviewDate = formatReviewDate(new Date());

  return useMutation({
    mutationFn: createDailyReviewSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.daily(reviewDate) });
    },
  });
}

export function useUpdateReviewSession() {
  const queryClient = useQueryClient();
  const reviewDate = formatReviewDate(new Date());

  return useMutation({
    mutationFn: updateReviewSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.daily(reviewDate) });
    },
  });
}
