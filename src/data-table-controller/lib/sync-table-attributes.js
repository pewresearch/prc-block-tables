/**
 * Internal dependencies
 */
import { unionSheetColumns } from './utils';
import { normalizeContextData, unionContextSheetColumns } from './context-data';
import { normalizeRowDropdownColumnsBySheet } from './edit-utils';

/**
 * Backfill jsonColumns for posts saved before that attribute existed.
 * Skipped while pivot is active — pivoted columns are synced separately.
 *
 * @param {Object}  params
 * @param {boolean} params.pivotActive
 * @param {string}  params.dataSource
 * @param {Object}  params.jsonTable
 * @param {unknown} params.jsonColumns
 * @param {boolean} params.contextLike
 * @param {unknown} params.resolvedContextData
 * @return {string[]|null} Columns to write, or null when no backfill is needed.
 */
export function getJsonColumnsBackfill({
	pivotActive,
	dataSource,
	jsonTable,
	jsonColumns,
	contextLike,
	resolvedContextData,
}) {
	if (pivotActive) {
		return null;
	}

	if (dataSource === 'json') {
		if (
			jsonTable?.sheets &&
			(!Array.isArray(jsonColumns) || jsonColumns.length === 0)
		) {
			const cols = unionSheetColumns(jsonTable.sheets);
			return cols.length > 0 ? cols : null;
		}

		if (
			Array.isArray(jsonTable?.columns) &&
			jsonTable.columns.length > 0 &&
			(!Array.isArray(jsonColumns) || jsonColumns.length === 0)
		) {
			return jsonTable.columns;
		}

		return null;
	}

	if (!contextLike) {
		return null;
	}

	const sheets = normalizeContextData(resolvedContextData);
	const cols = unionContextSheetColumns(sheets);
	if (
		cols.length > 0 &&
		(!Array.isArray(jsonColumns) || jsonColumns.length === 0)
	) {
		return cols;
	}

	return null;
}

/**
 * Drop unknown sheet keys and column names from hiddenColumnsBySheet.
 * Empty jsonColumns / sheetNames are not authoritative (data still loading).
 *
 * @param {unknown} jsonColumns          Known column keys.
 * @param {unknown} sheetNames           Known sheet keys.
 * @param {unknown} hiddenColumnsBySheet Raw per-sheet hidden lists.
 * @return {{ next: Record<string, string[]>, changed: boolean }} Pruned map and whether it changed.
 */
export function pruneHiddenColumnsBySheet(
	jsonColumns,
	sheetNames,
	hiddenColumnsBySheet
) {
	if (!Array.isArray(sheetNames) || sheetNames.length === 0) {
		return { next: hiddenColumnsBySheet, changed: false };
	}
	if (!Array.isArray(jsonColumns) || jsonColumns.length === 0) {
		return { next: hiddenColumnsBySheet, changed: false };
	}

	const cols = new Set(jsonColumns);
	const names = new Set(sheetNames);
	const bySheet =
		hiddenColumnsBySheet &&
		typeof hiddenColumnsBySheet === 'object' &&
		!Array.isArray(hiddenColumnsBySheet)
			? hiddenColumnsBySheet
			: {};
	let changed = false;
	const next = {};

	Object.entries(bySheet).forEach(([sheet, hidden]) => {
		if (!names.has(sheet)) {
			changed = true;
			return;
		}
		const pruned = (Array.isArray(hidden) ? hidden : []).filter((col) =>
			cols.has(col)
		);
		if (pruned.length !== (Array.isArray(hidden) ? hidden.length : 0)) {
			changed = true;
		}
		if (pruned.length > 0) {
			next[sheet] = pruned;
		} else if (Array.isArray(hidden) && hidden.length > 0) {
			changed = true;
		}
	});

	return { next, changed };
}

/**
 * Drop unknown keys from a column-name list.
 *
 * @param {unknown}     list  Column-name list.
 * @param {Set<string>} known Allowed column keys.
 * @return {{ next: string[], changed: boolean }} Pruned list and whether it changed.
 */
export function pruneKnownColumnList(list, known) {
	if (!Array.isArray(list) || list.length === 0) {
		return { next: list, changed: false };
	}
	const pruned = list.filter((col) => known.has(col));
	return {
		next: pruned,
		changed: pruned.length !== list.length,
	};
}

/**
 * Drop unknown keys from a column-keyed object (e.g. mobile header labels).
 *
 * @param {unknown}     map   Column-keyed object.
 * @param {Set<string>} known Allowed column keys.
 * @return {{ next: Record<string, unknown>, changed: boolean }} Pruned object and whether it changed.
 */
export function pruneColumnKeyedObject(map, known) {
	if (!map || typeof map !== 'object' || Object.keys(map).length === 0) {
		return { next: map, changed: false };
	}
	const pruned = {};
	let changed = false;
	Object.entries(map).forEach(([col, value]) => {
		if (known.has(col)) {
			pruned[col] = value;
		} else {
			changed = true;
		}
	});
	return { next: pruned, changed };
}

/**
 * Whether defaultSortColumn is hidden or sorting is off.
 *
 * @param {string}   defaultSortColumn          Current default sort column.
 * @param {boolean}  enableColumnSorting        Whether column sorting is on.
 * @param {string[]} defaultSheetVisibleColumns Visible columns on the default sheet.
 * @return {boolean} True when the default sort column should be cleared.
 */
