# MODE Button — Visibility & Gesture Spec
# Locked, Survivable Mapping (v1.0)

## Purpose
Single global control for:
- Mode switching (intentional)
- Quick capture (reflex)
- Optional search (advanced)

Home is the base state. MODE never *goes* to Home.

---

## Gesture Mapping (LOCKED)

Tap
- Action: Open Mode Switch Sheet
- Contains exactly:
  - Command
  - Knowledge
  - Strategy
- Never opens capture
- Never navigates to Home

Swipe Up
- Action: Quick Capture
- Opens full-height capture sheet
- Keyboard opens immediately
- Single text field
- Save → Command Inbox
- No classification, no routing choice

Long Press (OPTIONAL — disabled by default)
- Action: Open Search
- Only enable if Search exists and is fast
- If enabled, must not conflict with swipe

NO swipe left
NO swipe right
NO tap-to-capture
NO directional mode switching

---

## Visibility Rules (LOCKED)

MODE button is VISIBLE in:
- Home
- Command (root + list views)
- Knowledge (browse / read / link)
- Strategy (overview / dashboards)

MODE button is HIDDEN in:
- Quick Capture sheet
- Full-screen writing / deep focus
- Inbox Clarification ritual
- Strategy Review ritual
- Any blocking system modal

Rule of thumb:
- Deciding what to do → MODE visible
- Doing the thing → MODE hidden

---

## Positioning

- Location:
  - Primary: bottom-center
  - Alternate: bottom-right
- Size:
  - Height ≥ 44px (recommended 48–52px)
  - Width ≥ 88px
- Offset:
  - Bottom = iOS safe area inset + 12px
- Z-index:
  - Highest persistent layer

---

## Interaction Safety Rules

1. Swipe threshold crossed → tap is cancelled
2. Tap recognized only on clean release
3. Swipe overrides long-press
4. MODE disabled during sheet animations
5. Mode Sheet and Capture Sheet are mutually exclusive

---

## Exit & Return Behavior

- Selecting a mode:
  - Replaces app root with selected mode
- Exiting a mode (HOME / DONE / system back):
  - Returns to Home
- MODE does NOT act as a Home button

---

## Accessibility

- Keyboard focusable
- Tap action triggerable via Enter / Space
- VoiceOver label:
  "Mode. Tap to switch modes. Swipe up to capture."

---

## Anti-Patterns (DO NOT IMPLEMENT)

- MODE acting as Home
- MODE visible during deep focus
- Tap opening capture
- Swipe switching modes
- Radial menus
- Hidden multi-step gestures

---

## Status
This spec is FINAL for v1.0.
Change only with real usage data.

***
"ritual mode" flag