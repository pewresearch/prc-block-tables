/**
 * CSV export helpers for data-table-controller downloads.
 */

export const UTF8_BOM = '\uFEFF';

/**
 * @param {unknown} val Cell value.
 * @return {string} String cell value.
 */
function cellToString(val) {
	return val === null || val === undefined ? '' : String(val);
}

/**
 * @param {string[]} columns Column keys.
 * @return {string[]} Columns without row_id.
 */
function stripRowId(columns) {
	return columns.filter((col) => col !== 'row_id');
}

/**
 * Apply column filters the same way the table render does.
 *
 * @param {Record<string, unknown>[]}                                                        rows          Row objects.
 * @param {Record<string, { value?: unknown, exclude?: boolean, match?: string }>|undefined} columnFilters Active filters.
 * @return {Record<string, unknown>[]} Filtered rows.
 */
export function applyColumnFilters(rows, columnFilters) {
	if (!Array.isArray(rows)) {
		return [];
	}
	if (!columnFilters) {
		return rows.slice();
	}

	let filtered = rows;
	for (const [col, filter] of Object.entries(columnFilters)) {
		if (!filter || filter.value === null || filter.value === undefined) {
			continue;
		}
		const matchVal = String(filter.value);
		filtered = filtered.filter((row) => {
			const cell = String(row[col] ?? '');
			const matches =
				filter.match === 'beginsWith'
					? cell.startsWith(matchVal)
					: cell === matchVal;
			return filter.exclude ? !matches : matches;
		});
	}
	return filtered;
}

/**
 * @param {Record<string, unknown>} row             Row object.
 * @param {string[]}                identityColumns Identity column keys.
 * @return {string} Composite join key.
 */
function compositeKey(row, identityColumns) {
	return identityColumns.map((col) => cellToString(row[col])).join('\0');
}

/**
 * Columns shared by every sheet whose values match at each aligned index.
 *
 * @param {Record<string, { columns: string[], rows: Record<string, unknown>[] }>} prepared   Filtered sheets.
 * @param {string[]}                                                               sheetNames Sheet keys in order.
 * @return {string[]} Identity column keys in first-sheet order.
 */
function findIdentityColumns(prepared, sheetNames) {
	const firstCols = prepared[sheetNames[0]].columns;
	const commonSet = new Set(firstCols);
	for (let i = 1; i < sheetNames.length; i += 1) {
		const cols = new Set(prepared[sheetNames[i]].columns);
		for (const col of [...commonSet]) {
			if (!cols.has(col)) {
				commonSet.delete(col);
			}
		}
	}

	const sameLength = sheetNames.every(
		(name) =>
			prepared[name].rows.length === prepared[sheetNames[0]].rows.length
	);

	const identity = [];
	for (const col of firstCols) {
		if (!commonSet.has(col)) {
			continue;
		}
		if (sameLength) {
			let matches = true;
			for (
				let rowIndex = 0;
				rowIndex < prepared[sheetNames[0]].rows.length;
				rowIndex += 1
			) {
				const ref = cellToString(
					prepared[sheetNames[0]].rows[rowIndex][col]
				);
				for (
					let sheetIndex = 1;
					sheetIndex < sheetNames.length;
					sheetIndex += 1
				) {
					const sheetName = sheetNames[sheetIndex];
					if (
						cellToString(
							prepared[sheetName].rows[rowIndex][col]
						) !== ref
					) {
						matches = false;
						break;
					}
				}
				if (!matches) {
					break;
				}
			}
			if (matches) {
				identity.push(col);
			}
		} else {
			identity.push(col);
		}
	}
	return identity;
}

/**
 * Value columns in first-sheet order, then leftovers from later sheets.
 *
 * @param {Record<string, { columns: string[], rows: Record<string, unknown>[] }>} prepared    Filtered sheets.
 * @param {string[]}                                                               sheetNames  Sheet keys in order.
 * @param {Set<string>}                                                            identitySet Identity columns.
 * @return {string[]} Unique value column keys.
 */
function collectValueColumns(prepared, sheetNames, identitySet) {
	const seen = new Set();
	const valueCols = [];

	const addFromSheet = (sheetName) => {
		for (const col of prepared[sheetName].columns) {
			if (identitySet.has(col)) {
				continue;
			}
			if (!seen.has(col)) {
				seen.add(col);
				valueCols.push(col);
			}
		}
	};

	addFromSheet(sheetNames[0]);
	for (let i = 1; i < sheetNames.length; i += 1) {
		addFromSheet(sheetNames[i]);
	}
	return valueCols;
}

