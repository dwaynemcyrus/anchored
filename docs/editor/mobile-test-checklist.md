# Rendered Markdown Editor - Mobile Test Checklist

Manual testing checklist for the CodeMirror 6 rendered markdown editor, focused on iPhone Safari/PWA.

## Test Environment

- **Primary**: iPhone Safari (latest iOS)
- **Secondary**: iPhone PWA (Add to Home Screen)
- **Tertiary**: Desktop Chrome/Safari

---

## Core Editing

### Tap-to-Edit Reliability
- [ ] Tap on rendered paragraph → cursor appears at tap location
- [ ] Tap on rendered heading → cursor appears, heading shows raw markdown
- [ ] Tap on rendered list → cursor appears in correct list item
- [ ] Tap on rendered blockquote → cursor appears, quote shows raw markdown
- [ ] Tap on rendered code block → cursor appears (not on copy button)
- [ ] Tap away from active block → block returns to rendered state
- [ ] Double-tap to select word works correctly
- [ ] Long-press to show iOS magnifier works

### Cursor Placement Accuracy
- [ ] Tap at start of line → cursor at line start
- [ ] Tap at end of line → cursor at line end
- [ ] Tap in middle of word → cursor at correct character
- [ ] Tap on empty line → cursor on empty line

### Selection Behavior
- [ ] Drag to select text across lines
- [ ] Select All (⌘A) works
- [ ] Copy selected text works
- [ ] Cut selected text works
- [ ] Paste text works
- [ ] iOS selection handles appear and are draggable

---

## Scroll & Navigation

### Scroll Smoothness
- [ ] Scroll through long document is smooth (60fps)
- [ ] No jank when scrolling past rendered blocks
- [ ] Momentum scrolling works (iOS rubber-band effect)
- [ ] No nested scroll containers (only one scrollbar)

### Viewport Performance
- [ ] Blocks outside viewport don't cause lag
- [ ] Scrolling to new content renders quickly
- [ ] Rapid scrolling doesn't break rendering

---

## Persistence & Sync

### Refresh Survival
- [ ] Type text, refresh page → text is preserved
- [ ] Edit, wait 2s, refresh → changes saved to Supabase
- [ ] Edit, immediate refresh → changes in localStorage

### Offline Edits
- [ ] Enable airplane mode
- [ ] Make edits → saved to localStorage
- [ ] Disable airplane mode → syncs to Supabase
- [ ] Check Supabase for correct content

### Background Save
- [ ] Edit text, switch to another app
- [ ] Return to app → no data loss
- [ ] Check Supabase → changes saved

### Conflict Handling
- [ ] Open same doc in two tabs
- [ ] Edit in tab A, save
- [ ] Edit in tab B, save
- [ ] Both tabs eventually show consistent content

---

## Task Lists

### Checkbox Toggling
- [ ] Tap unchecked checkbox → toggles to checked
- [ ] Tap checked checkbox → toggles to unchecked
- [ ] Checkbox tap doesn't enter edit mode
- [ ] Markdown source shows `[x]` / `[ ]` correctly
- [ ] Multiple checkboxes in list all work independently

### Checkbox Touch Target
- [ ] Checkbox is easy to tap (44px minimum)
- [ ] No accidental taps on adjacent text

---

## Code Blocks

### Copy Button
- [ ] Copy button visible on code block (touch devices)
- [ ] Tap copy → "Copied!" feedback shown
- [ ] Paste elsewhere → correct code pasted
- [ ] Copy button tap doesn't enter edit mode
- [ ] Long code blocks scroll horizontally

### Code Block Editing
- [ ] Tap inside code block → edit mode
- [ ] Syntax highlighting preserved in edit mode
- [ ] Exit code block → rendered with copy button

---

## Wiki-Links

### Autocomplete
- [ ] Type `[[` → autocomplete dropdown appears
- [ ] Recent documents shown with empty query
- [ ] Type text → filtered suggestions
- [ ] Tap suggestion → inserts `[[Title]]`
- [ ] Dropdown is readable on mobile (44px rows)
- [ ] Keyboard arrow keys work (if hardware keyboard)

### Rendered Links
- [ ] Wiki-links render as styled links
- [ ] Tap rendered wiki-link → navigates (doesn't edit)

---

## Callouts

### Rendering
- [ ] `> [!NOTE]` renders as blue callout
- [ ] `> [!TIP]` renders as green callout
- [ ] `> [!WARNING]` renders as yellow callout
- [ ] `> [!DANGER]` renders as red callout
- [ ] Callout title displayed correctly
- [ ] Multi-line callout content renders

### Editing
- [ ] Tap callout → edit mode shows raw markdown
- [ ] Exit callout → re-renders correctly

---

## Tables

### Rendering
- [ ] GFM tables render with borders
- [ ] Header row styled distinctly
- [ ] Table scrolls horizontally if wide

### Editing
- [ ] Tap table cell → edit mode
- [ ] Table structure visible in raw markdown

---

## Footnotes

### Rendering
- [ ] Footnote references render as superscript
- [ ] Footnote definitions render at document end

### Editing
- [ ] Tap footnote → edit mode

---

## Performance

### Large Documents
- [ ] 1000+ line document loads quickly
- [ ] Scrolling remains smooth
- [ ] Typing doesn't lag

### Memory
- [ ] Extended editing session doesn't slow down
- [ ] Switching documents clears old cache

---

## Edge Cases

### Empty Document
- [ ] Empty document shows placeholder
- [ ] Can start typing immediately

### Special Characters
- [ ] Emoji render correctly 😀
- [ ] Unicode characters preserved
- [ ] HTML entities escaped (no XSS)

### Undo/Redo
- [ ] ⌘Z undoes last change
- [ ] ⌘⇧Z redoes
- [ ] History survives across block transitions

---

## Known Limitations

Document any issues discovered during testing:

1. _____
2. _____
3. _____

---

## Test Sign-Off

| Tester | Device | iOS Version | Date | Status |
|--------|--------|-------------|------|--------|
|        |        |             |      |        |

