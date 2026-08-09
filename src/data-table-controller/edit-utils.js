/**
 * Editor utilities for Data Table Controller.
 */
import { select } from '@wordpress/data';
import { createBlock } from '@wordpress/blocks';
import { __, sprintf } from '@wordpress/i18n';
import { Icon, dragHandle } from '@wordpress/icons';
import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';

import { unionSheetColumns } from './utils';
import { normalizeContextData, unionContextSheetColumns } from './context-data';

/**
 * Whether the data source resolves tabular data via the context-normalization pipeline.
 *
 * @param {string} dataSource Active data source.
 * @return {boolean} True for context and firebase sources.
 */
function isContextLikeSource(dataSource) {
	return dataSource === 'context' || dataSource === 'firebase';
}

/**
 * Parse a table cell value for numeric descending sort.
 *
 * @param {unknown} value Cell value.
 * @return {number} Parsed number or NaN.
 */
export function parseNumericCell(value) {
	if (value === null || value === undefined || value === '') {
		return NaN;
	}
	const str = String(value).trim();
	const cleaned = str.replace(/^[^0-9.\-+]+/, '');
	const num = parseFloat(cleaned);
	return Number.isFinite(num) ? num : NaN;
}

/**
 * Row options for auto-sort row picker.
 *
 * @param {Object} params          Params.
 * @param {Array}  params.rows     Table rows from default sheet.
 * @param {string} params.variable Column key used to label each row.
 * @return {{ label: string, value: string }[]} Select options.
 */
export function getAutoSortRowOptions({ rows, variable }) {
	if (!variable || !Array.isArray(rows) || rows.length === 0) {
		return [];
	}
	return rows.map((row, index) => {
		const cell = row[variable];
		const display =
			cell === null || cell === undefined || cell === ''
				? __('(empty)', 'data-table-controller')
				: String(cell);
		return {
			label: sprintf(
				/* translators: 1: cell value, 2: zero-based row index */
				__('%1$s (row %2$d)', 'data-table-controller'),
				display,
				index
			),
			value: String(index),
		};
	});
}

/**
 * Order visible, non-excluded columns by numeric values in the selected row (descending).
 *
 * @param {Object}   params          Params.
 * @param {Array}    params.rows     Table rows.
 * @param {number}   params.rowIndex Selected row index.
 * @param {string[]} params.columns  Full column list.
 * @param {string[]} params.excluded Columns excluded from auto sort.
 * @param {string[]} params.hidden   Hidden column keys.
 * @return {string[]} Sorted column keys.
 */
export function computeAutoSortOrder({
	rows,
	rowIndex,
	columns,
	excluded,
	hidden,
}) {
	const hiddenSet = new Set(Array.isArray(hidden) ? hidden : []);
	const excludedSet = new Set(Array.isArray(excluded) ? excluded : []);
	const row = Array.isArray(rows) ? rows[rowIndex] : null;
	if (!row) {
		return [];
	}

	const sortable = (Array.isArray(columns) ? columns : []).filter(
		(col) => !hiddenSet.has(col) && !excludedSet.has(col)
	);

	const withMeta = sortable.map((col, originalIndex) => ({
		col,
		originalIndex,
		num: parseNumericCell(row[col]),
	}));

	return withMeta
		.sort((a, b) => {
			const aNaN = Number.isNaN(a.num);
			const bNaN = Number.isNaN(b.num);
			if (aNaN && bNaN) {
				return a.originalIndex - b.originalIndex;
			}
			if (aNaN) {
				return 1;
			}
			if (bNaN) {
				return -1;
			}
			if (b.num !== a.num) {
				return b.num - a.num;
			}
			return a.originalIndex - b.originalIndex;
		})
		.map((item) => item.col);
}

/**
 * Preserve excluded-column order from saved columnOrder.
 *
 * @param {Object}   params             Params.
 * @param {string[]} params.columnOrder Saved order.
 * @param {string[]} params.excluded    Excluded column keys.
 * @param {string[]} params.visible     Visible column keys.
 * @return {string[]} Excluded columns in display order.
 */
