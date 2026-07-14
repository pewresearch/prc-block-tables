/**
 * Internal dependencies
 */
import {
	MIN_COLUMN_WIDTH,
	computeColumnWidthPx,
	formatColumnWidthLabel,
} from '../column-resize';

describe('column-resize', () => {
	describe('computeColumnWidthPx', () => {
		it('should increase width when dragging right', () => {
			expect(computeColumnWidthPx(100, 200, 240)).toBe(140);
		});

		it('should decrease width when dragging left', () => {
			expect(computeColumnWidthPx(100, 200, 170)).toBe(70);
		});

		it('should clamp to the minimum width', () => {
			expect(computeColumnWidthPx(50, 100, 0)).toBe(MIN_COLUMN_WIDTH);
		});

		it('should round to whole pixels', () => {
			expect(computeColumnWidthPx(100, 0, 10.4)).toBe(110);
			expect(computeColumnWidthPx(100, 0, 10.6)).toBe(111);
		});

		it('should honor a custom minimum', () => {
			expect(computeColumnWidthPx(80, 100, 50, 60)).toBe(60);
		});
	});

	describe('formatColumnWidthLabel', () => {
		it('should format whole-pixel widths for the tooltip', () => {
			expect(formatColumnWidthLabel(142)).toBe('142 px');
			expect(formatColumnWidthLabel(40)).toBe('40 px');
		});
	});
});
