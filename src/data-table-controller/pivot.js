/**
 * Pivot / reshape long-format sheets into wide sheets for the data table controller.
 */

/**
 * Flatten all rows from a sheets map into a single list.
 *
 * @param {Record<string, { rows?: Record<string, unknown>[] }>} sheets Sheets map.
 * @return {Record<string, unknown>[]} All rows.
 */
function flattenSheetRows(sheets) {
	const rows = [];
	for (const sheet of Object.values(sheets || {})) {
		if (!Array.isArray(sheet?.rows)) {
			continue;
		}
		for (const row of sheet.rows) {
			if (row && typeof row === 'object') {
				rows.push(row);
			}
		}
	}
	return rows;
}

/**
 * Collect distinct values of a field across all sheets, preserving first-seen order.
 *
 * @param {Record<string, { rows?: Record<string, unknown>[] }>} sheets Sheets map.
 * @param {string}                                               field  Field key.
 * @return {string[]} Distinct field values.
 */
export function getDistinctValues(sheets, field) {
	if (!field) {
		return [];
	}
	const seen = new Set();
	const values = [];
	for (const row of flattenSheetRows(sheets)) {
		const raw = row[field];
		if (raw === null || raw === undefined || raw === '') {
			continue;
		}
		const value = String(raw);
		if (!seen.has(value)) {
			seen.add(value);
			values.push(value);
		}
	}
	return values;
}

/**
 * Normalize pivotColumns attribute entries to { value, label }.
 *
 * @param {unknown} pivotColumns Raw attribute.
 * @return {{ value: string, label: string }[]} Normalized entries.
 */
export function normalizePivotColumns(pivotColumns) {
	if (!Array.isArray(pivotColumns)) {
		return [];
	}
	return pivotColumns
		.map((entry) => {
			if (typeof entry === 'string') {
				return { value: entry, label: entry };
			}
			if (!entry || typeof entry !== 'object') {
				return null;
			}
			const value = String(entry.value ?? '');
			if (!value) {
				return null;
			}
			const label =
				entry.label !== undefined && entry.label !== null
					? String(entry.label)
					: value;
			return { value, label: label || value };
		})
		.filter(Boolean);
}

/**
 * Normalize pivotValueFields attribute entries to { field, label }.
 *
 * @param {unknown} valueFields Raw attribute.
 * @return {{ field: string, label: string }[]} Normalized entries.
 */
export function normalizePivotValueFields(valueFields) {
	if (!Array.isArray(valueFields)) {
		return [];
	}
	return valueFields
		.map((entry) => {
			if (typeof entry === 'string') {
				return { field: entry, label: entry };
			}
			if (!entry || typeof entry !== 'object') {
				return null;
			}
			const field = String(entry.field ?? '');
			if (!field) {
				return null;
			}
			const label =
				entry.label !== undefined && entry.label !== null
					? String(entry.label)
					: field;
			return { field, label: label || field };
		})
		.filter(Boolean);
}

/**
 * Build a composite row key from the identity value and group-by extras.
 *
 * @param {string}               indexValue Identity column value.
 * @param {Record<string, unknown>} source  Source row.
 * @param {string[]}             extras    Group-by field names.
 * @return {string} Composite key.
 */
function buildPivotRowKey(indexValue, source, extras) {
	return [
		indexValue,
		...extras.map((extra) => String(source[extra] ?? '')),
	].join('\0');
}

/**
 * Normalize pivotExtraColumns: unique group-by field names for composite row keys.
 *
 * @param {unknown}                                    extraColumns         Raw attribute.
 * @param {Object}                                     context              Pivot context.
 * @param {string}                                     context.indexColumn  Row identity field.
 * @param {string}                                     context.columnField  Field whose values become columns.
 * @param {{ value: string, label: string }[]|unknown} context.pivotColumns Selected pivot columns.
 * @param {{ field: string, label: string }[]|unknown} context.valueFields  Value fields (excluded from group-by).
 * @return {string[]} Normalized group-by column keys.
 */
export function normalizePivotExtraColumns(
	extraColumns,
	{ indexColumn, columnField, pivotColumns, valueFields }
) {
	if (!Array.isArray(extraColumns)) {
		return [];
	}
	const pivotLabels = new Set(
		normalizePivotColumns(pivotColumns).map((col) => col.label)
	);
	const valueFieldNames = new Set(
		normalizePivotValueFields(valueFields).map((entry) => entry.field)
	);
	const seen = new Set();
	const normalized = [];
	for (const raw of extraColumns) {
		const col = String(raw ?? '');
		if (!col || seen.has(col)) {
			continue;
		}
		if (col === indexColumn || col === columnField) {
			continue;
		}
		if (pivotLabels.has(col)) {
			continue;
		}
		if (valueFieldNames.has(col)) {
			continue;
		}
		seen.add(col);
		normalized.push(col);
	}
	return normalized;
}

