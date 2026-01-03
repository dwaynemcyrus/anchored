# End-of-Day Review — Updated Flow (v4)

UI STYLE
- Match existing Inbox Review "document" style: white background, black text, thin rules/dividers, system font, centered narrow column, simple rectangular buttons.
- No icons, color, shadows, gradients, cards, or animations.

DATA / FLAGS
- Use `next_task` boolean.
- "Anytime" list is the holding area for non-Today items.
- Flagged items in Anytime show a "Next" label.
- Flags persist across reviews unless cleared by user action.

ENTRY POINT
- Add "End Day" button at bottom of Today screen.
- On click:
  - If timer running: open existing Stop Timer modal; after confirm, go to Screen 0.
  - If no timer: go directly to Screen 0.

FLOW (linear, no skipping)

Screen 0: END REVIEW START
- Title: END REVIEW
- Body: "End-of-day review."
- Button: [Continue]

Screen 1: TODAY SWEEP (one at a time)
- Title: END REVIEW — TODAY
- Show "Item X of Y" + task text
- Buttons:
  - [DONE] -> mark done
  - [DELETE] -> delete
  - [NEXT] -> set `next_task=true`, move to Anytime
  - [LATER] -> move to Anytime, clear flag
- Now Primary/Secondary are NOT swept (preserved) but still count toward cap later.
- If zero Today items, advance immediately to Screen 2.

Screen 2: INBOX ZERO (one at a time)
- Title: END REVIEW — INBOX
- Show "Item X of Y" + item text
- Buttons:
  - [NEXT] -> set `next_task=true`, move to Anytime
  - [LATER] -> move to Anytime, clear flag
  - [DONE] -> mark done
  - [DELETE] -> delete
- Repeat until inbox empty.

Screen 3: DECIDE NEXT (fill to cap)
- Cap = 5 total (Now Primary + Now Secondary + Today tasks).
- Remaining slots = 5 - (nowPrimary ? 1 : 0) - (nowSecondary ? 1 : 0) - (alreadySelectedTodayCount).
- Show:
  - Today capacity: 5
  - Already reserved (Now): N
  - Slots remaining: M
- List items where `next_task=true`.
- Allow selection up to M; disable further selection once full.
- [Confirm Next] always enabled (even if M = 0).
- On confirm:
  - Selected -> move to Today, clear flag
  - Unselected -> remain in Anytime with flag

Empty-state behavior:
- If no `next_task` items exist, show Anytime list to allow flagging.
  - Selecting items sets `next_task=true` and adds them to the list.
  - After flagging, proceed to normal selection with the same M cap.

Screen 4: DAY CLOSED
- Title: DAY CLOSED
- Body: "Inbox empty. Today is set."
- Button: [Close] exits review mode.

IMPORTANT RULES
- No new planning features, projects, or extra statuses.
- Keep layout and language identical to existing Inbox Review style.
