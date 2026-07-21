/**
 * Internal dependencies
 */
import {
	getMaximumTableRows,
	getRemainingTableRows,
	isTableWithinLimits,
} from '../table-limits';

describe('table limits', () => {
	it('allows the requested 210 rows at common column counts', () => {
		expect(getMaximumTableRows(3)).toBe(500);
		expect(getMaximumTableRows(10)).toBe(500);
		expect(isTableWithinLimits(210, 10)).toBe(true);
	});

	it('reduces the row limit for wider tables', () => {
		expect(getMaximumTableRows(20)).toBe(250);
		expect(getMaximumTableRows(50)).toBe(100);
	});

	it('reports remaining capacity without going below zero', () => {
		expect(getRemainingTableRows(210, 10)).toBe(290);
		expect(getRemainingTableRows(500, 10)).toBe(0);
		expect(getRemainingTableRows(600, 3)).toBe(0);
	});

	it('rejects tables over either hard limit', () => {
		expect(isTableWithinLimits(501, 3)).toBe(false);
		expect(isTableWithinLimits(251, 20)).toBe(false);
		expect(isTableWithinLimits(500, 10)).toBe(true);
	});
});
