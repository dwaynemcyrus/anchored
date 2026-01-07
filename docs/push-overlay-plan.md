# Push Overlay Stack Plan (Bear-Style)

## Scope
- Implement a layered push-overlay stack at the app shell level so sibling routes can stack.
- Test flow only: `/command` -> `/projects` -> `/projects/[id]` with hard-coded depth mapping.
- Use `next/link` for navigation; drag-dismiss always goes to the fixed parent route.
- Overlay panels: full-screen on mobile; panel width `clamp(384px, 70vw, 640px)` on desktop/tablet.
- Backdrop: simple dim overlay (no blur).
- Drag-to-dismiss: anywhere on the top layer, live translation; snap back unless dragged past 70% to the right, then navigate to the fixed parent route.
- Default animation timing: 300ms (adjustable).

## Non-Goals (for this iteration)
- No global application to all routes yet.
- No edge-only drag gesture.
- No blur/backdrop-filter.
- No nested route restructure (keep `/projects` as-is).

## Assumptions
- We will create `/command` under `app/(app)/` with a link to `/projects`.
- Existing `/projects` and `/projects/[id]` pages remain unchanged in path.
- Overlay state is managed at the app shell layout so layers can persist during navigation.

## Proposed Architecture
- Add a stack container in the app shell that renders the current route layer(s) as panels.
- Hard-code a route depth map for the test setup:
  - `/command` -> depth 0
  - `/projects` -> depth 1
  - `/projects/[id]` -> depth 2
- When navigating forward, keep previous layer mounted beneath the new layer.
- When navigating back (or drag-dismiss), animate the top layer out and reveal the previous layer.
- Dim overlay applies to the immediate previous layer when a top layer is active.

## Interaction Details
- Drag start from anywhere on the top layer.
- Drag follows pointer/touch with `transform: translateX(...)`.
- On release:
  - If dragged >= 70% of viewport width -> navigate to fixed parent route.
  - Else -> snap back to `translateX(0)`.
- When a drag is active, disable page scroll on the top layer to prevent accidental scroll/drag conflicts.

## File-Level Changes (Draft)
- `app/(app)/layout.tsx`
  - Add the overlay stack container and route depth mapping.
  - Manage animation state and active layer rendering.
- `app/(app)/command/page.tsx`
  - New page with a link to `/projects`.
- `components/layout/app-shell.tsx`
  - Integrate stack container with shell to ensure persistent mounting.
- `components/layout/push-overlay-stack.tsx` (new)
  - Encapsulate panel rendering, dim overlay, and drag-dismiss behavior.
- `components/layout/push-overlay-stack.module.css` (new)
  - Panel sizing, animation, and dim overlay styles.

## Risks / Open Questions
- Overlay stack needs to avoid interfering with existing pull-search and modal overlays.
- Drag-anywhere may conflict with horizontal scrollable content.
- Fixed parent routing needs explicit map per layer to avoid unexpected destinations.

## Validation
- `/command` -> `/projects` should slide in as layer 1.
- `/projects` -> `/projects/[id]` should slide in as layer 2.
- Dragging layer 2 right > 70% should return to `/projects`.
- Dragging layer 1 right > 70% should return to `/command`.
- Backdrop dim shows only when a higher layer is active.
