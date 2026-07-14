export const MIN_COLUMN_WIDTH = 40;

/**
 * Computes the next column width in whole pixels from a drag delta.
 *
 * @param startWidth Starting column width in pixels.
 * @param startX     Pointer clientX at drag start.
 * @param clientX    Current pointer clientX.
 * @param minWidth   Minimum allowed width.
 * @return Clamped whole-pixel width.
 */
export function computeColumnWidthPx(
	startWidth: number,
	startX: number,
	clientX: number,
	minWidth: number = MIN_COLUMN_WIDTH
): number {
	return Math.max(minWidth, Math.round(startWidth + (clientX - startX)));
}

/**
 * Formats a live resize tooltip label.
 *
 * @param widthPx Width in pixels.
 * @return Label such as "142 px".
 */
export function formatColumnWidthLabel(widthPx: number): string {
	return `${widthPx} px`;
}
