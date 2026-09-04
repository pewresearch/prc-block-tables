/**
 * Internal Dependencies
 */
import { normalizeContextData } from '../data-table-controller/lib/context-data';
import {
	isPivotConfigured,
	normalizePivotColumns,
	normalizePivotExtraColumns,
	normalizePivotValueFields,
	pivotSheets,
} from '../data-table-controller/lib/pivot';

/**
 * Default categorical palette (Tableau-style), max 20 categories.
 */
export const DEFAULT_PALETTE = [
	'#4e79a7',
	'#f28e2b',
	'#e15759',
	'#76b7b2',
	'#59a14f',
	'#edc949',
	'#af7aa1',
	'#ff9da7',
	'#9c755f',
	'#bab0ab',
	'#5778a4',
	'#e49444',
	'#d1615d',
	'#85b6b2',
	'#6a9f58',
	'#e7ca60',
	'#a87c9f',
	'#f1a2a9',
	'#967662',
	'#b8b0ac',
];

const MAX_UNIQUE = 20;

/**
 * Build a sheets map from controller attributes / context data (pre-pivot).
 *
 * @param {Object}  params
 * @param {string}  params.dataSource
 * @param {Object}  params.jsonTable
 * @param {Object}  params.csvTable
 * @param {unknown} params.contextData Provider or Firebase payload.
 * @return {Record<string, { columns: string[], rows: Record<string, unknown>[] }>} Sheets map.
 */
function getRawSourceSheets({ dataSource, jsonTable, csvTable, contextData }) {
	if (dataSource === 'context' || dataSource === 'firebase') {
		return normalizeContextData(contextData);
	}
	if (dataSource === 'json') {
		if (
			jsonTable?.sheets &&
			typeof jsonTable.sheets === 'object' &&
			!Array.isArray(jsonTable.sheets)
		) {
			return jsonTable.sheets;
		}
		if (
			Array.isArray(jsonTable?.columns) ||
			Array.isArray(jsonTable?.rows)
		) {
			return {
				default: {
					columns: Array.isArray(jsonTable.columns)
						? jsonTable.columns
						: [],
					rows: Array.isArray(jsonTable.rows) ? jsonTable.rows : [],
				},
			};
		}
	}
	if (dataSource === 'csv' && csvTable) {
		return {
			default: {
				columns: Array.isArray(csvTable.columns)
					? csvTable.columns
					: [],
				rows: Array.isArray(csvTable.rows) ? csvTable.rows : [],
			},
		};
	}
	return {};
}

/**
 * Resolve columns/rows from the controller’s effective table (including pivot).
 *
 * Mirrors the data-table-controller editor pipeline so key-column options
 * include group-by pivot columns (e.g. year, region) and Firebase/context rows.
 *
 * @param {Object}                params                   Controller state.
 * @param {string}                params.dataSource        Active data source.
 * @param {Object|null|undefined} params.jsonTable         Controller jsonTable.
 * @param {Object|null|undefined} params.csvTable          Controller csvTable.
 * @param {string}                params.defaultJsonSheet  Active sheet key.
 * @param {unknown}               params.contextData       Firebase / provider data.
 * @param {boolean}               params.pivotEnabled      Pivot toggle.
 * @param {string}                params.pivotIndexColumn  Pivot index field.
 * @param {string}                params.pivotColumnField  Pivot column field.
 * @param {unknown}               params.pivotColumns      Selected pivot columns.
 * @param {unknown}               params.pivotValueFields  Value-field sheets.
 * @param {unknown}               params.pivotExtraColumns Group-by pivot fields.
 * @return {{ columns: string[], rows: Record<string, unknown>[] }} Active sheet columns and rows.
 */
export function resolveTableData({
	dataSource,
	jsonTable,
	csvTable,
	defaultJsonSheet,
	contextData,
	pivotEnabled = false,
	pivotIndexColumn = '',
	pivotColumnField = '',
	pivotColumns = [],
	pivotValueFields = [],
	pivotExtraColumns = [],
}) {
	const rawSheets = getRawSourceSheets({
		dataSource,
		jsonTable,
		csvTable,
		contextData,
	});

	const pivotActive = isPivotConfigured({
		pivotEnabled,
		pivotIndexColumn,
		pivotColumnField,
		pivotColumns,
		pivotValueFields,
	});

	const pivoted =
		pivotActive &&
		pivotSheets(rawSheets, {
			indexColumn: pivotIndexColumn,
			columnField: pivotColumnField,
			pivotColumns: normalizePivotColumns(pivotColumns),
			valueFields: normalizePivotValueFields(pivotValueFields),
			extraColumns: normalizePivotExtraColumns(pivotExtraColumns, {
				indexColumn: pivotIndexColumn,
				columnField: pivotColumnField,
				pivotColumns,
				valueFields: pivotValueFields,
			}),
		});

	// pivotSheets returns null when config is incomplete or source rows are empty
	// (e.g. Firebase still loading). Fall back to raw sheets in that case.
	const sheets =
		(pivoted && typeof pivoted === 'object' ? pivoted : null) ||
		(rawSheets && typeof rawSheets === 'object' ? rawSheets : {}) ||
		{};

	const sheetNames = Object.keys(sheets);
	if (sheetNames.length === 0) {
		// Legacy flat json/csv fallback when sheets map is empty.
		if (dataSource === 'json') {
			return {
				columns: jsonTable?.columns || [],
				rows: jsonTable?.rows || [],
			};
		}
		return {
			columns: csvTable?.columns || [],
			rows: csvTable?.rows || [],
		};
	}

	const activeSheet =
		(defaultJsonSheet && sheets[defaultJsonSheet]
			? defaultJsonSheet
			: '') ||
		sheetNames[0] ||
		'';
	const sheet = sheets[activeSheet] || sheets[sheetNames[0]];
	return {
		columns: sheet?.columns || [],
		rows: sheet?.rows || [],
	};
}

/**
 * @param {Record<string, unknown>[]} rows   Table rows.
 * @param {string}                    column Column name.
 * @return {string[]} Sorted unique string values.
 */
export function sortedUniques(rows, column) {
	const set = new Set();
	for (const row of rows) {
		set.add(String(row[column] ?? ''));
	}
	return [...set].sort((a, b) =>
		a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
	);
}

/**
 * @param {Record<string, unknown>[]} rows    Table rows.
 * @param {string[]}                  columns Column names.
 * @return {{ label: string, value: string }[]} Select options (≤20 uniques, excludes row_id).
 */
export function getKeyColumnOptions(rows, columns) {
	const options = [];
	for (const col of columns) {
		if (col === 'row_id') {
			continue;
		}
		const n = sortedUniques(rows, col).length;
		if (n > 0 && n <= MAX_UNIQUE) {
			options.push({ label: `${col} (${n})`, value: col });
		}
	}
	return options;
}

/**
 * @param {string[]} uniques Unique cell values.
 * @return {Record<string, string>} Value → hex color.
 */
export function buildFreshColorMap(uniques) {
	/** @type {Record<string, string>} */
	const map = {};
	uniques.forEach((u, i) => {
		map[u] = DEFAULT_PALETTE[i % DEFAULT_PALETTE.length];
	});
	return map;
}
