/**
 * Mobile column order and cell-track helpers for data-table-render.
 */

export const MOBILE_BREAKPOINT = '(max-width: 781.98px)';
const MOBILE_CELL_TRACK_MAX = 4;

/**
 * @return {boolean} True when viewport is at or below the mobile table breakpoint.
 */
export function isMobileViewport() {
	return window.matchMedia(MOBILE_BREAKPOINT).matches;
}

/**
 * Merge saved column order with base columns (unknown keys dropped; missing appended).
 *
 * @param {string[]} baseCols   Desktop-ordered visible columns.
 * @param {string[]} savedOrder Preferred order keys.
 * @return {string[]} Effective column order.
 */
export function mergeColumnOrder(baseCols, savedOrder) {
	const saved = Array.isArray(savedOrder) ? savedOrder : [];
	const ordered = saved.filter((col) => baseCols.includes(col));
	const tail = baseCols.filter((col) => !ordered.includes(col));
	return [...ordered, ...tail];
}

/**
 * Resolve left-to-right column keys for the current viewport.
 *
 * @param {Object} tableState      Table instance state.
 * @param {Object} activeSheetData Active sheet data with desktop columns.
 * @return {string[]} Display column keys.
 */
export function resolveDisplayColumns(tableState, activeSheetData) {
	const baseCols = activeSheetData.columns
		? activeSheetData.columns.filter((col) => col !== 'row_id')
		: [];
	const mobileColumnSortMode = tableState.mobileColumnSortMode ?? 'inherit';
	const mobileColumnOrder = tableState.mobileColumnOrder ?? [];

	if (
		!isMobileViewport() ||
		mobileColumnSortMode === 'inherit' ||
		mobileColumnOrder.length === 0
	) {
		return baseCols;
	}

	return mergeColumnOrder(baseCols, mobileColumnOrder);
}

/**
 * Count visible mobile data cells for one sheet.
 *
 * @param {Object} tableState Table instance state.
 * @param {Object} sheetData  Sheet with a columns array.
 * @return {number} Visible cell count.
 */
function countMobileVisibleColumns(tableState, sheetData) {
	const mobileHiddenSet = new Set(
		Array.isArray(tableState.mobileHiddenColumns)
			? tableState.mobileHiddenColumns
			: []
	);
	return resolveDisplayColumns(tableState, sheetData).filter(
		(col) => !mobileHiddenSet.has(col)
	).length;
}

/**
 * Grid track count for mobile cells.
 *
 * Uses the widest sheet so a sheet with fewer columns (e.g. Percent without
 * Total) keeps the same cell width. Caps at four tracks per row.
 *
 * @param {Object} tableState Table instance state.
 * @return {number} Track count.
 */
export function resolveMobileCellTrackCount(tableState) {
	const sheets = tableState?.sheets;
	if (!sheets || typeof sheets !== 'object') {
		return MOBILE_CELL_TRACK_MAX;
	}

	let maxCols = 0;
	Object.values(sheets).forEach((sheetData) => {
		if (!sheetData || typeof sheetData !== 'object') {
			return;
		}
		maxCols = Math.max(
			maxCols,
			countMobileVisibleColumns(tableState, sheetData)
		);
	});

	if (maxCols < 1) {
		return MOBILE_CELL_TRACK_MAX;
	}
	return Math.min(MOBILE_CELL_TRACK_MAX, maxCols);
}
