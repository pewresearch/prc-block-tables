/**
 * WordPress dependencies
 */
import { useEffect } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { pruneRowDropdownColumnsBySheet } from '../lib/edit-utils';
import {
	excludeIdentityFromRowDropdowns,
	getDefaultRowDropdownColumns,
	getJsonColumnsBackfill,
	migrateColumnValueFormats,
	migrateMobileAbbrevRules,
	pruneColumnKeyedObject,
	pruneHiddenColumnsBySheet,
	pruneKnownColumnList,
	shouldClearDefaultSortColumn,
} from '../lib/sync-table-attributes';

/**
 * Keep editor attributes in sync with the current table: backfill jsonColumns,
 * prune stale column/sheet lists, and run one-shot legacy migrations.
 *
 * @param {Object}   params
 * @param {boolean}  params.pivotActive
 * @param {string}   params.dataSource
 * @param {Object}   params.jsonTable
 * @param {unknown}  params.jsonColumns
 * @param {boolean}  params.contextLike
 * @param {unknown}  params.resolvedContextData
 * @param {string[]} params.sheetNames
 * @param {unknown}  params.hiddenColumnsBySheet
 * @param {unknown}  params.rowDropdownColumnsBySheet
 * @param {unknown}  params.hiddenColumnHeaders
 * @param {unknown}  params.boldColumns
 * @param {unknown}  params.mobileHiddenColumns
 * @param {unknown}  params.mobileColumnHeaders
 * @param {string[]} params.visibleColumns
 * @param {string}   params.defaultSortColumn
 * @param {boolean}  params.enableColumnSorting
 * @param {string[]} params.defaultSheetVisibleColumns
 * @param {boolean}  params.enableRowDropdowns
 * @param {string[]} params.allTableColumns
 * @param {string[]} params.rowDropdownColumnList
 * @param {string}   params.rowDropdownIdentityColumn
 * @param {unknown}  params.columnValueFormats
 * @param {string}   params.valuePrefix
 * @param {string}   params.valueSuffix
 * @param {string[]} params.formatableColumns
 * @param {unknown}  params.mobileValueFormatRules
 * @param {unknown}  params.valueAbbreviationRules
 * @param {Function} params.setAttributes
 */
