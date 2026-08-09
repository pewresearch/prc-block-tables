# Data Table — Accessibility Audit & Remediation

Audit of the `prc-block/data-table-render` table (part of `@prc/block-tables`),
performed against the WCAG 2.1 checklist in `.claude/skills/accessibility-audit/SKILL.md`.

The table is rendered client‑side by d3 via the Interactivity API; the server only ships
an empty `<div class="prc-data-table-mount">`. The audited markup is generated in
`blocks/src/data-table-render/view.js`, with styles in
`blocks/src/data-table-render/style.scss`.

## Summary of findings

| # | Severity | Issue | WCAG |
|---|----------|-------|------|
| 1 | High | Keyboard focus destroyed on every sort (full DOM teardown/rebuild) | 2.4.3, 3.2.2 |
| 2 | High | No visible focus indicator on sortable headers | 2.4.7 |
| 3 | High | `role="grid"` declared but the grid keyboard model is not implemented | 4.1.2 |
| 4 | High | Row‑key category conveyed by a color swatch alone (no text/label) | 1.4.1, 1.3.1 |
| 5 | Medium | No table caption / accessible name | 1.3.1, 2.4.6 |
| 6 | Medium | Row‑identifier column rendered as `<td>`, not `<th scope="row">` | 1.3.1 |
| 7 | Medium | Redundant ARIA roles duplicating native table semantics | 4.1.2 |
| 8 | Low | Sortable header was a `th[tabindex=0]`, not a real button | 4.1.2 |
| 9 | Low | No live‑region announcement when sort/filter changes the data | 4.1.3 |
| 10 | Low | Filter button text contrast borderline on hover state | 1.4.3 |

## Issues & implemented solutions

### 1. Focus lost on every sort (High)
**Problem:** `drawTable()` wiped and rebuilt the entire table (`root.selectAll('*').remove()`)
on each interaction, so the `<th>` the user just activated was removed and focus fell back
to `<body>`.

**Fix:** Before teardown, capture the focused sort control's column
(`mount.ownerDocument.activeElement` → `data-col`). After the rebuild, re‑focus the matching
`button[data-col="…"]` (via `CSS.escape`).

### 2. No visible focus indicator on sortable headers (High)
**Problem:** Headers were focusable but `style.scss` had no `:focus`/`:focus-visible` rule, so
keyboard users got no visible focus ring (relying on suppressed UA defaults).

**Fix:** Sort controls are now native `<button>`s with an explicit
`.prc-data-table__sort-button:focus-visible` outline matching the filter button pattern.

### 3. `role="grid"` without the grid interaction model (High)
**Problem:** The static data table declared `role="grid"` (plus `row`/`cell`/`rowgroup`/
`columnheader`), which overrides native table semantics while not delivering grid keyboard
navigation (arrow keys, roving tabindex).

**Fix:** Removed `role="grid"` and all redundant role attributes; native
`<table>`/`<thead>`/`<tbody>`/`<th>`/`<td>` semantics now stand. Kept the meaningful `scope`
and `aria-sort` attributes.

### 4. Row‑key category conveyed by color alone (High)
**Problem:** When a key/legend is configured, each row's category was a bare colored `<span>`
inside a `<td>` with no text, and the column header was `aria-hidden` + empty — invisible to
assistive tech and dependent on color perception.

**Fix:** The swatch is now `aria-hidden="true"` and paired with a visually‑hidden text label
of the category value (`cellKey || 'Uncategorized'`). The key column header carries a
visually‑hidden "Category" name instead of being hidden.

### 5. No table caption / accessible name (Medium)
**Problem:** No `<caption>` or `aria-label`, so screen‑reader users navigating by table heard
no description.

**Fix:** A `<caption>` is appended, using the active sheet name when meaningful and falling
back to a generic "Data table". It is visually hidden via the shared sr‑only utility.

> Follow‑up option: add an editor‑authored `caption` attribute on the controller block and pass
> it through block context for a more descriptive, content‑specific name.

### 6. Row‑identifier column should be a header cell (Medium)
**Problem:** The first/mobile‑header column was styled as a row header but emitted as `<td>`,
so data cells had no programmatic row context.

**Fix:** The `headerCol` cell is emitted as `<th scope="row">` (other cells remain `<td>`).

### 7. Redundant ARIA roles (Medium)
**Problem:** `role="row"`, `role="cell"`, `role="rowgroup"`, `role="columnheader"` duplicated
native semantics.

**Fix:** Removed; native elements carry the correct implicit roles.

### 8. Sortable header not a real button (Low)
**Problem:** Sorting used a `th[tabindex=0]` with a click handler and a manual
`MouseEvent` dispatch from a `keydown` handler.

**Fix:** Replaced with a native `<button type="button">` wrapping the column label — native
Enter/Space activation, a "button" role announcement, and a real focus ring. The manual
keydown handler and `MouseEvent` usage were removed.

### 9. No live‑region feedback on sort (Low)
**Problem:** Sorting silently rebuilt the table with no announcement for non‑visual users.

**Fix:** A persistent polite live region (`role="status"`, `aria-live="polite"`) is created as
a sibling of the mount (so it survives redraws) and announces
`Table sorted by <column>, ascending|descending` on each sort.

### 10. Filter button hover contrast (Low)
**Problem:** Filter button text `rgba(0,0,0,0.6)` on the `#dadbdb` hover background fell to
roughly ~4.2:1, below the 4.5:1 AA threshold for normal text.

**Fix:** Hover text darkened to `rgba(0,0,0,0.8)`.

## Files changed

- `blocks/src/data-table-render/view.js` — focus preservation, native button sort controls,
  role cleanup, row‑key text labels, caption, `th scope="row"` row headers, live‑region
  announcements.
- `blocks/src/data-table-render/style.scss` — sr‑only utility, caption/status hiding,
  `.prc-data-table__sort-button` reset + `:focus-visible` outline, sort‑arrow moved onto the
  button.
- `blocks/src/data-table-filter/style.scss` — hover text contrast bump.

## Verification

- `npx eslint blocks/src/data-table-render/view.js` — passes.
- `npm run build -w @prc/block-tables` — builds successfully; compiled
  `build/data-table-render/{view.js,style-index.css}` contain the new markup/styles and no
  longer reference `role="grid"`.

## Not yet addressed (optional)

- Editor‑authored caption text (see note under #5).
- Header cell touch‑target height (~25px) meets the 24px AA minimum (2.5.8) but is below the
  more comfortable 44px target; revisit if mobile sort tap targets prove difficult.
- Page‑level heading‑order irregularity (sidebar `<h5>` before the `<h1>`) is site chrome,
  outside the table scope.
