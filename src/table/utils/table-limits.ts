/**
 * Internal dependencies
 */
import { MAX_TABLE_CELLS, MAX_TABLE_ROWS } from '../constants';

/**
 * Return the maximum total row count for a table of the given width.
 *
 * The result enforces both the absolute row limit and the total-cell limit.
 *
 * @param columnCount Number of virtual columns in the table.
 */
export function getMaximumTableRows(columnCount: number): number {
	if (!Number.isFinite(columnCount) || columnCount < 1) {
		return 0;
	}

	return Math.min(MAX_TABLE_ROWS, Math.floor(MAX_TABLE_CELLS / columnCount));
}

/**
 * Return how many rows can still be added to a table.
 *
 * @param rowCount    Current total rows across head, body, and foot.
 * @param columnCount Current virtual column count.
 */
export function getRemainingTableRows(
	rowCount: number,
	columnCount: number
): number {
	return Math.max(0, getMaximumTableRows(columnCount) - rowCount);
}

/**
 * Check whether a table's rectangular dimensions fit the editor limits.
 *
 * @param rowCount    Total rows across head, body, and foot.
 * @param columnCount Virtual column count.
 */
export function isTableWithinLimits(
	rowCount: number,
	columnCount: number
): boolean {
	return (
		rowCount >= 1 &&
		columnCount >= 1 &&
		rowCount <= getMaximumTableRows(columnCount)
	);
}