/**
 * Whether pivot attributes are complete enough to reshape data.
 *
 * @param {Object}                             attrs                  Pivot attributes.
 * @param {boolean}                            attrs.pivotEnabled
 * @param {string}                             attrs.pivotIndexColumn
 * @param {string}                             attrs.pivotColumnField
 * @param {{ value: string, label: string }[]} attrs.pivotColumns
 * @param {{ field: string, label: string }[]} attrs.pivotValueFields
 * @return {boolean} True when pivot can run.
 */
export function isPivotConfigured({
	pivotEnabled,
	pivotIndexColumn,
	pivotColumnField,
	pivotColumns,
	pivotValueFields,
}) {
	return (
		!!pivotEnabled &&
		!!pivotIndexColumn &&
		!!pivotColumnField &&
		normalizePivotColumns(pivotColumns).length > 0 &&
		normalizePivotValueFields(pivotValueFields).length > 0
	);
}

/**
 * Pivot long-format sheets into one wide sheet per value field.
 *
 * Rows are keyed by identity plus group-by extras (composite key). Duplicate
 * (composite key + column-value) pairs keep the first matching source row.
 * Columns are `[indexColumn, ...extraColumns, ...pivotColumns.map(label)]`.
 * Sheet keys are the value-field labels (falling back to the field name).
 *
 * @param {Record<string, { columns?: string[], rows?: Record<string, unknown>[] }>} sheets              Source sheets.
 * @param {Object}                                                                   config              Pivot config.
 * @param {string}                                                                   config.indexColumn  Row identity field.
 * @param {string}                                                                   config.columnField  Field whose values become columns.
 * @param {{ value: string, label: string }[]|unknown}                               config.pivotColumns Selected column values + labels.
 * @param {{ field: string, label: string }[]|unknown}                               config.valueFields  Value fields (each becomes a sheet).
 * @param {string[]|unknown}                                                         config.extraColumns Group-by fields that expand the row key.
 * @return {Record<string, { columns: string[], rows: Record<string, unknown>[] }>|null} Pivoted sheets, or null when not configurable.
 */
export function pivotSheets(
	sheets,
	{ indexColumn, columnField, pivotColumns, valueFields, extraColumns }
) {
	const columns = normalizePivotColumns(pivotColumns);
	const values = normalizePivotValueFields(valueFields);

	if (
		!indexColumn ||
		!columnField ||
		columns.length === 0 ||
		values.length === 0
	) {
		return null;
	}

	const sourceRows = flattenSheetRows(sheets);
	if (sourceRows.length === 0) {
		return null;
	}

	const extras = normalizePivotExtraColumns(extraColumns, {
		indexColumn,
		columnField,
		pivotColumns,
		valueFields,
	});

	const wideColumns = [
		indexColumn,
		...extras,
		...columns.map((col) => col.label),
	];
	const result = {};
	const usedSheetKeys = new Set();

	for (const { field, label } of values) {
		let sheetKey = label || field;
		if (usedSheetKeys.has(sheetKey)) {
			let suffix = 2;
			while (usedSheetKeys.has(`${sheetKey} (${suffix})`)) {
				suffix += 1;
			}
			sheetKey = `${sheetKey} (${suffix})`;
		}
		usedSheetKeys.add(sheetKey);

		/** @type {Map<string, Record<string, unknown>>} */
		const indexRows = new Map();

		for (const source of sourceRows) {
			const indexRaw = source[indexColumn];
			if (
				indexRaw === null ||
				indexRaw === undefined ||
				indexRaw === ''
			) {
				continue;
			}
			const indexValue = String(indexRaw);
			const colRaw = source[columnField];
			if (colRaw === null || colRaw === undefined || colRaw === '') {
				continue;
			}
			const colValue = String(colRaw);
			const matched = columns.find((col) => col.value === colValue);
			if (!matched) {
				continue;
			}

			const rowKey = buildPivotRowKey(indexValue, source, extras);
			let wide = indexRows.get(rowKey);
			if (!wide) {
				wide = { [indexColumn]: indexValue };
				for (const extra of extras) {
					const extraVal = source[extra];
					wide[extra] =
						extraVal === null || extraVal === undefined
							? ''
							: extraVal;
				}
				for (const col of columns) {
					wide[col.label] = '';
				}
				indexRows.set(rowKey, wide);
			}

			// First match wins for duplicate (composite key + column-value) pairs.
			if (
				wide[matched.label] === '' ||
				wide[matched.label] === undefined
			) {
				const cell = source[field];
				wide[matched.label] =
					cell === null || cell === undefined ? '' : cell;
			}
		}

		result[sheetKey] = {
			columns: [...wideColumns],
			rows: [...indexRows.values()],
		};
	}

	return result;
}