export function shouldClearDefaultSortColumn(
	defaultSortColumn,
	enableColumnSorting,
	defaultSheetVisibleColumns
) {
	if (!defaultSortColumn) {
		return false;
	}
	return (
		!enableColumnSorting ||
		!defaultSheetVisibleColumns.includes(defaultSortColumn)
	);
}

/**
 * Default dropdown columns to all table columns except the identity column.
 *
 * @param {Object}   params
 * @param {boolean}  params.enableRowDropdowns
 * @param {string[]} params.allTableColumns
 * @param {string[]} params.rowDropdownColumnList
 * @param {string}   params.rowDropdownIdentityColumn
 * @return {string[]|null} Default column keys, or null when no write is needed.
 */
export function getDefaultRowDropdownColumns({
	enableRowDropdowns,
	allTableColumns,
	rowDropdownColumnList,
	rowDropdownIdentityColumn,
}) {
	if (!enableRowDropdowns || allTableColumns.length === 0) {
		return null;
	}
	if (rowDropdownColumnList.length > 0) {
		return null;
	}
	const initial = allTableColumns.filter(
		(col) => col !== rowDropdownIdentityColumn
	);
	return initial.length > 0 ? initial : null;
}

/**
 * Keep the identity column out of dropdown column selection.
 *
 * @param {Object}   params
 * @param {string}   params.rowDropdownIdentityColumn
 * @param {string[]} params.rowDropdownColumnList
 * @param {unknown}  params.rowDropdownColumnsBySheet
 * @return {{ rowDropdownColumns: string[], rowDropdownColumnsBySheet: Object }|null} Attribute patch, or null when unchanged.
 */
export function excludeIdentityFromRowDropdowns({
	rowDropdownIdentityColumn,
	rowDropdownColumnList,
	rowDropdownColumnsBySheet,
}) {
	if (!rowDropdownIdentityColumn) {
		return null;
	}

	const bySheet = normalizeRowDropdownColumnsBySheet(
		rowDropdownColumnsBySheet
	);
	let changed = false;
	let nextGlobal = rowDropdownColumnList;
	const nextBySheet = { ...bySheet };

	if (rowDropdownColumnList.includes(rowDropdownIdentityColumn)) {
		nextGlobal = rowDropdownColumnList.filter(
			(col) => col !== rowDropdownIdentityColumn
		);
		changed = true;
	}

	Object.entries(bySheet).forEach(([sheet, columns]) => {
		if (
			!Array.isArray(columns) ||
			!columns.includes(rowDropdownIdentityColumn)
		) {
			return;
		}
		nextBySheet[sheet] = columns.filter(
			(col) => col !== rowDropdownIdentityColumn
		);
		changed = true;
	});

	if (!changed) {
		return null;
	}

	return {
		rowDropdownColumns: nextGlobal,
		rowDropdownColumnsBySheet: nextBySheet,
	};
}

/**
 * Migrate per-column columnValueFormats to global prefix/suffix + exclusions.
 *
 * @param {Object}   params
 * @param {unknown}  params.columnValueFormats
 * @param {string}   params.valuePrefix
 * @param {string}   params.valueSuffix
 * @param {string[]} params.formatableColumns
 * @return {Object|null} Attribute patch, or null when no migration is needed.
 */
export function migrateColumnValueFormats({
	columnValueFormats,
	valuePrefix,
	valueSuffix,
	formatableColumns,
}) {
	if (
		!columnValueFormats ||
		typeof columnValueFormats !== 'object' ||
		Array.isArray(columnValueFormats) ||
		Object.keys(columnValueFormats).length === 0
	) {
		return null;
	}
	if (valuePrefix || valueSuffix) {
		return null;
	}
	const entries = Object.entries(columnValueFormats);
	const firstFormat =
		entries[0][1] && typeof entries[0][1] === 'object' ? entries[0][1] : {};
	const prefix = firstFormat.prefix ?? '';
	const suffix = firstFormat.suffix ?? '';
	const excluded = new Set();
	entries.forEach(([col, fmt]) => {
		const row = fmt && typeof fmt === 'object' ? fmt : {};
		if (row.prefix !== prefix || row.suffix !== suffix) {
			excluded.add(col);
		}
	});
	formatableColumns.forEach((col) => {
		if (!columnValueFormats[col]) {
			excluded.add(col);
		}
	});
	return {
		valuePrefix: prefix,
		valueSuffix: suffix,
		valueFormatExcludedColumns: [...excluded],
		columnValueFormats: {},
	};
}

/**
 * Migrate legacy mobile abbrev rules into shared valueAbbreviationRules.
 *
 * @param {Object}  params
 * @param {unknown} params.mobileValueFormatRules
 * @param {unknown} params.valueAbbreviationRules
 * @return {Object|null} Attribute patch, or null when no migration is needed.
 */
export function migrateMobileAbbrevRules({
	mobileValueFormatRules,
	valueAbbreviationRules,
}) {
	const mobileRules = Array.isArray(mobileValueFormatRules)
		? mobileValueFormatRules
		: [];
	const legacyAbbrevRules = mobileRules.filter(
		(rule) => rule && rule.type === 'abbrev'
	);
	if (legacyAbbrevRules.length === 0) {
		return null;
	}
	const sharedRules = Array.isArray(valueAbbreviationRules)
		? valueAbbreviationRules
		: [];
	const nextMobile = mobileRules.filter(
		(rule) => !rule || rule.type !== 'abbrev'
	);
	if (sharedRules.length > 0) {
		return { mobileValueFormatRules: nextMobile };
	}
	return {
		valueAbbreviationRules: legacyAbbrevRules,
		mobileValueFormatRules: nextMobile,
	};
}
