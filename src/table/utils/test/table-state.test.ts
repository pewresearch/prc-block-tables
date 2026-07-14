/**
 * Internal dependencies
 */
import {
	createTable,
	deleteColumn,
	deleteRow,
	insertRow,
	moveColumn,
	canMoveColumn,
	getColumnCount,
	type VTable,
	type VRow,
	type VCell,
} from '../table-state';
import type { SectionName } from '../../block-attributes';

const getRow = (
	cells: number,
	sectionName: SectionName,
	rowIndex: number,
	tag: 'th' | 'td',
	content = '',
	options = {}
): VRow => {
	return {
		cells: Array.from({ length: cells }).map((_, vColIndex): VCell => {
			return {
				content,
				tag,
				rowIndex,
				vColIndex,
				sectionName,
				rowSpan: 1,
				colSpan: 1,
				isHidden: false,
				isFirstSelected: false,
				...options,
			};
		}),
	};
};

const getRowWithContents = (
	contents: string[],
	sectionName: SectionName,
	rowIndex: number,
	tag: 'th' | 'td'
): VRow => {
	return {
		cells: contents.map(
			(content, vColIndex): VCell => ({
				content,
				tag,
				rowIndex,
				vColIndex,
				sectionName,
				rowSpan: 1,
				colSpan: 1,
				isHidden: false,
				isFirstSelected: false,
			})
		),
	};
};

const table: VTable = {
	head: [getRow(3, 'head', 0, 'th', 'head')],
	body: [
		getRow(3, 'body', 0, 'td', 'body-0'),
		getRow(3, 'body', 1, 'td', 'body-1'),
		getRow(3, 'body', 2, 'td', 'body-2'),
	],
	foot: [getRow(3, 'foot', 0, 'td', 'foot')],
};

const cell = (
	content: string,
	rowIndex: number,
	vColIndex: number,
	overrides: Partial<VCell> = {}
): VCell => ({
	content,
	tag: 'td',
	rowIndex,
	vColIndex,
	sectionName: 'body',
	rowSpan: 1,
	colSpan: 1,
	isHidden: false,
	...overrides,
});

const colspanTable: VTable = {
	head: [],
	body: [
		{
			cells: [
				cell('a', 0, 0, { colSpan: 2 }),
				cell('', 0, 1, { isHidden: true }),
				cell('c', 0, 2),
			],
		},
	],
	foot: [],
};

const rowspanTable: VTable = {
	head: [],
	body: [
		{
			cells: [
				cell('a', 0, 0, { rowSpan: 2 }),
				cell('b', 0, 1),
				cell('c', 0, 2),
			],
		},
		{
			cells: [
				cell('', 1, 0, { isHidden: true }),
				cell('d', 1, 1),
				cell('e', 1, 2),
			],
		},
	],
	foot: [],
};

const rowspanTwoColTable: VTable = {
	head: [],
	body: [
		{
			cells: [cell('a', 0, 0, { rowSpan: 2 }), cell('b', 0, 1)],
		},
		{
			cells: [cell('', 1, 0, { isHidden: true }), cell('d', 1, 1)],
		},
	],
	foot: [],
};

