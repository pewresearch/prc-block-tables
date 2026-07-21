/**
 * Internal dependencies
 */
import { describe, expect, it, jest } from '@jest/globals';

import { parseCSV } from '../../csv-parser';

describe('parseCSV table limits', () => {
	it('rejects a CSV that exceeds 5,000 cells', () => {
		const row = Array.from({ length: 20 }, () => 'value').join(',');
		const csv = Array.from({ length: 252 }, () => row).join('\n');

		expect(() => parseCSV(csv, {}, jest.fn())).toThrow(/5,000 total cells/);
	});

	it('imports a CSV at the 5,000-cell limit', () => {
		const row = Array.from({ length: 20 }, () => 'value').join(',');
		const csv = Array.from({ length: 250 }, () => row).join('\n');
		const setAttributes = jest.fn();

		expect(() => parseCSV(csv, {}, setAttributes)).not.toThrow();
		expect(setAttributes).toHaveBeenCalledTimes(2);
	});

	it('includes a preserved footer in the final table size', () => {
		const row = Array.from({ length: 20 }, () => 'value').join(',');
		const csv = Array.from({ length: 250 }, () => row).join('\n');
		const attributes = {
			foot: [
				{
					cells: Array.from({ length: 20 }, () => ({
						content: '',
						tag: 'td',
					})),
				},
			],
		};

		expect(() => parseCSV(csv, attributes, jest.fn())).toThrow(
			/5,000 total cells/
		);
	});
});
