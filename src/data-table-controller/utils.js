/**
 * Minimal RFC-style CSV parser (quoted fields, comma delimiter).
 *
 * @param {string} text Raw CSV text.
 * @return {{ columns: string[], rows: Record<string, string>[] }} Header names and row objects.
 */
export function parseCsvToTable(text) {
	const lines = text
		.trim()
		.split(/\r?\n/)
		.filter((line) => line.length > 0);
	if (!lines.length) {
		return { columns: [], rows: [] };
	}

	const splitLine = (line) => {
		const out = [];
		let cur = '';
		let inQuotes = false;
		for (let i = 0; i < line.length; i += 1) {
			const c = line[i];
			if (c === '"') {
				inQuotes = !inQuotes;
			} else if (c === ',' && !inQuotes) {
				out.push(cur.trim());
				cur = '';
			} else {
				cur += c;
			}
		}
		out.push(cur.trim());
		return out.map((cell) => cell.replace(/^"|"$/g, ''));
	};

	const columns = splitLine(lines[0]);
	const rows = [];
	for (let i = 1; i < lines.length; i += 1) {
		const cells = splitLine(lines[i]);
		const row = {};
		columns.forEach((col, j) => {
			row[col] = cells[j] ?? '';
		});
		rows.push(row);
	}
	return { columns, rows };
}

/**
 * @param {unknown} val Value to test.
 * @return {boolean} True when val is a plain object (not array/null).
 */
function isPlainObject(val) {
	return val !== null && typeof val === 'object' && !Array.isArray(val);
}

/**
 * @param {unknown} val Cell value.
 * @return {string} String cell value.
 */
function cellToString(val) {
	return val === null || val === undefined ? '' : String(val);
}

/**
 * Union column names across all sheets in a multi-sheet jsonTable.
 *
 * @param {Record<string, { columns?: string[] }>} sheets Sheet map.
 * @return {string[]} Unique column names.
 */
export function unionSheetColumns(sheets) {
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

/**
 * Parse a JSON string (array of objects) into a table structure.
 *
 * When rows contain nested plain-object groups (e.g. Percents / Counts),
 * returns one sheet per group key. Otherwise returns a flat columns/rows shape.
 *
 * @param {string} text Raw JSON text.
 * @return {{ columns: string[], rows: Record<string, string>[] }|{ sheets: Record<string, { columns: string[], rows: Record<string, string>[] }>, defaultSheet: string }} Parsed table data.
 */
export function parseJsonToTable(text) {
	let data;
	try {
		data = JSON.parse(text);
	} catch {
		return { columns: [], rows: [] };
	}

	if (!Array.isArray(data) || data.length === 0) {
		return { columns: [], rows: [] };
	}

	const rows = data.filter(
		(item) => item && typeof item === 'object' && !Array.isArray(item)
	);

	if (!rows.length) {
		return { columns: [], rows: [] };
	}

	const scalarKeyOrder = [];
	const scalarKeySet = new Set();
	const groupKeys = [];
	const groupKeySet = new Set();
	const groupChildKeys = {};

	for (const item of rows) {
		for (const [key, val] of Object.entries(item)) {
			if (isPlainObject(val)) {
				if (!groupKeySet.has(key)) {
					groupKeySet.add(key);
					groupKeys.push(key);
					groupChildKeys[key] = new Set();
				}
				for (const childKey of Object.keys(val)) {
					groupChildKeys[key].add(childKey);
				}
			} else if (!scalarKeySet.has(key)) {
				scalarKeySet.add(key);
				scalarKeyOrder.push(key);
			}
		}
	}

	if (groupKeys.length === 0) {
		const columnSet = new Set();
		for (const item of rows) {
			for (const key of Object.keys(item)) {
				columnSet.add(key);
			}
		}
		const columns = [...columnSet];
		const flatRows = rows.map((item) => {
			const row = {};
			for (const col of columns) {
				row[col] = cellToString(item[col]);
			}
			return row;
		});
		return { columns, rows: flatRows };
	}

	const sheets = {};
	for (const groupName of groupKeys) {
		const childColumns = [...groupChildKeys[groupName]];
		const columns = [...scalarKeyOrder, ...childColumns];
		const sheetRows = rows.map((item) => {
			const row = {};
			for (const scalarKey of scalarKeyOrder) {
				row[scalarKey] = cellToString(item[scalarKey]);
			}
			const group = item[groupName];
			for (const childKey of childColumns) {
				const val = isPlainObject(group) ? group[childKey] : undefined;
				row[childKey] = cellToString(val);
			}
			return row;
		});
		sheets[groupName] = { columns, rows: sheetRows };
	}

	return {
		sheets,
		defaultSheet: groupKeys[0] || '',
	};
}