/**
 * @param {Record<string, { columns: string[], rows: Record<string, unknown>[] }>} prepared        Filtered sheets.
 * @param {string[]}                                                               sheetNames      Sheet keys in order.
 * @param {string[]}                                                               identityColumns Identity columns.
 * @param {string[]}                                                               valueCols       Value column keys.
 * @return {string[]} Output CSV headers.
 */
function buildOutputColumns(prepared, sheetNames, identityColumns, valueCols) {
	const outputColumns = [...identityColumns];
	for (const col of valueCols) {
		for (const sheetName of sheetNames) {
			if (!prepared[sheetName].columns.includes(col)) {
				continue;
			}
			outputColumns.push(`${col} - ${sheetName}`);
		}
	}
	return outputColumns;
}

/**
 * @param {Record<string, { columns: string[], rows: Record<string, unknown>[] }>} prepared        Filtered sheets.
 * @param {string[]}                                                               sheetNames      Sheet keys in order.
 * @param {string[]}                                                               identityColumns Identity columns.
 * @param {string[]}                                                               valueCols       Value column keys.
 * @return {Record<string, string>[]} Output rows keyed by CSV headers.
 */
function mergeRowsByIndex(prepared, sheetNames, identityColumns, valueCols) {
	const rowCount = prepared[sheetNames[0]].rows.length;
	const rows = [];

	for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
		const row = {};
		for (const col of identityColumns) {
			row[col] = cellToString(
				prepared[sheetNames[0]].rows[rowIndex][col]
			);
		}
		for (const col of valueCols) {
			for (const sheetName of sheetNames) {
				if (!prepared[sheetName].columns.includes(col)) {
					continue;
				}
				const header = `${col} - ${sheetName}`;
				row[header] = cellToString(
					prepared[sheetName].rows[rowIndex][col]
				);
			}
		}
		rows.push(row);
	}

	return rows;
}

/**
 * @param {Record<string, { columns: string[], rows: Record<string, unknown>[] }>} prepared        Filtered sheets.
 * @param {string[]}                                                               sheetNames      Sheet keys in order.
 * @param {string[]}                                                               identityColumns Identity columns.
 * @param {string[]}                                                               valueCols       Value column keys.
 * @return {Record<string, string>[]} Output rows keyed by CSV headers.
 */
function mergeRowsByIdentityKey(
	prepared,
	sheetNames,
	identityColumns,
	valueCols
) {
	const maps = {};
	for (const sheetName of sheetNames) {
		maps[sheetName] = new Map();
		for (const row of prepared[sheetName].rows) {
			maps[sheetName].set(compositeKey(row, identityColumns), row);
		}
	}

	const orderedKeys = [];
	const seenKeys = new Set();
	for (const row of prepared[sheetNames[0]].rows) {
		const key = compositeKey(row, identityColumns);
		if (!seenKeys.has(key)) {
			seenKeys.add(key);
			orderedKeys.push(key);
		}
	}
	for (let i = 1; i < sheetNames.length; i += 1) {
		for (const row of prepared[sheetNames[i]].rows) {
			const key = compositeKey(row, identityColumns);
			if (!seenKeys.has(key)) {
				seenKeys.add(key);
				orderedKeys.push(key);
			}
		}
	}

	const rows = [];
	for (const key of orderedKeys) {
		const row = {};
		for (const col of identityColumns) {
			for (const sheetName of sheetNames) {
				const sourceRow = maps[sheetName].get(key);
				if (sourceRow) {
					row[col] = cellToString(sourceRow[col]);
					break;
				}
			}
			if (!(col in row)) {
				row[col] = '';
			}
		}
		for (const col of valueCols) {
			for (const sheetName of sheetNames) {
				if (!prepared[sheetName].columns.includes(col)) {
					continue;
				}
				const header = `${col} - ${sheetName}`;
				const sourceRow = maps[sheetName].get(key);
				row[header] = sourceRow ? cellToString(sourceRow[col]) : '';
			}
		}
		rows.push(row);
	}

	return rows;
}