export function getExcludedOrder({ columnOrder, excluded, visible }) {
	const excludedSet = new Set(Array.isArray(excluded) ? excluded : []);
	const excludedVisible = (Array.isArray(visible) ? visible : []).filter(
		(col) => excludedSet.has(col)
	);
	const saved = Array.isArray(columnOrder) ? columnOrder : [];
	const ordered = saved.filter((col) => excludedVisible.includes(col));
	const tail = excludedVisible.filter((col) => !ordered.includes(col));
	return [...ordered, ...tail];
}

/**
 * Merge excluded (manual) and auto-sorted column groups.
 *
 * @param {Object}   params               Params.
 * @param {string[]} params.excludedOrder Draggable excluded columns.
 * @param {string[]} params.autoOrder     Locked auto-sorted columns.
 * @return {string[]} Full column order.
 */
export function buildAutoColumnOrder({ excludedOrder, autoOrder }) {
	return [
		...(Array.isArray(excludedOrder) ? excludedOrder : []),
		...(Array.isArray(autoOrder) ? autoOrder : []),
	];
}

/**
 * Shallow compare two string arrays.
 *
 * @param {string[]} a First array.
 * @param {string[]} b Second array.
 * @return {boolean} True when lengths and entries match.
 */
export function columnOrdersEqual(a, b) {
	const left = Array.isArray(a) ? a : [];
	const right = Array.isArray(b) ? b : [];
	if (left.length !== right.length) {
		return false;
	}
	return left.every((val, i) => val === right[i]);
}

/**
 * Merge saved column order with visible columns (unknown keys dropped; missing appended).
 *
 * @param {Object}   params            Params.
 * @param {string[]} params.columns    Full column list.
 * @param {string[]} params.savedOrder Preferred order keys.
 * @param {string[]} [params.hidden]   Hidden column keys.
 * @return {string[]} Effective visible column order.
 */
export function mergeColumnOrder({ columns, savedOrder, hidden = [] }) {
	const hiddenSet = new Set(Array.isArray(hidden) ? hidden : []);
	const visible = (Array.isArray(columns) ? columns : []).filter(
		(col) => !hiddenSet.has(col)
	);
	const saved = Array.isArray(savedOrder) ? savedOrder : [];
	const ordered = saved.filter((col) => visible.includes(col));
	const tail = visible.filter((col) => !ordered.includes(col));
	return [...ordered, ...tail];
}

/**
 * Sortable column chip (horizontal reorder).
 *
 * @param {Object}  props          Props.
 * @param {string}  props.id       Column key (sortable id).
 * @param {string}  props.label    Display label.
 * @param {boolean} props.disabled When true, chip is locked (auto-sorted).
 * @param {string}  props.suffix   Optional suffix (e.g. cell value).
 */
export function SortableColumnChip({
	id,
	label,
	disabled = false,
	suffix = '',
}) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id, disabled });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	const chipClass =
		'prc-data-table-controller-column-chip' +
		(isDragging ? ' is-dragging' : '') +
		(disabled ? ' is-disabled' : '');

	return (
		<div ref={setNodeRef} style={style} className={chipClass}>
			<button
				type="button"
				className="prc-data-table-controller-column-chip__handle"
				disabled={disabled}
				aria-disabled={disabled}
				aria-label={
					disabled
						? sprintf(
								/* translators: %s: column name */
								__(
									'Auto-sorted column: %s',
									'data-table-controller'
								),
								label
							)
						: sprintf(
								/* translators: %s: column name */
								__(
									'Reorder column: %s',
									'data-table-controller'
								),
								label
							)
				}
				{...(disabled ? {} : attributes)}
				{...(disabled ? {} : listeners)}
			>
				<Icon
					icon={dragHandle}
					className="prc-data-table-controller-column-chip__icon"
				/>
				<span className="prc-data-table-controller-column-chip__label">
					{label}
					{suffix ? (
						<span className="prc-data-table-controller-column-chip__suffix">
							{suffix}
						</span>
					) : null}
				</span>
			</button>
		</div>
	);
}

