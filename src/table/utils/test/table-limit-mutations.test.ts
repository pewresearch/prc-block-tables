/**
 * Internal dependencies
 */
import { createTable, toggleSection, transposeTable } from '../table-state';

describe('table size limits across mutations', () => {
	it('does not add a section after reaching the row limit', () => {
		const source = createTable({
			rowCount: 500,
			colCount: 3,
			headerSection: false,
			footerSection: false,
		});

		expect(toggleSection(source, 'head')).toBe(source);
		expect(toggleSection(source, 'foot')).toBe(source);
	});

	it('uses the widest row when limiting a new section', () => {
		const source = createTable({
			rowCount: 250,
			colCount: 20,
			headerSection: false,
			footerSection: false,
		});
		source.body[0] = {
			cells: source.body[0].cells.slice(0, 2),
		};

		expect(toggleSection(source, 'head')).toBe(source);
	});

	it('does not transpose into more than 500 rows', () => {
		const source = createTable({
			rowCount: 1,
			colCount: 501,
			headerSection: true,
			footerSection: false,
		});

		expect(transposeTable(source)).toBeNull();
	});
});
