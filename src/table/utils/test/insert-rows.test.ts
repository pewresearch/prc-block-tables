/**
 * Internal dependencies
 */
import {
	createTable,
	insertRow,
	insertRows,
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

const table: VTable = {
	head: [getRow(3, 'head', 0, 'th', 'head')],
	body: [
		getRow(3, 'body', 0, 'td', 'body-0'),
		getRow(3, 'body', 1, 'td', 'body-1'),
		getRow(3, 'body', 2, 'td', 'body-2'),
	],
	foot: [getRow(3, 'foot', 0, 'td', 'foot')],
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

describe('insertRows', () => {
	it('should insert multiple rows at the given index', () => {
		expect(
			insertRows(
				{ ...table },
				{ sectionName: 'body', rowIndex: 1, count: 3 }
			)
		).toStrictEqual({
			head: [getRow(3, 'head', 0, 'th', 'head')],
			body: [
				getRow(3, 'body', 0, 'td', 'body-0'),
				getRow(3, 'body', 1, 'td', ''),
				getRow(3, 'body', 2, 'td', ''),
				getRow(3, 'body', 3, 'td', ''),
				getRow(3, 'body', 4, 'td', 'body-1'),
				getRow(3, 'body', 5, 'td', 'body-2'),
			],
			foot: [getRow(3, 'foot', 0, 'td', 'foot')],
		});
	});

	it('should append many rows at the end of the body', () => {
		const source = createTable({
			rowCount: 1,
			colCount: 2,
			headerSection: false,
			footerSection: false,
		});
		const result = insertRows(source, {
			sectionName: 'body',
			rowIndex: 1,
			count: 210,
		});

		expect(result.body).toHaveLength(211);
		expect(result.body[0].cells[0].content).toBe('');
		expect(result.body[210].cells).toHaveLength(2);
		expect(result.body[210].cells[0].rowIndex).toBe(210);
	});

	it('should cap the table at 500 total rows', () => {
		const source = createTable({
			rowCount: 499,
			colCount: 3,
			headerSection: false,
			footerSection: false,
		});
		const result = insertRows(source, {
			sectionName: 'body',
			rowIndex: 499,
			count: 10,
		});

		expect(result.body).toHaveLength(500);
	});

	it('should cap the table at 5,000 total cells', () => {
		const source = createTable({
			rowCount: 249,
			colCount: 20,
			headerSection: false,
			footerSection: false,
		});
		const result = insertRows(source, {
			sectionName: 'body',
			rowIndex: 249,
			count: 10,
		});

		expect(result.body).toHaveLength(250);
	});

	it('should use the widest row when enforcing the cell limit', () => {
		const source = createTable({
			rowCount: 249,
			colCount: 20,
			headerSection: false,
			footerSection: false,
		});
		source.body[0] = {
			cells: source.body[0].cells.slice(0, 2),
		};
		const result = insertRows(source, {
			sectionName: 'body',
			rowIndex: 249,
			count: 10,
		});

		expect(result.body).toHaveLength(250);
		expect(result.body[249].cells).toHaveLength(20);
	});

	it('should leave the table unchanged for invalid counts', () => {
		const source = { ...table };
		expect(
			insertRows(source, {
				sectionName: 'body',
				rowIndex: 1,
				count: 0,
			})
		).toBe(source);
		expect(
			insertRows(source, {
				sectionName: 'body',
				rowIndex: 1,
				count: -2,
			})
		).toBe(source);
	});

	it('should expand rowspan by the inserted count', () => {
		const result = insertRows(
			{ ...rowspanTable },
			{ sectionName: 'body', rowIndex: 1, count: 2 }
		);

		expect(result.body).toHaveLength(4);
		expect(result.body[0].cells[0].rowSpan).toBe(4);
		expect(result.body[1].cells[0].isHidden).toBe(true);
		expect(result.body[2].cells[0].isHidden).toBe(true);
		expect(result.body[3].cells[0].isHidden).toBe(true);
		expect(result.body[3].cells[1].content).toBe('d');
	});

	it('should match repeated insertRow for the same count', () => {
		let repeated = { ...table };
		for (let i = 0; i < 4; i++) {
			repeated = insertRow(repeated, {
				sectionName: 'body',
				rowIndex: 1 + i,
			});
		}

		expect(
			insertRows(
				{ ...table },
				{ sectionName: 'body', rowIndex: 1, count: 4 }
			)
		).toStrictEqual(repeated);
	});
});
