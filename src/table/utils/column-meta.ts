/**
 * Resolves the effective ColumnMeta for a given virtual column index.
 *
 * When a table has been migrated to the unified `columnMeta` array, the entry
 * at the given index is returned directly (defaulting to `{ dataType: 'auto' }`
 * when the array is shorter than the column count).
 *
 * For tables that still carry the legacy parallel arrays
 * (`hiddenColumns`, `sortableColumns`, `columnRoundDecimals`) but have an
 * absent or empty `columnMeta`, this function synthesises an equivalent
 * ColumnMeta object so all consumers can use a single code path.
 */

import type { ColumnMeta, BlockAttributes } from '../block-attributes';

export const DEFAULT_COLUMN_META: ColumnMeta = { dataType: 'auto' };

/**
 * Returns the effective ColumnMeta for `colIndex`, falling back to the legacy
 * parallel arrays when `columnMeta` is absent or has no entry for that index.
 * @param colIndex
 * @param attributes
 */
export function getEffectiveColumnMeta(
	colIndex: number,
	attributes: Pick<
		BlockAttributes,
		| 'columnMeta'
		| 'hiddenColumns'
		| 'sortableColumns'
		| 'columnRoundDecimals'
	>
): ColumnMeta {
	const {
		columnMeta = [],
		hiddenColumns = [],
		sortableColumns = [],
		columnRoundDecimals = [],
	} = attributes;

	// If columnMeta has a populated entry for this index, use it.
	if (
		columnMeta.length > colIndex &&
		columnMeta[colIndex] !== null &&
		columnMeta[colIndex] !== undefined
	) {
		return columnMeta[colIndex];
	}

	// Fall back: synthesise from legacy parallel arrays.
	const roundDecimals = columnRoundDecimals[colIndex] ?? null;
	const hidden = hiddenColumns.includes(colIndex);
	const sortable =
		sortableColumns.length === 0 || sortableColumns.includes(colIndex);

	const meta: ColumnMeta = { dataType: 'auto' };
	if (hidden) meta.hidden = true;
	if (!sortable) meta.sortable = false;
	if (roundDecimals !== null) meta.roundDecimals = roundDecimals;

	return meta;
}

/**
 * Returns true if any entry in the array has non-default values, meaning
 * column metadata would be lost on a destructive operation like transpose.
 * @param columnMeta
 */
export function hasActiveColumnMeta(columnMeta: ColumnMeta[]): boolean {
	return columnMeta.some(
		(m) =>
			m !== null &&
			m !== undefined &&
			(m.dataType !== 'auto' ||
				m.hidden === true ||
				m.sortable === true ||
				(m.roundDecimals !== null && m.roundDecimals !== undefined) ||
				(typeof m.width === 'string' && m.width.length > 0))
	);
}

/**
 * Writes a single field on the ColumnMeta entry at `colIndex`, returning a
 * new `columnMeta` array suitable for `setAttributes`.  Existing entries at
 * other indices are preserved; missing entries between the current length and
 * `colIndex` are filled with DEFAULT_COLUMN_META.
 * @param colIndex
 * @param field
 * @param value
 * @param current
 */
export function setColumnMetaField<K extends keyof ColumnMeta>(
	colIndex: number,
	field: K,
	value: ColumnMeta[K],
	current: ColumnMeta[]
): ColumnMeta[] {
	const next = [...current];
	while (next.length <= colIndex) {
		next.push({ ...DEFAULT_COLUMN_META });
	}
	next[colIndex] = { ...next[colIndex], [field]: value };
	return next;
}

/**
 * Inserts a default ColumnMeta entry at `index`, shifting later entries right.
 * No-op when `current` is empty (callers that only set meta on demand stay empty).
 * @param current
 * @param index
 */
export function insertColumnMeta(
	current: ColumnMeta[],
	index: number
): ColumnMeta[] {
	if (!current.length) {
		return current;
	}
	const next = [...current];
	while (next.length < index) {
		next.push({ ...DEFAULT_COLUMN_META });
	}
	next.splice(index, 0, { ...DEFAULT_COLUMN_META });
	return next;
}

/**
 * Removes the ColumnMeta entry at `index`.
 * @param current
 * @param index
 */
export function deleteColumnMeta(
	current: ColumnMeta[],
	index: number
): ColumnMeta[] {
	if (!current.length || index < 0 || index >= current.length) {
		return current;
	}
	return current.filter((_, i) => i !== index);
}

/**
 * Moves (swaps adjacent or relocates) the ColumnMeta entry from `from` to `to`.
 * Only adjacent moves are used by the UI today.
 * @param current
 * @param from
 * @param to
 */
export function moveColumnMeta(
	current: ColumnMeta[],
	from: number,
	to: number
): ColumnMeta[] {
	if (!current.length || from === to || from < 0 || to < 0) {
		return current;
	}
	const maxIndex = Math.max(from, to);
	const next = [...current];
	while (next.length <= maxIndex) {
		next.push({ ...DEFAULT_COLUMN_META });
	}
	const [removed] = next.splice(from, 1);
	next.splice(to, 0, removed);
	return next;
}