/**
 * Merge all sheets into one CSV-ready table.
 *
 * @param {Record<string, { columns?: string[], rows?: Record<string, unknown>[] }>}                   sheets    Sheet map from interactivity state.
 * @param {{ columnFilters?: Record<string, { value?: unknown, exclude?: boolean, match?: string }> }} [options] Export options.
 * @return {{ columns: string[], rows: Record<string, string>[] }} Merged table.
 */
export function mergeSheetsForCsv(sheets, { columnFilters = {} } = {}) {
	const sheetNames = Object.keys(sheets || {});
	if (sheetNames.length === 0) {
		return { columns: [], rows: [] };
	}

	const prepared = {};
	for (const sheetName of sheetNames) {
		const sheet = sheets[sheetName] || {};
		prepared[sheetName] = {
			columns: stripRowId(
				Array.isArray(sheet.columns) ? sheet.columns : []
			),
			rows: applyColumnFilters(
				Array.isArray(sheet.rows) ? sheet.rows : [],
				columnFilters
			),
		};
	}

	const activeSheetNames = sheetNames.filter(
		(name) =>
			prepared[name].columns.length > 0 || prepared[name].rows.length > 0
	);
	if (activeSheetNames.length === 0) {
		return { columns: [], rows: [] };
	}

	if (activeSheetNames.length === 1) {
		const only = prepared[activeSheetNames[0]];
		return {
			columns: only.columns,
			rows: only.rows.map((row) => {
				const out = {};
				for (const col of only.columns) {
					out[col] = cellToString(row[col]);
				}
				return out;
			}),
		};
	}

	const identityColumns = findIdentityColumns(prepared, activeSheetNames);
	const identitySet = new Set(identityColumns);
	const valueCols = collectValueColumns(
		prepared,
		activeSheetNames,
		identitySet
	);
	const outputColumns = buildOutputColumns(
		prepared,
		activeSheetNames,
		identityColumns,
		valueCols
	);

	const sameLength = activeSheetNames.every(
		(name) =>
			prepared[name].rows.length ===
			prepared[activeSheetNames[0]].rows.length
	);
	const rows = sameLength
		? mergeRowsByIndex(
				prepared,
				activeSheetNames,
				identityColumns,
				valueCols
			)
		: mergeRowsByIdentityKey(
				prepared,
				activeSheetNames,
				identityColumns,
				valueCols
			);

	return { columns: outputColumns, rows };
}

/**
 * RFC 4180-encode one CSV field.
 *
 * @param {string} value Plain text field value.
 * @return {string} Encoded field.
 */
function encodeCsvField(value) {
	if (
		value.indexOf(',') > -1 ||
		value.indexOf('"') > -1 ||
		value.indexOf('\n') > -1 ||
		value.indexOf('\r') > -1
	) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}

/**
 * Convert merged table data to an RFC 4180 CSV string.
 *
 * @param {string[]}                 columns Header keys.
 * @param {Record<string, string>[]} rows    Row objects keyed by header.
 * @return {string} CSV body without BOM.
 */
export function tableToCsv(columns, rows) {
	if (!Array.isArray(columns) || columns.length === 0) {
		return '';
	}

	const lines = [columns.map((col) => encodeCsvField(col)).join(',')];
	for (const row of rows) {
		lines.push(
			columns
				.map((col) => encodeCsvField(cellToString(row[col])))
				.join(',')
		);
	}
	return `${lines.join('\n')}\n`;
}

/**
 * Trigger a browser download for CSV text.
 *
 * @param {string} filename Download filename.
 * @param {string} csvText  CSV body without BOM.
 */
export function downloadCsv(filename, csvText) {
	const blob = new Blob([UTF8_BOM, csvText], {
		type: 'text/csv;charset=utf-8',
	});
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.setAttribute('href', url);
	link.setAttribute('download', filename);
	link.click();
	URL.revokeObjectURL(url);
}

/**
 * Sanitize a string for use as a CSV filename stem.
 *
 * @param {string} raw Raw title or label.
 * @return {string} Non-empty slug safe for cross-platform filenames.
 */
export function sanitizeCsvFilename(raw) {
	if (typeof raw !== 'string' || !raw.trim()) {
		return 'data-table';
	}
	const slug = raw
		.toLowerCase()
		.replace(/\s+/g, '_')
		.replace(/[^\p{L}\p{N}\-_]/gu, '')
		.replace(/_+/g, '_')
		.replace(/^[\-_]+|[\-_]+$/g, '');
	return slug || 'data-table';
}
