"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { useCreateAvoidHabit } from "@/lib/hooks/use-avoid-habits";
import { useCreateQuotaHabit } from "@/lib/hooks/use-quota-habits";
import { useCreateBuildHabit } from "@/lib/hooks/use-build-habits";
import { useCreateScheduleHabit } from "@/lib/hooks/use-schedule-habits";
import { getBrowserTimezone } from "@/lib/time/local-date";
import type { QuotaPeriod } from "@/lib/time/periods";
import type { SchedulePattern, DayOfWeek } from "@/lib/time/schedule";

type HabitIntent = "stop" | "limit" | "build" | "schedule" | null;
type WizardStep = "intent" | "name" | "rule" | "review";

interface HabitData {
  intent: HabitIntent;
  name: string;
  // Quota-specific
  quotaAmount: number;
  quotaUnit: string;
  quotaPeriod: QuotaPeriod;
  nearThresholdPercent: number;
  allowSoftOver: boolean;
  // Build-specific
  buildTarget: number;
  buildUnit: string;
  buildPeriod: QuotaPeriod;
  // Schedule-specific
  scheduleType: "daily" | "weekly";
  scheduleTime: string;
  scheduleDays: DayOfWeek[];
}

const initialData: HabitData = {
  intent: null,
  name: "",
  quotaAmount: 30,
  quotaUnit: "minutes",
  quotaPeriod: "day",
  nearThresholdPercent: 80,
  allowSoftOver: false,
  buildTarget: 10,
  buildUnit: "count",
  buildPeriod: "day",
  scheduleType: "daily",
  scheduleTime: "06:00",
  scheduleDays: ["mon", "wed", "fri"],
};