/**
 * Insert sheet filter blocks for multi-sheet JSON tables (idempotent).
 *
 * @param {string}   clientId     Controller block client id.
 * @param {Function} insertBlocks Block editor insertBlocks action.
 * @param {string[]} sheetNames   Detected sheet names.
 * @param {string}   defaultSheet Default active sheet name.
 */
export function insertSheetFilterBlocks(
	clientId,
	insertBlocks,
	sheetNames,
	defaultSheet
) {
	if (!clientId || !Array.isArray(sheetNames) || sheetNames.length === 0) {
		return;
	}

	const innerBlocks = select('core/block-editor').getBlocks(clientId);
	const existingSheetFilters = innerBlocks.filter(
		(block) =>
			block.name === 'prc-block/data-table-filter' &&
			block.attributes.filterType === 'sheet'
	);
	const existingValues = new Set(
		existingSheetFilters.map((block) => block.attributes.value)
	);
	const toCreate = sheetNames.filter((name) => !existingValues.has(name));

	if (toCreate.length === 0) {
		return;
	}

	const hasDefault = existingSheetFilters.some(
		(block) => block.attributes.isDefault
	);
	const newBlocks = toCreate.map((name) =>
		createBlock('prc-block/data-table-filter', {
			filterType: 'sheet',
			value: name,
			label: name,
			isDefault: !hasDefault && name === defaultSheet,
		})
	);

	insertBlocks(newBlocks, innerBlocks.length, clientId);
}

/**
 * Build attribute updates from a parsed JSON table result.
 *
 * @param {Object} parsed Parsed JSON table from parseJsonToTable.
 * @return {Object} Partial controller attributes to set.
 */
export function jsonParsedAttributes(parsed) {
	if (parsed.sheets) {
		const sheetNames = Object.keys(parsed.sheets);
		const defaultSheet = parsed.defaultSheet || sheetNames[0] || '';
		return {
			jsonTable: parsed,
			dataSource: 'json',
			jsonColumns: unionSheetColumns(parsed.sheets),
			columnOrder: [],
			defaultJsonSheet: defaultSheet,
			sheetNames,
			defaultSheet,
		};
	}

	return {
		jsonTable: parsed,
		dataSource: 'json',
		jsonColumns: parsed.columns,
		columnOrder: [],
		defaultJsonSheet: '',
		sheetNames: null,
		defaultSheet: '',
	};
}

/**
 * Resolve preview table stats for the controller editor summary.
 *
 * @param {Object} params                  Params.
 * @param {string} params.dataSource       Active data source.
 * @param {Object} params.jsonTable        JSON table attribute.
 * @param {Object} params.csvTable         CSV table attribute.
 * @param {string} params.defaultJsonSheet Default sheet attribute.
 * @param {Array}  params.jsonColumns      Column list attribute.
 * @param {Object} params.contextData      Provider context data (prc-block/dataTableData).
 * @param {Object} [params.overrideSheets] Pre-normalized sheets (e.g. pivoted) that replace source sheets when set.
 * @return {Object} Preview stats for the editor summary.
 */
