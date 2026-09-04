/**
 * Normalize provider context data into canonical sheets for editor preview.
 *
 * Mirrors server-side heuristics in Data_Table_Controller::normalize_context_data().
 * Custom adapters registered via the PHP filter hook have no JS equivalent.
 */

/**
 * @param {unknown} val Value to test.
 * @return {boolean} True when val is a plain object (not array/null).
 */
function isPlainObject(val) {
	return val !== null && typeof val === 'object' && !Array.isArray(val);
}

/**
 * @param {Object} table Raw single-table shape.
 * @return {{ columns: string[], rows: Record<string, unknown>[] }} Normalized single-table shape.
 */
function normalizeSingleTable(table) {
	const columns = Array.isArray(table?.columns)
		? table.columns.map(String)
		: [];
	const rows = Array.isArray(table?.rows) ? table.rows : [];
	return { columns, rows };
}

/**
 * Union column keys from row objects, preserving first-seen order.
 *
 * @param {Record<string, unknown>[]} rows Row objects.
 * @return {string[]} Column keys.
 */
export function deriveColumnsFromRows(rows) {
	const seen = new Set();
	const columns = [];
	for (const row of rows) {
		if (!row || typeof row !== 'object') {
			continue;
		}
		for (const key of Object.keys(row)) {
			if (!seen.has(key)) {
				seen.add(key);
				columns.push(key);
			}
		}
	}
	return columns;
}

/**
 * Unwrap a single RDB result row, extracting plain values from wrappers.
 *
 * @param {Record<string, unknown>} result Field map.
 * @return {Record<string, unknown>} Plain key => value pairs.
 */
function unwrapResultRow(result) {
	const row = {};
	for (const [key, cell] of Object.entries(result)) {
		let value =
			isPlainObject(cell) &&
			Object.prototype.hasOwnProperty.call(cell, 'value')
				? cell.value
				: cell;
		if (value !== null && typeof value === 'object') {
			value = JSON.stringify(value);
		}
		row[String(key)] = value;
	}
	return row;
}

/**
 * @param {unknown} val Cell value.
 * @return {string} Display-safe string.
 */
function cellToDisplayString(val) {
	if (val === null || val === undefined) {
		return '';
	}
	if (typeof val === 'object') {
		return JSON.stringify(val);
	}
	return String(val);
}

/**
 * Group RDB list results by their `sheet` field.
 *
 * @param {Array<{ result?: Record<string, unknown> }>} results Remote results.
 * @return {Record<string, { columns: string[], rows: Record<string, unknown>[] }>} Sheets grouped by sheet name.
 */
function groupRemoteResultsBySheet(results) {
	const groups = {};

	for (const item of results) {
		if (!item?.result || !isPlainObject(item.result)) {
			continue;
		}
		const row = unwrapResultRow(item.result);
		const sheetName = row.sheet ?? 'default';
		delete row.sheet;
		if (!groups[sheetName]) {
			groups[sheetName] = [];
		}
		groups[sheetName].push(row);
	}

	const sheets = {};
	for (const [sheetName, rows] of Object.entries(groups)) {
		const nonEmptyKeys = {};
		for (const row of rows) {
			for (const [key, value] of Object.entries(row)) {
				if (value !== '' && value !== null && value !== undefined) {
					nonEmptyKeys[key] = true;
				}
			}
		}
		const columns = Object.keys(nonEmptyKeys);
		const cleanRows = rows.map((row) => {
			const clean = {};
			for (const key of columns) {
				clean[key] = row[key] ?? '';
			}
			return clean;
		});
		sheets[sheetName] = { columns, rows: cleanRows };
	}

	return sheets;
}

/**
 * Normalize provider context data into canonical sheets for editor preview.
 *
 * @param {unknown} raw Raw context value from prc-block/dataTableData.
 * @return {Record<string, { columns: string[], rows: Record<string, unknown>[] }>} Sheets map.
 */
export function normalizeContextData(raw) {
	if (!raw || typeof raw !== 'object') {
		return {};
	}

	// Multi-sheet { sheets: {...} }.
	if (
		raw.sheets &&
		typeof raw.sheets === 'object' &&
		!Array.isArray(raw.sheets)
	) {
		const sheets = {};
		for (const [name, sheet] of Object.entries(raw.sheets)) {
			if (sheet && typeof sheet === 'object') {
				const normalized = normalizeSingleTable(sheet);
				if (normalized.columns.length || normalized.rows.length) {
					sheets[name] = normalized;
				}
			}
		}
		return sheets;
	}

	// Single { columns, rows }.
	if (Array.isArray(raw.columns) || Array.isArray(raw.rows)) {
		return { default: normalizeSingleTable(raw) };
	}

	// RDB-like { results: [...] }.
	if (Array.isArray(raw.results) && raw.results.length > 0) {
		return groupRemoteResultsBySheet(raw.results);
	}

	// Bare array-of-objects.
	if (Array.isArray(raw) && raw.length > 0 && isPlainObject(raw[0])) {
		const columns = deriveColumnsFromRows(raw);
		const rows = raw.map((row) => {
			const out = {};
			for (const col of columns) {
				out[col] = cellToDisplayString(row[col]);
			}
			return out;
		});
		return { default: { columns, rows } };
	}

	return {};
}

/**
 * Union column names across normalized context sheets.
 *
 * @param {Record<string, { columns?: string[] }>} sheets Sheet map.
 * @return {string[]} Unique column names.
 */
export function unionContextSheetColumns(sheets) {
	const columnSet = new Set();
	for (const sheet of Object.values(sheets || {})) {
		if (Array.isArray(sheet?.columns)) {
			for (const col of sheet.columns) {
				columnSet.add(col);
			}
		}
	}
	return [...columnSet];
}