export default function NewHabitPage() {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>("intent");
  const [data, setData] = useState<HabitData>(initialData);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const createAvoidHabit = useCreateAvoidHabit();
  const createQuotaHabit = useCreateQuotaHabit();
  const createBuildHabit = useCreateBuildHabit();
  const createScheduleHabit = useCreateScheduleHabit();

  const isCreating = createAvoidHabit.isPending || createQuotaHabit.isPending || createBuildHabit.isPending || createScheduleHabit.isPending;

  const handleBack = () => {
    switch (step) {
      case "name":
        setStep("intent");
        break;
      case "rule":
        setStep("name");
        break;
      case "review":
        setStep("rule");
        break;
      default:
        router.back();
    }
  };

  const handleIntentSelect = (intent: HabitIntent) => {
    setData((prev) => ({ ...prev, intent }));
    setStep("name");
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (data.name.trim()) {
      setStep("rule");
    }
  };

  const handleRuleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("review");
  };

  const handleCreate = async () => {
    if (data.intent === "stop") {
      await createAvoidHabit.mutateAsync({ title: data.name });
    } else if (data.intent === "limit") {
      await createQuotaHabit.mutateAsync({
        title: data.name,
        quotaAmount: data.quotaAmount,
        quotaUnit: data.quotaUnit,
        quotaPeriod: data.quotaPeriod,
        nearThresholdPercent: data.nearThresholdPercent,
        allowSoftOver: data.allowSoftOver,
      });
    } else if (data.intent === "build") {
      await createBuildHabit.mutateAsync({
        title: data.name,
        buildTarget: data.buildTarget,
        buildUnit: data.buildUnit,
        buildPeriod: data.buildPeriod,
      });
    } else if (data.intent === "schedule") {
      const pattern: SchedulePattern = data.scheduleType === "daily"
        ? { type: "daily", time: data.scheduleTime }
        : { type: "weekly", days: data.scheduleDays, time: data.scheduleTime };
      await createScheduleHabit.mutateAsync({
        title: data.name,
        schedulePattern: pattern,
        scheduleTimezone: getBrowserTimezone(),
      });
    }
    router.push("/habits");
  };

  const getStepIndex = () => {
    switch (step) {
      case "intent":
        return 0;
      case "name":
        return 1;
      case "rule":
        return 2;
      case "review":
        return 3;
      default:
        return 0;
    }
  };

  const getRuleSummary = () => {
    if (data.intent === "stop") {
      return "If I do this today, the day is broken.";
    }
    if (data.intent === "limit") {
      const unitLabel = getUnitLabel(data.quotaUnit, data.quotaAmount);
      const periodLabel = data.quotaPeriod === "day" ? "per day" : data.quotaPeriod === "week" ? "per week" : "per month";
      return `Limit to ${data.quotaAmount} ${unitLabel} ${periodLabel}.`;
    }
    if (data.intent === "build") {
      const unitLabel = getBuildUnitLabel(data.buildUnit, data.buildTarget);
      const periodLabel = data.buildPeriod === "day" ? "per day" : data.buildPeriod === "week" ? "per week" : "per month";
      return `At least ${data.buildTarget} ${unitLabel} ${periodLabel}.`;
    }
    if (data.intent === "schedule") {
      const timeLabel = formatTimeForDisplay(data.scheduleTime);
      if (data.scheduleType === "daily") {
        return `Every day at ${timeLabel}.`;
      }
      const dayLabels = data.scheduleDays.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(", ");
      return `${dayLabels} at ${timeLabel}.`;
    }
    return "";
  };

  const formatTimeForDisplay = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  const getUnitLabel = (unit: string, amount: number) => {
    const plural = amount !== 1;
    switch (unit) {
      case "minutes":
        return plural ? "minutes" : "minute";
      case "count":
        return plural ? "times" : "time";
      case "grams":
        return "grams";
      case "units":
        return plural ? "units" : "unit";
      case "currency":
        return "dollars";
      default:
        return unit;
    }
  };

  const getBuildUnitLabel = (unit: string, amount: number) => {
    const plural = amount !== 1;
    switch (unit) {
      case "minutes":
        return plural ? "minutes" : "minute";
      case "count":
        return plural ? "times" : "time";
      case "pages":
        return plural ? "pages" : "page";
      case "steps":
        return "steps";
      case "reps":
        return plural ? "reps" : "rep";
      case "sessions":
        return plural ? "sessions" : "session";
      default:
        return unit;
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button type="button" className={styles.backButton} onClick={handleBack}>
          ← Back
        </button>
        <h1 className={styles.title}>Create a habit</h1>
        {step !== "intent" && (
          <p className={styles.subtitle}>
            {step === "name" && "What will you call this habit?"}
            {step === "rule" && "Define the rule"}
            {step === "review" && "Review and create"}
          </p>
        )}
      </header>

      {/* Step indicator */}
      <div className={styles.steps}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`${styles.stepDot} ${
              i === getStepIndex()
                ? styles.stepDotActive
                : i < getStepIndex()
                ? styles.stepDotComplete
                : ""
            }`}
          />
        ))}
      </div>

      {/* Step 1: Intent */}
      {step === "intent" && (
        <div>
          <p className={styles.subtitle}>What kind of change do you want?</p>
          <div className={styles.intentList}>
            <button
              type="button"
              className={styles.intentButton}
              onClick={() => handleIntentSelect("stop")}
            >
              <span className={styles.intentLabel}>Stop something</span>
              <span className={styles.intentDescription}>Break a habit completely</span>
            </button>
            <button
              type="button"
              className={styles.intentButton}
              onClick={() => handleIntentSelect("limit")}
            >
              <span className={styles.intentLabel}>Limit something</span>
              <span className={styles.intentDescription}>Keep it under control</span>
            </button>
            <button
              type="button"
              className={styles.intentButton}
              onClick={() => handleIntentSelect("build")}
            >
              <span className={styles.intentLabel}>Build something</span>
              <span className={styles.intentDescription}>Minimum commitment per period</span>
            </button>
            <button
              type="button"
              className={styles.intentButton}
              onClick={() => handleIntentSelect("schedule")}
            >
              <span className={styles.intentLabel}>Schedule a ritual</span>
              <span className={styles.intentDescription}>Show up at specific times</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Name */}
      {step === "name" && (
        <form onSubmit={handleNameSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="habit-name" className={styles.label}>
              Habit name
            </label>
            <input
              id="habit-name"
              type="text"
              className={styles.input}
              value={data.name}
              onChange={(e) => setData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder={data.intent === "stop" ? "e.g., Smoking" : data.intent === "limit" ? "e.g., Social media" : data.intent === "build" ? "e.g., Read" : "e.g., Morning prayer"}
              autoFocus
            />
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.secondaryButton} onClick={handleBack}>
              Back
            </button>
            <button
              type="submit"
              className={styles.primaryButton}
              disabled={!data.name.trim()}
            >
              Continue
            </button>
          </div>
        </form>
      )}

      {/* Step 3: Rule */}
      {step === "rule" && (
        <form onSubmit={handleRuleSubmit}>
          {data.intent === "stop" && (
            <>
              <div className={styles.ruleDescription}>
                If I do this today, the day is broken.
              </div>
              <p className={styles.subtitle}>
                This is an avoid habit. Any occurrence breaks your streak.
              </p>
            </>
          )}

          {data.intent === "limit" && (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label}>Set a limit</label>
                <div className={styles.inputRow}>
                  <input
                    type="number"
                    className={`${styles.input} ${styles.inputSmall}`}
                    value={data.quotaAmount}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        quotaAmount: parseInt(e.target.value) || 0,
                      }))
                    }
                    min={1}
                  />
                  <select
                    className={styles.select}
                    value={data.quotaUnit}
                    onChange={(e) =>
                      setData((prev) => ({ ...prev, quotaUnit: e.target.value }))
                    }
                  >
                    <option value="minutes">minutes</option>
                    <option value="count">times</option>
                    <option value="grams">grams</option>
                    <option value="units">units</option>
                    <option value="currency">dollars</option>
                  </select>
                  <select
                    className={styles.select}
                    value={data.quotaPeriod}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        quotaPeriod: e.target.value as QuotaPeriod,
                      }))
                    }
                  >
                    <option value="day">per day</option>
                    <option value="week">per week</option>
                    <option value="month">per month</option>
                  </select>
                </div>
              </div>

              <div className={styles.optionalSection}>
                <button
                  type="button"
                  className={styles.optionalToggle}
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  {showAdvanced ? "Hide advanced options" : "Show advanced options"}
                </button>
                {showAdvanced && (
                  <div className={styles.optionalContent}>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>
                        Warning threshold ({data.nearThresholdPercent}%)
                      </label>
                      <input
                        type="range"
                        min={50}
                        max={95}
                        step={5}
                        value={data.nearThresholdPercent}
                        onChange={(e) =>
                          setData((prev) => ({
                            ...prev,
                            nearThresholdPercent: parseInt(e.target.value),
                          }))
                        }
                        style={{ width: "100%" }}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={data.allowSoftOver}
                          onChange={(e) =>
                            setData((prev) => ({
                              ...prev,
                              allowSoftOver: e.target.checked,
                            }))
                          }
                        />
                        <span className={styles.label} style={{ margin: 0 }}>
                          Allow soft over-limit
                        </span>
                      </label>
                      <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginTop: "0.25rem" }}>
                        Going over won&apos;t break your streak
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {data.intent === "build" && (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label}>Set a minimum target</label>
                <div className={styles.inputRow}>
                  <input
                    type="number"
                    className={`${styles.input} ${styles.inputSmall}`}
                    value={data.buildTarget}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        buildTarget: parseInt(e.target.value) || 0,
                      }))
                    }
                    min={1}
                  />
                  <select
                    className={styles.select}
                    value={data.buildUnit}
                    onChange={(e) =>
                      setData((prev) => ({ ...prev, buildUnit: e.target.value }))
                    }
                  >
                    <option value="count">times</option>
                    <option value="minutes">minutes</option>
                    <option value="pages">pages</option>
                    <option value="steps">steps</option>
                    <option value="reps">reps</option>
                    <option value="sessions">sessions</option>
                  </select>
                  <select
                    className={styles.select}
                    value={data.buildPeriod}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        buildPeriod: e.target.value as QuotaPeriod,
                      }))
                    }
                  >
                    <option value="day">per day</option>
                    <option value="week">per week</option>
                    <option value="month">per month</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {data.intent === "schedule" && (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label}>Frequency</label>
                <select
                  className={styles.select}
                  value={data.scheduleType}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      scheduleType: e.target.value as "daily" | "weekly",
                    }))
                  }
                >
                  <option value="daily">Every day</option>
                  <option value="weekly">Specific days</option>
                </select>
              </div>

              {data.scheduleType === "weekly" && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>Days</label>
                  <div className={styles.daySelector}>
                    {(["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as DayOfWeek[]).map((day) => (
                      <label key={day} className={styles.dayLabel}>
                        <input
                          type="checkbox"
                          checked={data.scheduleDays.includes(day)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setData((prev) => ({
                                ...prev,
                                scheduleDays: [...prev.scheduleDays, day],
                              }));
                            } else {
                              setData((prev) => ({
                                ...prev,
                                scheduleDays: prev.scheduleDays.filter((d) => d !== day),
                              }));
                            }
                          }}
                        />
                        {day.charAt(0).toUpperCase() + day.slice(1)}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className={styles.formGroup}>
                <label className={styles.label}>Time</label>
                <input
                  type="time"
                  className={styles.input}
                  value={data.scheduleTime}
                  onChange={(e) =>
                    setData((prev) => ({ ...prev, scheduleTime: e.target.value }))
                  }
                />
              </div>
            </>
          )}

          <div className={styles.actions}>
            <button type="button" className={styles.secondaryButton} onClick={handleBack}>
              Back
            </button>
            <button type="submit" className={styles.primaryButton}>
              Continue
            </button>
          </div>
        </form>
      )}

      {/* Step 4: Review */}
      {step === "review" && (
        <div>
          <div className={styles.summary}>
            <p className={styles.summaryLabel}>
              {data.intent === "stop" ? "Avoid habit" : data.intent === "limit" ? "Quota habit" : data.intent === "build" ? "Build habit" : "Schedule habit"}
            </p>
            <p className={styles.summaryValue}>{data.name}</p>
            <p className={styles.summaryRule}>{getRuleSummary()}</p>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.secondaryButton} onClick={handleBack}>
              Back
            </button>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleCreate}
              disabled={isCreating}
            >
              {isCreating ? "Creating..." : "Create habit"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