export function useSyncedTableAttributes({
	pivotActive,
	dataSource,
	jsonTable,
	jsonColumns,
	contextLike,
	resolvedContextData,
	sheetNames,
	hiddenColumnsBySheet,
	rowDropdownColumnsBySheet,
	hiddenColumnHeaders,
	boldColumns,
	mobileHiddenColumns,
	mobileColumnHeaders,
	visibleColumns,
	defaultSortColumn,
	enableColumnSorting,
	defaultSheetVisibleColumns,
	enableRowDropdowns,
	allTableColumns,
	rowDropdownColumnList,
	rowDropdownIdentityColumn,
	columnValueFormats,
	valuePrefix,
	valueSuffix,
	formatableColumns,
	mobileValueFormatRules,
	valueAbbreviationRules,
	setAttributes,
}) {
	useEffect(() => {
		const next = getJsonColumnsBackfill({
			pivotActive,
			dataSource,
			jsonTable,
			jsonColumns,
			contextLike,
			resolvedContextData,
		});
		if (next) {
			setAttributes({ jsonColumns: next });
		}
	}, [
		pivotActive,
		dataSource,
		jsonTable,
		jsonColumns,
		contextLike,
		resolvedContextData,
		setAttributes,
	]);

	useEffect(() => {
		const { next, changed } = pruneHiddenColumnsBySheet(
			jsonColumns,
			sheetNames,
			hiddenColumnsBySheet
		);
		if (changed) {
			setAttributes({ hiddenColumnsBySheet: next });
		}
	}, [jsonColumns, sheetNames, hiddenColumnsBySheet, setAttributes]);

	useEffect(() => {
		if (!Array.isArray(sheetNames) || sheetNames.length === 0) {
			return;
		}
		if (!Array.isArray(jsonColumns) || jsonColumns.length === 0) {
			return;
		}

		const { next, changed } = pruneRowDropdownColumnsBySheet(
			jsonColumns,
			sheetNames,
			rowDropdownColumnsBySheet
		);
		if (changed) {
			setAttributes({ rowDropdownColumnsBySheet: next });
		}
	}, [jsonColumns, sheetNames, rowDropdownColumnsBySheet, setAttributes]);

	useEffect(() => {
		if (!Array.isArray(jsonColumns) || jsonColumns.length === 0) {
			return;
		}
		const { next, changed } = pruneKnownColumnList(
			hiddenColumnHeaders,
			new Set(jsonColumns)
		);
		if (changed) {
			setAttributes({ hiddenColumnHeaders: next });
		}
	}, [jsonColumns, hiddenColumnHeaders, setAttributes]);

	useEffect(() => {
		if (!Array.isArray(jsonColumns) || jsonColumns.length === 0) {
			return;
		}
		const { next, changed } = pruneKnownColumnList(
			boldColumns,
			new Set(jsonColumns)
		);
		if (changed) {
			setAttributes({ boldColumns: next });
		}
	}, [jsonColumns, boldColumns, setAttributes]);

	useEffect(() => {
		const { next, changed } = pruneKnownColumnList(
			mobileHiddenColumns,
			new Set(visibleColumns)
		);
		if (changed) {
			setAttributes({ mobileHiddenColumns: next });
		}
	}, [visibleColumns, mobileHiddenColumns, setAttributes]);

	useEffect(() => {
		const { next, changed } = pruneColumnKeyedObject(
			mobileColumnHeaders,
			new Set(visibleColumns)
		);
		if (changed) {
			setAttributes({ mobileColumnHeaders: next });
		}
	}, [visibleColumns, mobileColumnHeaders, setAttributes]);

	useEffect(() => {
		if (
			shouldClearDefaultSortColumn(
				defaultSortColumn,
				enableColumnSorting,
				defaultSheetVisibleColumns
			)
		) {
			setAttributes({ defaultSortColumn: '' });
		}
	}, [
		defaultSortColumn,
		enableColumnSorting,
		defaultSheetVisibleColumns,
		setAttributes,
	]);

	useEffect(() => {
		const initial = getDefaultRowDropdownColumns({
			enableRowDropdowns,
			allTableColumns,
			rowDropdownColumnList,
			rowDropdownIdentityColumn,
		});
		if (initial) {
			setAttributes({ rowDropdownColumns: initial });
		}
	}, [
		enableRowDropdowns,
		allTableColumns,
		rowDropdownColumnList,
		rowDropdownIdentityColumn,
		setAttributes,
	]);

	useEffect(() => {
		const patch = excludeIdentityFromRowDropdowns({
			rowDropdownIdentityColumn,
			rowDropdownColumnList,
			rowDropdownColumnsBySheet,
		});
		if (patch) {
			setAttributes(patch);
		}
	}, [
		rowDropdownIdentityColumn,
		rowDropdownColumnList,
		rowDropdownColumnsBySheet,
		setAttributes,
	]);

	useEffect(() => {
		const patch = migrateColumnValueFormats({
			columnValueFormats,
			valuePrefix,
			valueSuffix,
			formatableColumns,
		});
		if (patch) {
			setAttributes(patch);
		}
	}, [
		columnValueFormats,
		valuePrefix,
		valueSuffix,
		formatableColumns,
		setAttributes,
	]);

	useEffect(() => {
		const patch = migrateMobileAbbrevRules({
			mobileValueFormatRules,
			valueAbbreviationRules,
		});
		if (patch) {
			setAttributes(patch);
		}
	}, [mobileValueFormatRules, valueAbbreviationRules, setAttributes]);
}
