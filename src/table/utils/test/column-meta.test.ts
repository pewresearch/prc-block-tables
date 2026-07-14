/**
 * Internal dependencies
 */
import {
	DEFAULT_COLUMN_META,
	hasActiveColumnMeta,
	insertColumnMeta,
	deleteColumnMeta,
	moveColumnMeta,
	setColumnMetaField,
} from '../column-meta';
import type { ColumnMeta } from '../../block-attributes';

describe('column-meta', () => {
	describe('hasActiveColumnMeta', () => {
		it('should treat width as active metadata', () => {
			expect(
				hasActiveColumnMeta([{ dataType: 'auto', width: '120px' }])
			).toBe(true);
			expect(hasActiveColumnMeta([{ dataType: 'auto' }])).toBe(false);
		});
	});

	describe('insertColumnMeta', () => {
		it('should insert a default entry and shift later entries', () => {
			const current: ColumnMeta[] = [
				{ dataType: 'text' },
				{ dataType: 'number', width: '80px' },
			];
			expect(insertColumnMeta(current, 1)).toStrictEqual([
				{ dataType: 'text' },
				{ ...DEFAULT_COLUMN_META },
				{ dataType: 'number', width: '80px' },
			]);
		});

		it('should no-op on empty meta', () => {
			expect(insertColumnMeta([], 0)).toStrictEqual([]);
		});
	});

	describe('deleteColumnMeta', () => {
		it('should remove the entry at index', () => {
			const current: ColumnMeta[] = [
				{ dataType: 'text' },
				{ dataType: 'number' },
				{ dataType: 'date' },
			];
			expect(deleteColumnMeta(current, 1)).toStrictEqual([
				{ dataType: 'text' },
				{ dataType: 'date' },
			]);
		});
	});

	describe('moveColumnMeta', () => {
		it('should move an entry from one index to another', () => {
			const current: ColumnMeta[] = [
				{ dataType: 'text' },
				{ dataType: 'number', width: '100px' },
				{ dataType: 'date' },
			];
			expect(moveColumnMeta(current, 0, 1)).toStrictEqual([
				{ dataType: 'number', width: '100px' },
				{ dataType: 'text' },
				{ dataType: 'date' },
			]);
			expect(moveColumnMeta(current, 2, 1)).toStrictEqual([
				{ dataType: 'text' },
				{ dataType: 'date' },
				{ dataType: 'number', width: '100px' },
			]);
		});
	});

	describe('setColumnMetaField', () => {
		it('should set width on a column', () => {
			expect(setColumnMetaField(0, 'width', '142px', [])).toStrictEqual([
				{ dataType: 'auto', width: '142px' },
			]);
		});
	});
});
