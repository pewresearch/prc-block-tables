/**
 * WordPress dependencies
 */
import { useEffect, useMemo } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { columnOrdersEqual, insertSheetFilterBlocks } from '../lib/edit-utils';
import {
	normalizePivotColumns,
	normalizePivotExtraColumns,
	normalizePivotValueFields,
	getDistinctValues,
	pivotSheets,
} from '../lib/pivot';

/**
 * Derive pivot sheets and keep jsonColumns / sheet-filter blocks in sync.
 *
 * @param {Object}   params
 * @param {boolean}  params.pivotActive
 * @param {string}   params.pivotIndexColumn
 * @param {string}   params.pivotColumnField
 * @param {unknown}  params.pivotColumns
 * @param {unknown}  params.pivotValueFields
 * @param {unknown}  params.pivotExtraColumns
 * @param {Object}   params.rawSourceSheets
 * @param {string[]} params.rawSourceColumns
 * @param {string[]} params.jsonColumns
 * @param {string}   params.defaultJsonSheet
 * @param {Function} params.setAttributes
 * @param {string}   params.clientId
 * @param {Function} params.insertBlocks
 * @return {Object} Pivot derived state for the editor preview and pivot panel.
 */
export function usePivot({
	pivotActive,
	pivotIndexColumn,
	pivotColumnField,
	pivotColumns,
	pivotValueFields,
	pivotExtraColumns,
	rawSourceSheets,
	rawSourceColumns,
	jsonColumns,
	defaultJsonSheet,
	setAttributes,
	clientId,
	insertBlocks,
}) {
	const normalizedPivotColumns = useMemo(
		() => normalizePivotColumns(pivotColumns),
		[pivotColumns]
	);
	const normalizedPivotValueFields = useMemo(
		() => normalizePivotValueFields(pivotValueFields),
		[pivotValueFields]
	);
	const normalizedPivotExtraColumns = useMemo(
		() =>
			normalizePivotExtraColumns(pivotExtraColumns, {
				indexColumn: pivotIndexColumn,
				columnField: pivotColumnField,
				pivotColumns,
				valueFields: pivotValueFields,
			}),
		[
			pivotExtraColumns,
			pivotIndexColumn,
			pivotColumnField,
			pivotColumns,
			pivotValueFields,
		]
	);

	const pivotedSheets = useMemo(() => {
		if (!pivotActive) {
			return null;
		}
		return pivotSheets(rawSourceSheets, {
			indexColumn: pivotIndexColumn,
			columnField: pivotColumnField,
			pivotColumns: normalizedPivotColumns,
			valueFields: normalizedPivotValueFields,
			extraColumns: normalizedPivotExtraColumns,
		});
	}, [
		pivotActive,
		rawSourceSheets,
		pivotIndexColumn,
		pivotColumnField,
		normalizedPivotColumns,
		normalizedPivotValueFields,
		normalizedPivotExtraColumns,
	]);

	const pivotDistinctColumnValues = useMemo(() => {
		if (!pivotColumnField) {
			return [];
		}
		return getDistinctValues(rawSourceSheets, pivotColumnField);
	}, [rawSourceSheets, pivotColumnField]);

	const pivotExtraColumnOptions = useMemo(() => {
		const valueFieldNames = new Set(
			normalizedPivotValueFields.map((entry) => entry.field)
		);
		return rawSourceColumns.filter(
			(col) =>
				col !== pivotIndexColumn &&
				col !== pivotColumnField &&
				!valueFieldNames.has(col)
		);
	}, [
		rawSourceColumns,
		pivotIndexColumn,
		pivotColumnField,
		normalizedPivotValueFields,
	]);

	useEffect(() => {
		if (!pivotActive || !pivotedSheets) {
			return;
		}
		const sheetNames = Object.keys(pivotedSheets);
		const firstSheet = pivotedSheets[sheetNames[0]];
		const nextColumns = Array.isArray(firstSheet?.columns)
			? firstSheet.columns
			: [];
		if (nextColumns.length === 0) {
			return;
		}
		const colsChanged = !columnOrdersEqual(jsonColumns, nextColumns);
		const nextDefault =
			defaultJsonSheet && pivotedSheets[defaultJsonSheet]
				? defaultJsonSheet
				: sheetNames[0] || '';
		const defaultChanged = defaultJsonSheet !== nextDefault;
		if (colsChanged || defaultChanged) {
			setAttributes({
				...(colsChanged ? { jsonColumns: nextColumns } : {}),
				...(defaultChanged ? { defaultJsonSheet: nextDefault } : {}),
			});
		}
	}, [
		pivotActive,
		pivotedSheets,
		jsonColumns,
		defaultJsonSheet,
		setAttributes,
	]);

	useEffect(() => {
		if (!pivotActive || !pivotedSheets) {
			return;
		}
		const sheetNames = Object.keys(pivotedSheets);
		if (sheetNames.length === 0) {
			return;
		}
		const defaultSheet =
			defaultJsonSheet && pivotedSheets[defaultJsonSheet]
				? defaultJsonSheet
				: sheetNames[0];
		insertSheetFilterBlocks(
			clientId,
			insertBlocks,
			sheetNames,
			defaultSheet
		);
	}, [pivotActive, pivotedSheets, clientId, insertBlocks, defaultJsonSheet]);

	return {
		pivotedSheets,
		normalizedPivotColumns,
		normalizedPivotValueFields,
		normalizedPivotExtraColumns,
		pivotDistinctColumnValues,
		pivotExtraColumnOptions,
	};
}
