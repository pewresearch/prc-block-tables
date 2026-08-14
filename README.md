# PRC Block Tables

Table blocks for the Pew Research Center publishing platform.

`PRC Block Tables` ships the Gutenberg blocks used to author tabular data across Pew Research Center sites. It provides **Power Table**, a rich responsive data table; **Power Spreadsheet**, an Excel-like tabbed container; and **Remote Pivot Table**, a Remote Data Blocks template for pivoting tabular remote data. The plugin also registers an editor data store so other plugins can read structured per-sheet data.

## Blocks

### Power Table

`prc-block/table` — Create a powerful and flexible table with responsive design and sorting/filtering options.

Power Table stores its data as structured `head`, `body`, and `foot` rows rather than raw HTML. Key capabilities:

- Import or paste CSV data to populate the table.
- Configure per-column metadata via `columnMeta` — mark columns sortable, hidden, or rounded to a set number of decimals.
- Round numeric cells with `roundDecimals` (rendered as `data-prc-round-decimals`).
- Control responsive behavior: `isScrollOnPc`, `isScrollOnMobile`, `isStackedOnMobile`, `sticky`, and `hasFixedLayout`.
- Add a table title, caption, and source note.
- Style individual cells and columns.
- Validate data against a `validationSchema`, tracked by the `isValid` flag.

Power Table exposes block context for consumers:

| Context key                        | Source attribute   |
| ---------------------------------- | ------------------ |
| `prc-block/table/columnMeta`       | `columnMeta`       |
| `prc-block/table/validationSchema` | `validationSchema` |
| `prc-block/table/isValid`          | `isValid`          |

#### Generate Tabular Data (AI)

When the WordPress AI integration (`ais-ai`) is active, Power Table gains an optional **Generate Tabular Data** feature. It adds a "Suggest with AI" control in the editor that generates table content from Pew Research Center material. The feature is editor-side only and registers the `prc-ai/generate-tabular-data` ability via the WordPress Abilities API.

### Power Spreadsheet

`prc-block/power-spreadsheet` — An Excel-like tabbed container for Power Tables. Each tab is a sheet.

Power Spreadsheet allows only `prc-block/table` as inner blocks, so every sheet is a Power Table. An Excel-style tab row sits below the sheet content. The block tracks the visible sheet with the `activeSheetIndex` attribute; selecting a sheet table from the list view switches the active sheet.

### Remote Pivot Table

`prc-block/remote-pivot-table` — Pivots tabular data from a Remote Data Blocks parent into tabbed `core/table` views. See [remote-pivot-table.md](../../docs/plugins/prc-block-tables/blocks/remote-pivot-table.md).

**Soft runtime dependencies** (not declared in `Requires Plugins` to avoid a circular header with block-library):

| Dependency | Why |
| --- | --- |
| `prc-block-library` | Inner `prc-block/tabs` / `prc-block/tab` blocks and `render_tabs()` helper |
| `remote-data-blocks` | Parent block context (`remote-data-blocks/remoteData`) |

## Editor data store

Power Spreadsheet registers a `@wordpress/data` store named `prc-block/power-spreadsheet`. Other editor plugins use its selectors to read structured per-sheet data without parsing block markup.

Read one spreadsheet's sheets:

```js
const sheets = wp.data
	.select('prc-block/power-spreadsheet')
	.getSheetData(spreadsheetClientId);
```

Each sheet returns `{ id, name, head, body, foot, columnMeta }`. Use `getSpreadsheetData( clientId )` for the same data wrapped as `{ sheets: [...] }`.

| Selector                         | Returns                                          |
| -------------------------------- | ------------------------------------------------ |
| `getSheetData( clientId )`       | Array of sheet objects for the spreadsheet       |
| `getSpreadsheetData( clientId )` | `{ sheets: [...] }` wrapper around the same data |

## Requirements

- WordPress 6.8+
- PHP 8.2+
- [`prc-scripts`](https://github.com/pewresearch/prc-scripts) (must be active)

## Development

Primary development happens in the [prc-platform](https://github.com/pewresearch/prc-platform) monorepo under `plugins/prc-block-tables/`. This repository is a public mirror of the built plugin, updated automatically by the platform release and ship workflows.

Build from the monorepo root:

```bash
npx turbo build --filter=@prc/block-tables
```

## License

GPL-2.0-or-later. See [LICENSE](LICENSE).