describe('table-state', () => {
	describe('createTable', () => {
		it('should create the right virtual table', () => {
			expect(
				createTable({
					rowCount: 3,
					colCount: 3,
					headerSection: false,
					footerSection: false,
				})
			).toStrictEqual({
				head: [],
				body: [
					getRow(3, 'body', 0, 'td'),
					getRow(3, 'body', 1, 'td'),
					getRow(3, 'body', 2, 'td'),
				],
				foot: [],
			});
		});

		it('should create virtual table with head and foot', () => {
			expect(
				createTable({
					rowCount: 3,
					colCount: 3,
					headerSection: true,
					footerSection: true,
				})
			).toStrictEqual({
				head: [getRow(3, 'head', 0, 'th')],
				body: [
					getRow(3, 'body', 0, 'td'),
					getRow(3, 'body', 1, 'td'),
					getRow(3, 'body', 2, 'td'),
				],
				foot: [getRow(3, 'foot', 0, 'td')],
			});
		});
	});

	describe('insertRow', () => {
		it('should return the table with the correct number of rows', () => {
			expect(
				insertRow({ ...table }, { sectionName: 'body', rowIndex: 1 })
			).toStrictEqual({
				head: [getRow(3, 'head', 0, 'th', 'head')],
				body: [
					getRow(3, 'body', 0, 'td', 'body-0'),
					getRow(3, 'body', 1, 'td', ''),
					getRow(3, 'body', 2, 'td', 'body-1'),
					getRow(3, 'body', 3, 'td', 'body-2'),
				],
				foot: [getRow(3, 'foot', 0, 'td', 'foot')],
			});
			expect(
				insertRow({ ...table }, { sectionName: 'body', rowIndex: 3 })
			).toStrictEqual({
				head: [getRow(3, 'head', 0, 'th', 'head')],
				body: [
					getRow(3, 'body', 0, 'td', 'body-0'),
					getRow(3, 'body', 1, 'td', 'body-1'),
					getRow(3, 'body', 2, 'td', 'body-2'),
					getRow(3, 'body', 3, 'td', ''),
				],
				foot: [getRow(3, 'foot', 0, 'td', 'foot')],
			});
		});
	});

	describe('deleteRow', () => {
		it('should return the table with the correct number of rows', () => {
			expect(
				deleteRow({ ...table }, { sectionName: 'body', rowIndex: 0 })
			).toStrictEqual({
				head: [getRow(3, 'head', 0, 'th', 'head')],
				body: [
					getRow(3, 'body', 0, 'td', 'body-1'),
					getRow(3, 'body', 1, 'td', 'body-2'),
				],
				foot: [getRow(3, 'foot', 0, 'td', 'foot')],
			});
			expect(
				deleteRow({ ...table }, { sectionName: 'body', rowIndex: 1 })
			).toStrictEqual({
				head: [getRow(3, 'head', 0, 'th', 'head')],
				body: [
					getRow(3, 'body', 0, 'td', 'body-0'),
					getRow(3, 'body', 1, 'td', 'body-2'),
				],
				foot: [getRow(3, 'foot', 0, 'td', 'foot')],
			});
		});
	});

	describe('deleteColumn', () => {
		it('should return the table with the correct number of columns', () => {
			expect(deleteColumn({ ...table }, { vColIndex: 0 })).toStrictEqual({
				head: [getRow(2, 'head', 0, 'th', 'head')],
				body: [
					getRow(2, 'body', 0, 'td', 'body-0'),
					getRow(2, 'body', 1, 'td', 'body-1'),
					getRow(2, 'body', 2, 'td', 'body-2'),
				],
				foot: [getRow(2, 'foot', 0, 'td', 'foot')],
			});
			expect(deleteColumn({ ...table }, { vColIndex: 2 })).toStrictEqual({
				head: [getRow(2, 'head', 0, 'th', 'head')],
				body: [
					getRow(2, 'body', 0, 'td', 'body-0'),
					getRow(2, 'body', 1, 'td', 'body-1'),
					getRow(2, 'body', 2, 'td', 'body-2'),
				],
				foot: [getRow(2, 'foot', 0, 'td', 'foot')],
			});
		});
	});

	describe('getColumnCount', () => {
		it('should return the column count', () => {
			expect(getColumnCount(table)).toBe(3);
		});

		it('should use the widest row across sections', () => {
			const uneven: VTable = {
				head: [getRow(4, 'head', 0, 'th', 'head')],
				body: [getRow(2, 'body', 0, 'td', 'body')],
				foot: [],
			};
			expect(getColumnCount(uneven)).toBe(4);
		});
	});

	describe('canMoveColumn', () => {
		it('should allow adjacent moves', () => {
			expect(canMoveColumn(table, 0, 1)).toBe(true);
			expect(canMoveColumn(table, 1, 0)).toBe(true);
			expect(canMoveColumn(table, 1, 2)).toBe(true);
		});

		it('should reject non-adjacent or out-of-range moves', () => {
			expect(canMoveColumn(table, 0, 2)).toBe(false);
			expect(canMoveColumn(table, 0, -1)).toBe(false);
			expect(canMoveColumn(table, 2, 3)).toBe(false);
		});

		it('should reject moves involving colspan cells', () => {
			expect(canMoveColumn(colspanTable, 0, 1)).toBe(false);
			expect(canMoveColumn(colspanTable, 1, 2)).toBe(false);
		});

		it('should reject moves involving rowspan cells', () => {
			expect(canMoveColumn(rowspanTable, 0, 1)).toBe(false);
			expect(canMoveColumn(rowspanTable, 1, 2)).toBe(true);
		});
	});

	describe('moveColumn', () => {
		it('should swap adjacent columns', () => {
			const labeled: VTable = {
				head: [getRowWithContents(['A', 'B', 'C'], 'head', 0, 'th')],
				body: [getRowWithContents(['1', '2', '3'], 'body', 0, 'td')],
				foot: [],
			};

			expect(
				moveColumn(labeled, { fromVColIndex: 0, toVColIndex: 1 })
			).toStrictEqual({
				head: [getRowWithContents(['B', 'A', 'C'], 'head', 0, 'th')],
				body: [getRowWithContents(['2', '1', '3'], 'body', 0, 'td')],
				foot: [],
			});

			expect(
				moveColumn(labeled, { fromVColIndex: 2, toVColIndex: 1 })
			).toStrictEqual({
				head: [getRowWithContents(['A', 'C', 'B'], 'head', 0, 'th')],
				body: [getRowWithContents(['1', '3', '2'], 'body', 0, 'td')],
				foot: [],
			});
		});

		it('should no-op when move is not allowed', () => {
			expect(
				moveColumn(table, { fromVColIndex: 0, toVColIndex: 2 })
			).toBe(table);
		});

		it('should no-op when a rowspan blocks the move', () => {
			expect(
				moveColumn(rowspanTwoColTable, {
					fromVColIndex: 0,
					toVColIndex: 1,
				})
			).toBe(rowspanTwoColTable);
		});
	});
});