export function getEditorTablePreview({
	dataSource,
	jsonTable,
	csvTable,
	defaultJsonSheet,
	jsonColumns,
	contextData,
	overrideSheets = null,
}) {
	const hasOverride =
		overrideSheets &&
		typeof overrideSheets === 'object' &&
		Object.keys(overrideSheets).length > 0;

	if (hasOverride) {
		const sheetNames = Object.keys(overrideSheets);
		const resolvedDefaultSheet =
			defaultJsonSheet && overrideSheets[defaultJsonSheet]
				? defaultJsonSheet
				: sheetNames[0] || '';
		const activeTable =
			overrideSheets[resolvedDefaultSheet] ||
			overrideSheets[sheetNames[0]] ||
			null;
		const rowCount = activeTable?.rows?.length ?? 0;
		const totalColCount =
			(Array.isArray(jsonColumns) && jsonColumns.length > 0
				? jsonColumns.length
				: activeTable?.columns?.length) ?? 0;

		return {
			activeTable,
			rowCount,
			totalColCount,
			isMultiSheetJson: sheetNames.length > 1,
			sheetNames,
			resolvedDefaultSheet,
			contextSheets: overrideSheets,
		};
	}

	const contextSheets = isContextLikeSource(dataSource)
		? normalizeContextData(contextData)
		: null;
	const isMultiSheetContext =
		isContextLikeSource(dataSource) &&
		contextSheets &&
		Object.keys(contextSheets).length > 1;
	const isMultiSheetJson =
		dataSource === 'json' &&
		jsonTable?.sheets &&
		typeof jsonTable.sheets === 'object';

	let sheetNames = [];
	if (isMultiSheetContext) {
		sheetNames = Object.keys(contextSheets);
	} else if (isMultiSheetJson) {
		sheetNames = Object.keys(jsonTable.sheets);
	}

	const resolvedDefaultSheet =
		defaultJsonSheet || jsonTable?.defaultSheet || sheetNames[0] || '';

	let previewSheet = null;
	if (isMultiSheetContext) {
		previewSheet =
			contextSheets[resolvedDefaultSheet] || contextSheets[sheetNames[0]];
	} else if (isMultiSheetJson) {
		previewSheet =
			jsonTable.sheets[resolvedDefaultSheet] ||
			jsonTable.sheets[sheetNames[0]];
	}

	let activeTable = csvTable;
	if (isContextLikeSource(dataSource)) {
		activeTable = isMultiSheetContext
			? previewSheet
			: contextSheets?.default || null;
	} else if (dataSource === 'json') {
		activeTable = previewSheet || jsonTable;
	}
	const rowCount = activeTable?.rows?.length ?? 0;
	const totalColCount =
		(Array.isArray(jsonColumns) && jsonColumns.length > 0
			? jsonColumns.length
			: activeTable?.columns?.length) ?? 0;

	return {
		activeTable,
		rowCount,
		totalColCount,
		isMultiSheetJson: isMultiSheetJson || isMultiSheetContext,
		sheetNames,
		resolvedDefaultSheet,
		contextSheets,
	};
}

/**
 * Build SelectControl options for the mobile card header column.
 *
 * @param {Object} params               Params.
 * @param {string} params.dataSource    Active data source.
 * @param {Array}  params.jsonColumns   JSON column list attribute.
 * @param {Object} params.csvTable      CSV table attribute.
 * @param {Array}  params.hiddenColumns Hidden column keys.
 * @return {{ label: string, value: string }[]} Select options.
 */
/**
 * Collect all data column keys from the active table source.
 *
 * @param {Object} params               Params.
 * @param {string} params.dataSource    Active data source.
 * @param {Array}  params.jsonColumns   JSON column list attribute.
 * @param {Object} params.csvTable      CSV table attribute.
 * @param {Object} params.remoteContext Remote Data Blocks context.
 * @param {Object} params.contextData   Provider context data (prc-block/dataTableData).
 * @return {string[]} Column keys.
 */
function collectTableColumnKeys({
	dataSource,
	jsonColumns,
	csvTable,
	remoteContext,
	contextData,
}) {
	const columnSet = new Set();
	if (
		(dataSource === 'json' || isContextLikeSource(dataSource)) &&
		Array.isArray(jsonColumns) &&
		jsonColumns.length > 0
	) {
		jsonColumns.forEach((col) => columnSet.add(col));
	} else if (dataSource === 'csv' && Array.isArray(csvTable?.columns)) {
		csvTable.columns.forEach((col) => columnSet.add(col));
	} else if (isContextLikeSource(dataSource)) {
		const sheets = normalizeContextData(contextData);
		unionContextSheetColumns(sheets).forEach((col) => columnSet.add(col));
	} else if (
		dataSource === 'remote' &&
		remoteContext &&
		Array.isArray(remoteContext.results) &&
		remoteContext.results.length > 0
	) {
		const first = remoteContext.results[0]?.result;
		if (first && typeof first === 'object') {
			Object.keys(first).forEach((key) => {
				if (key !== 'sheet') {
					columnSet.add(key);
				}
			});
		}
	}
	return [...columnSet].filter((col) => col !== 'row_id');
}

/**
 * All data column keys from the active table source, including hidden columns.
 *
 * @param {Object} params               Params.
 * @param {string} params.dataSource    Active data source.
 * @param {Array}  params.jsonColumns   JSON column list attribute.
 * @param {Object} params.csvTable      CSV table attribute.
 * @param {Object} params.remoteContext Remote Data Blocks context.
 * @param {Object} params.contextData   Provider context data (prc-block/dataTableData).
 * @return {string[]} Column keys.
 */
export function getAllTableColumns({
	dataSource,
	jsonColumns,
	csvTable,
	remoteContext,
	contextData,
}) {
	return collectTableColumnKeys({
		dataSource,
		jsonColumns,
		csvTable,
		remoteContext,
		contextData,
	});
}

/**
 * Column keys eligible for per-column value prefix/suffix (visible data columns).
 *
 * @param {Object} params               Params.
 * @param {string} params.dataSource    Active data source.
 * @param {Array}  params.jsonColumns   JSON column list attribute.
 * @param {Object} params.csvTable      CSV table attribute.
 * @param {Array}  params.hiddenColumns Hidden column keys.
 * @param {Object} params.remoteContext Remote Data Blocks context.
 * @param {Object} params.contextData   Provider context data (prc-block/dataTableData).
 * @return {string[]} Column keys.
 */
export function getFormatableColumns({
	dataSource,
	jsonColumns,
	csvTable,
	hiddenColumns,
	remoteContext,
	contextData,
}) {
	const hidden = new Set(Array.isArray(hiddenColumns) ? hiddenColumns : []);
	return collectTableColumnKeys({
		dataSource,
		jsonColumns,
		csvTable,
		remoteContext,
		contextData,
	}).filter((col) => !hidden.has(col));
}

/**
 * Column keys eligible for value formatting controls (prefix/suffix exclude, format rules).
 * Includes visible main-table columns plus row-dropdown-only columns when dropdowns are enabled.
 *
 * @param {Object}   params                           Params.
 * @param {string[]} params.formatableColumns         Visible main-table column keys.
 * @param {boolean}  params.enableRowDropdowns        Whether row dropdowns are enabled.
 * @param {string[]} params.rowDropdownColumns        Configured dropdown column keys.
 * @param {string}   params.rowDropdownIdentityColumn Identity column key (excluded).
 * @return {string[]} De-duplicated column keys.
 */
export function getValueFormatColumns({
	formatableColumns,
	enableRowDropdowns,
	rowDropdownColumns,
	rowDropdownIdentityColumn,
}) {
	const base = Array.isArray(formatableColumns)
		? formatableColumns.map(String)
		: [];
	if (!enableRowDropdowns) {
		return base;
	}
	const seen = new Set(base);
	const dropdown = Array.isArray(rowDropdownColumns)
		? rowDropdownColumns.map(String)
		: [];
	const identity =
		typeof rowDropdownIdentityColumn === 'string'
			? rowDropdownIdentityColumn
			: '';
	const extra = dropdown.filter(
		(col) => col !== identity && !seen.has(col) && seen.add(col)
	);
	return [...base, ...extra];
}

export function getMobileHeaderColumnOptions({
	dataSource,
	jsonColumns,
	csvTable,
	hiddenColumns,
	contextData,
}) {
	const columnSet = new Set();
	if (
		(dataSource === 'json' || isContextLikeSource(dataSource)) &&
		Array.isArray(jsonColumns) &&
		jsonColumns.length > 0
	) {
		jsonColumns.forEach((col) => columnSet.add(col));
	} else if (dataSource === 'csv' && Array.isArray(csvTable?.columns)) {
		csvTable.columns.forEach((col) => columnSet.add(col));
	} else if (isContextLikeSource(dataSource)) {
		const sheets = normalizeContextData(contextData);
		unionContextSheetColumns(sheets).forEach((col) => columnSet.add(col));
	}
	const hidden = new Set(Array.isArray(hiddenColumns) ? hiddenColumns : []);
	const visible = [...columnSet].filter(
		(col) => col !== 'row_id' && !hidden.has(col)
	);
	return [
		{
			label: __('Auto (first column)', 'data-table-controller'),
			value: '',
		},
		...visible.map((col) => ({ label: col, value: col })),
	];
}
