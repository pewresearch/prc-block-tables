/* eslint-disable max-lines */
/* eslint-disable max-lines-per-function */
/* global FileReader */
/**
 * External dependencies
 */
import {
	DndContext,
	KeyboardSensor,
	PointerSensor,
	closestCenter,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import {
	SortableContext,
	arrayMove,
	horizontalListSortingStrategy,
	sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';

/**
 * WordPress Dependencies
 */
import { __, sprintf } from '@wordpress/i18n';
import { useCallback, useEffect, useMemo, useState } from '@wordpress/element';
import { useDispatch } from '@wordpress/data';
import apiFetch from '@wordpress/api-fetch';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
	MediaUpload,
	MediaUploadCheck,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	Button,
	Notice,
	CheckboxControl,
	TextControl,
	ToggleControl,
	Spinner,
} from '@wordpress/components';

/**
 * Internal Dependencies
 */
import { parseCsvToTable, parseJsonToTable, unionSheetColumns } from './utils';
import { normalizeContextData, unionContextSheetColumns } from './context-data';
import {
	SortableColumnChip,
	insertSheetFilterBlocks,
	jsonParsedAttributes,
	getEditorTablePreview,
	getMobileHeaderColumnOptions,
	getAllTableColumns,
	getFormatableColumns,
	getValueFormatColumns,
	getAutoSortRowOptions,
	computeAutoSortOrder,
	getExcludedOrder,
	buildAutoColumnOrder,
	columnOrdersEqual,
	mergeColumnOrder,
} from './edit-utils';
import ColumnSortingControls from './column-sorting-controls';
import ColumnOrderPreview from './column-order-preview';
import {
	getDistinctValues,
	isPivotConfigured,
	normalizePivotColumns,
	normalizePivotExtraColumns,
	normalizePivotValueFields,
	pivotSheets,
} from './pivot';
import ValueFormatRules from './value-format-rules';
import MobileValueFormatRules from './mobile-value-format-rules';
import HeaderSpecialBorders from './header-special-borders';
import MobileColumnColors from './mobile-column-colors';

/**
 * Resolve pre-pivot sheets from the active data source.
 *
 * @param {Object}  params                     Params.
 * @param {string}  params.dataSource          Active data source.
 * @param {Object}  params.jsonTable           JSON table attribute.
 * @param {Object}  params.csvTable            CSV table attribute.
 * @param {unknown} params.resolvedContextData Context / Firebase data.
 * @return {Record<string, { columns: string[], rows: Record<string, unknown>[] }>} Sheets map.
 */
function getRawSourceSheets({
	dataSource,
	jsonTable,
	csvTable,
	resolvedContextData,
}) {
	if (dataSource === 'context' || dataSource === 'firebase') {
		return normalizeContextData(resolvedContextData);
	}
	if (dataSource === 'json') {
		if (
			jsonTable?.sheets &&
			typeof jsonTable.sheets === 'object' &&
			!Array.isArray(jsonTable.sheets)
		) {
			return jsonTable.sheets;
		}
		if (
			Array.isArray(jsonTable?.columns) ||
			Array.isArray(jsonTable?.rows)
		) {
			return {
				default: {
					columns: Array.isArray(jsonTable.columns)
						? jsonTable.columns
						: [],
					rows: Array.isArray(jsonTable.rows) ? jsonTable.rows : [],
				},
			};
		}
	}
	if (dataSource === 'csv' && csvTable) {
		return {
			default: {
				columns: Array.isArray(csvTable.columns)
					? csvTable.columns
					: [],
				rows: Array.isArray(csvTable.rows) ? csvTable.rows : [],
			},
		};
	}
	return {};
}

const TEMPLATE = [['prc-block/data-table-render', {}]];

export default function Edit({ clientId, attributes, setAttributes, context }) {
	const {
		dataTableInstanceId,
		dataSource,
		csvTable,
		jsonTable,
		hiddenColumns,
		hiddenColumnsBySheet = {},
		jsonColumns,
		columnOrder,
		defaultJsonSheet,
		mobileHeaderColumn,
		enableColumnSorting = true,
		defaultSortColumn = '',
		defaultSortDirection = 'asc',
		columnSortMode = 'custom',
		autoSortVariable = '',
		autoSortRowIndex = -1,
		autoSortExcludedColumns = [],
		mobileColumnSortMode = 'inherit',
		mobileColumnOrder = [],
		mobileAutoSortVariable = '',
		mobileAutoSortRowIndex = -1,
		mobileAutoSortExcludedColumns = [],
		valuePrefix = '',
		valueSuffix = '',
		valueFormatSheets = [],
		valueFormatExcludedColumns = [],
		valueFormatRules = [],
		mobileValueFormatRules = [],
		enableRowDropdowns = false,
		rowDropdownIdentityColumn = '',
		rowDropdownColumns = [],
		enableHeaderSpecialBorders = false,
		headerSpecialBorderColors = {},
		mobileColumnColors = {},
		firebasePath = '',
		pivotEnabled = false,
		pivotIndexColumn = '',
		pivotColumnField = '',
		pivotColumns = [],
		pivotValueFields = [],
		pivotExtraColumns = [],
	} = attributes;

	const isAutoSort = dataSource === 'json' && columnSortMode === 'auto';
	const isMobileAutoSort =
		dataSource === 'json' && mobileColumnSortMode === 'auto';
	const isMobileConfigured = mobileColumnSortMode !== 'inherit';
	const autoSortExcluded = useMemo(
		() =>
			Array.isArray(autoSortExcludedColumns)
				? autoSortExcludedColumns
				: [],
		[autoSortExcludedColumns]
	);
	const mobileAutoSortExcluded = useMemo(
		() =>
			Array.isArray(mobileAutoSortExcludedColumns)
				? mobileAutoSortExcludedColumns
				: [],
		[mobileAutoSortExcludedColumns]
	);

	const blockProps = useBlockProps();
	const { insertBlocks } = useDispatch('core/block-editor');

	const handleJsonParsed = useCallback(
		(parsed) => {
			const next = jsonParsedAttributes(parsed);
			const { sheetNames, defaultSheet, ...attrs } = next;
			setAttributes(attrs);
			if (sheetNames) {
				insertSheetFilterBlocks(
					clientId,
					insertBlocks,
					sheetNames,
					defaultSheet
				);
			}
		},
		[clientId, insertBlocks, setAttributes]
	);

	useEffect(() => {
		if (
			!dataTableInstanceId &&
			typeof crypto !== 'undefined' &&
			crypto.randomUUID
		) {
			setAttributes({ dataTableInstanceId: crypto.randomUUID() });
		}
	}, [dataTableInstanceId, setAttributes]);

	const pivotActive = isPivotConfigured({
		pivotEnabled,
		pivotIndexColumn,
		pivotColumnField,
		pivotColumns,
		pivotValueFields,
	});

	// Backfill jsonColumns for posts saved before this attribute existed.
	// Skipped while pivot is active — pivoted columns are synced separately.
	useEffect(() => {
		if (pivotActive || dataSource !== 'json') {
			return;
		}

		if (
			jsonTable?.sheets &&
			(!Array.isArray(jsonColumns) || jsonColumns.length === 0)
		) {
			const cols = unionSheetColumns(jsonTable.sheets);
			if (cols.length > 0) {
				setAttributes({ jsonColumns: cols });
			}
			return;
		}

		if (
			Array.isArray(jsonTable?.columns) &&
			jsonTable.columns.length > 0 &&
			(!Array.isArray(jsonColumns) || jsonColumns.length === 0)
		) {
			setAttributes({ jsonColumns: jsonTable.columns });
		}
	}, [pivotActive, dataSource, jsonTable, jsonColumns, setAttributes]);

	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'prc-data-table-controller-inner' },
		{
			template: TEMPLATE,
			templateLock: false,
		}
	);

	const remoteContext = context['remote-data-blocks/remoteData'];
	const providerContext = context['prc-block/dataTableData'];
	const hasRemoteResults =
		remoteContext &&
		Array.isArray(remoteContext.results) &&
		remoteContext.results.length > 0;

	const contextLike = dataSource === 'context' || dataSource === 'firebase';

	const [firebaseData, setFirebaseData] = useState(null);
	const [firebaseStatus, setFirebaseStatus] = useState('idle'); // idle | loading | ready | error
	const [firebaseError, setFirebaseError] = useState('');
	const [columnVisibilitySheet, setColumnVisibilitySheet] = useState('');

	useEffect(() => {
		if (dataSource !== 'firebase') {
			return undefined;
		}

		const path =
			typeof firebasePath === 'string' ? firebasePath.trim() : '';
		if (!path) {
			setFirebaseData(null);
			setFirebaseStatus('idle');
			setFirebaseError('');
			return undefined;
		}

		let cancelled = false;
		const timer = setTimeout(() => {
			setFirebaseStatus('loading');
			setFirebaseError('');
			apiFetch({
				path: `/prc-api/v3/data-table/firebase-data?path=${encodeURIComponent(path)}`,
			})
				.then((data) => {
					if (cancelled) {
						return;
					}
					setFirebaseData(data);
					setFirebaseStatus('ready');
				})
				.catch((err) => {
					if (cancelled) {
						return;
					}
					setFirebaseData(null);
					setFirebaseStatus('error');
					setFirebaseError(
						err?.message ||
							__(
								'Failed to load Firebase data.',
								'data-table-controller'
							)
					);
				});
		}, 400);

		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	}, [dataSource, firebasePath]);

	const resolvedContextData =
		dataSource === 'firebase' ? firebaseData : providerContext;

	const rawSourceSheets = useMemo(
		() =>
			getRawSourceSheets({
				dataSource,
				jsonTable,
				csvTable,
				resolvedContextData,
			}),
		[dataSource, jsonTable, csvTable, resolvedContextData]
	);

	const rawSourceColumns = useMemo(() => {
		if (
			dataSource === 'json' &&
			Array.isArray(jsonTable?.columns) &&
			!jsonTable?.sheets
		) {
			return jsonTable.columns.map(String);
		}
		return unionContextSheetColumns(rawSourceSheets);
	}, [dataSource, jsonTable, rawSourceSheets]);

	const contextSheets = useMemo(
		() => (contextLike ? normalizeContextData(resolvedContextData) : null),
		[contextLike, resolvedContextData]
	);
	const hasContextData =
		contextLike && contextSheets && Object.keys(contextSheets).length > 0;

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

	// Backfill jsonColumns from provider / Firebase context for editor controls.
	// Skipped while pivot is active — pivoted columns are synced separately.
	useEffect(() => {
		if (pivotActive || !contextLike) {
			return;
		}

		const sheets = normalizeContextData(resolvedContextData);
		const cols = unionContextSheetColumns(sheets);
		if (
			cols.length > 0 &&
			(!Array.isArray(jsonColumns) || jsonColumns.length === 0)
		) {
			setAttributes({ jsonColumns: cols });
		}
	}, [
		pivotActive,
		contextLike,
		resolvedContextData,
		jsonColumns,
		setAttributes,
	]);

	// Sync jsonColumns + default sheet from pivot output.
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

	// Insert sheet-filter blocks for pivot value-field sheets.
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

	const onCsvFile = (file) => {
		const reader = new FileReader();
		reader.onload = () => {
			const text = typeof reader.result === 'string' ? reader.result : '';
			const parsed = parseCsvToTable(text);
			setAttributes({ csvTable: parsed, dataSource: 'csv' });
		};
		reader.readAsText(file);
	};

	const onJsonFile = (file) => {
		const reader = new FileReader();
		reader.onload = () => {
			const text = typeof reader.result === 'string' ? reader.result : '';
			handleJsonParsed(parseJsonToTable(text));
		};
		reader.readAsText(file);
	};

	const effectiveOrder = useMemo(
		() =>
			mergeColumnOrder({
				columns: jsonColumns,
				savedOrder: columnOrder,
				hidden: hiddenColumns,
			}),
		[jsonColumns, hiddenColumns, columnOrder]
	);

	const mobileEffectiveOrder = useMemo(
		() =>
			mergeColumnOrder({
				columns: jsonColumns,
				savedOrder: mobileColumnOrder,
				hidden: hiddenColumns,
			}),
		[jsonColumns, hiddenColumns, mobileColumnOrder]
	);

	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		})
	);

	const handleColumnOrderDragEnd = ({ active, over }) => {
		if (!over || active.id === over.id) {
			return;
		}
		const oldIndex = effectiveOrder.indexOf(active.id);
		const newIndex = effectiveOrder.indexOf(over.id);
		if (oldIndex < 0 || newIndex < 0) {
			return;
		}
		const next = arrayMove(effectiveOrder, oldIndex, newIndex);
		setAttributes({ columnOrder: next });
	};

	const handleMobileColumnOrderDragEnd = ({ active, over }) => {
		if (!over || active.id === over.id) {
			return;
		}
		const oldIndex = mobileEffectiveOrder.indexOf(active.id);
		const newIndex = mobileEffectiveOrder.indexOf(over.id);
		if (oldIndex < 0 || newIndex < 0) {
			return;
		}
		const next = arrayMove(mobileEffectiveOrder, oldIndex, newIndex);
		setAttributes({ mobileColumnOrder: next });
	};

	const {
		rowCount,
		totalColCount,
		isMultiSheetJson,
		sheetNames,
		resolvedDefaultSheet,
		activeTable,
	} = getEditorTablePreview({
		dataSource,
		jsonTable,
		csvTable,
		defaultJsonSheet,
		jsonColumns,
		contextData: resolvedContextData,
		overrideSheets: pivotedSheets,
	});

	const previewRows = useMemo(() => activeTable?.rows ?? [], [activeTable]);

	const visibleColumns = useMemo(() => {
		const cols = Array.isArray(jsonColumns) ? jsonColumns : [];
		const hidden = new Set(
			Array.isArray(hiddenColumns) ? hiddenColumns : []
		);
		return cols.filter((col) => !hidden.has(col));
	}, [jsonColumns, hiddenColumns]);

	// Default sort applies on first load against the active/default sheet, which
	// also subtracts per-sheet hides. Keep the dropdown and cleanup in sync.
	const defaultSheetVisibleColumns = useMemo(() => {
		const bySheet =
			hiddenColumnsBySheet &&
			typeof hiddenColumnsBySheet === 'object' &&
			!Array.isArray(hiddenColumnsBySheet)
				? hiddenColumnsBySheet
				: {};
		const sheetHidden = new Set(
			Array.isArray(bySheet[resolvedDefaultSheet])
				? bySheet[resolvedDefaultSheet]
				: []
		);
		if (sheetHidden.size === 0) {
			return visibleColumns;
		}
		return visibleColumns.filter((col) => !sheetHidden.has(col));
	}, [visibleColumns, hiddenColumnsBySheet, resolvedDefaultSheet]);

	const perSheetHiddenColumns = useMemo(() => {
		const bySheet =
			hiddenColumnsBySheet &&
			typeof hiddenColumnsBySheet === 'object' &&
			!Array.isArray(hiddenColumnsBySheet)
				? hiddenColumnsBySheet
				: {};
		return bySheet[columnVisibilitySheet] || [];
	}, [hiddenColumnsBySheet, columnVisibilitySheet]);

	useEffect(() => {
		if (!Array.isArray(sheetNames) || sheetNames.length <= 1) {
			return;
		}
		if (
			!columnVisibilitySheet ||
			!sheetNames.includes(columnVisibilitySheet)
		) {
			setColumnVisibilitySheet(
				resolvedDefaultSheet || sheetNames[0] || ''
			);
		}
	}, [sheetNames, columnVisibilitySheet, resolvedDefaultSheet]);

	useEffect(() => {
		// Empty lists are not authoritative (e.g. Firebase/context still loading,
		// or jsonColumns not yet backfilled). Pruning against them would wipe
		// saved per-sheet visibility.
		if (!Array.isArray(sheetNames) || sheetNames.length === 0) {
			return;
		}
		if (!Array.isArray(jsonColumns) || jsonColumns.length === 0) {
			return;
		}

		const cols = new Set(jsonColumns);
		const names = new Set(sheetNames);
		const bySheet =
			hiddenColumnsBySheet &&
			typeof hiddenColumnsBySheet === 'object' &&
			!Array.isArray(hiddenColumnsBySheet)
				? hiddenColumnsBySheet
				: {};
		let changed = false;
		const next = {};

		Object.entries(bySheet).forEach(([sheet, hidden]) => {
			if (!names.has(sheet)) {
				changed = true;
				return;
			}
			const pruned = (Array.isArray(hidden) ? hidden : []).filter((col) =>
				cols.has(col)
			);
			if (pruned.length !== (Array.isArray(hidden) ? hidden.length : 0)) {
				changed = true;
			}
			if (pruned.length > 0) {
				next[sheet] = pruned;
			} else if (Array.isArray(hidden) && hidden.length > 0) {
				changed = true;
			}
		});

		if (changed) {
			setAttributes({ hiddenColumnsBySheet: next });
		}
	}, [jsonColumns, sheetNames, hiddenColumnsBySheet, setAttributes]);

	useEffect(() => {
		if (!defaultSortColumn) {
			return;
		}
		if (
			!enableColumnSorting ||
			!defaultSheetVisibleColumns.includes(defaultSortColumn)
		) {
			setAttributes({ defaultSortColumn: '' });
		}
	}, [
		defaultSortColumn,
		enableColumnSorting,
		defaultSheetVisibleColumns,
		setAttributes,
	]);

	const autoSortRowOptions = useMemo(
		() =>
			getAutoSortRowOptions({
				rows: previewRows,
				variable: autoSortVariable,
			}),
		[previewRows, autoSortVariable]
	);

	const mobileAutoSortRowOptions = useMemo(
		() =>
			getAutoSortRowOptions({
				rows: previewRows,
				variable: mobileAutoSortVariable,
			}),
		[previewRows, mobileAutoSortVariable]
	);

	const excludedOrder = useMemo(() => {
		if (!isAutoSort) {
			return [];
		}
		return getExcludedOrder({
			columnOrder,
			excluded: autoSortExcluded,
			visible: visibleColumns,
		});
	}, [isAutoSort, columnOrder, autoSortExcluded, visibleColumns]);

	const autoSortedOrder = useMemo(() => {
		if (!isAutoSort || autoSortRowIndex < 0) {
			return [];
		}
		return computeAutoSortOrder({
			rows: previewRows,
			rowIndex: autoSortRowIndex,
			columns: jsonColumns,
			excluded: autoSortExcluded,
			hidden: hiddenColumns,
		});
	}, [
		isAutoSort,
		autoSortRowIndex,
		previewRows,
		jsonColumns,
		autoSortExcluded,
		hiddenColumns,
	]);

	const mobileExcludedOrder = useMemo(() => {
		if (!isMobileAutoSort) {
			return [];
		}
		return getExcludedOrder({
			columnOrder: mobileColumnOrder,
			excluded: mobileAutoSortExcluded,
			visible: visibleColumns,
		});
	}, [
		isMobileAutoSort,
		mobileColumnOrder,
		mobileAutoSortExcluded,
		visibleColumns,
	]);

	const mobileAutoSortedOrder = useMemo(() => {
		if (!isMobileAutoSort || mobileAutoSortRowIndex < 0) {
			return [];
		}
		return computeAutoSortOrder({
			rows: previewRows,
			rowIndex: mobileAutoSortRowIndex,
			columns: jsonColumns,
			excluded: mobileAutoSortExcluded,
			hidden: hiddenColumns,
		});
	}, [
		isMobileAutoSort,
		mobileAutoSortRowIndex,
		previewRows,
		jsonColumns,
		mobileAutoSortExcluded,
		hiddenColumns,
	]);

	const computedAutoColumnOrder = useMemo(() => {
		if (!isAutoSort) {
			return [];
		}
		return buildAutoColumnOrder({
			excludedOrder,
			autoOrder: autoSortedOrder,
		});
	}, [isAutoSort, excludedOrder, autoSortedOrder]);

	const computedMobileAutoColumnOrder = useMemo(() => {
		if (!isMobileAutoSort) {
			return [];
		}
		return buildAutoColumnOrder({
			excludedOrder: mobileExcludedOrder,
			autoOrder: mobileAutoSortedOrder,
		});
	}, [isMobileAutoSort, mobileExcludedOrder, mobileAutoSortedOrder]);

	useEffect(() => {
		if (!isAutoSort || autoSortRowIndex < 0) {
			return;
		}
		if (!columnOrdersEqual(columnOrder, computedAutoColumnOrder)) {
			setAttributes({ columnOrder: computedAutoColumnOrder });
		}
	}, [
		isAutoSort,
		autoSortRowIndex,
		computedAutoColumnOrder,
		columnOrder,
		setAttributes,
	]);

	useEffect(() => {
		if (!isMobileAutoSort || mobileAutoSortRowIndex < 0) {
			return;
		}
		if (
			!columnOrdersEqual(mobileColumnOrder, computedMobileAutoColumnOrder)
		) {
			setAttributes({
				mobileColumnOrder: computedMobileAutoColumnOrder,
			});
		}
	}, [
		isMobileAutoSort,
		mobileAutoSortRowIndex,
		computedMobileAutoColumnOrder,
		mobileColumnOrder,
		setAttributes,
	]);

	const sortReferenceRow =
		autoSortRowIndex >= 0 ? previewRows[autoSortRowIndex] : null;

	const mobileSortReferenceRow =
		mobileAutoSortRowIndex >= 0
			? previewRows[mobileAutoSortRowIndex]
			: null;

	const handleAutoExcludedDragEnd = ({ active, over }) => {
		if (!over || active.id === over.id) {
			return;
		}
		const oldIndex = excludedOrder.indexOf(active.id);
		const newIndex = excludedOrder.indexOf(over.id);
		if (oldIndex < 0 || newIndex < 0) {
			return;
		}
		const nextExcluded = arrayMove(excludedOrder, oldIndex, newIndex);
		setAttributes({
			columnOrder: buildAutoColumnOrder({
				excludedOrder: nextExcluded,
				autoOrder: autoSortedOrder,
			}),
		});
	};

	const handleMobileAutoExcludedDragEnd = ({ active, over }) => {
		if (!over || active.id === over.id) {
			return;
		}
		const oldIndex = mobileExcludedOrder.indexOf(active.id);
		const newIndex = mobileExcludedOrder.indexOf(over.id);
		if (oldIndex < 0 || newIndex < 0) {
			return;
		}
		const nextExcluded = arrayMove(mobileExcludedOrder, oldIndex, newIndex);
		setAttributes({
			mobileColumnOrder: buildAutoColumnOrder({
				excludedOrder: nextExcluded,
				autoOrder: mobileAutoSortedOrder,
			}),
		});
	};

	const jsonColumnList = Array.isArray(jsonColumns) ? jsonColumns : [];
	const showColumnOrderUi =
		(dataSource === 'json' &&
			(isAutoSort
				? excludedOrder.length + autoSortedOrder.length > 1
				: effectiveOrder.length > 1)) ||
		((contextLike || (dataSource === 'csv' && pivotActive)) &&
			effectiveOrder.length > 1);

	const showMobileColumnOrderUi =
		isMobileConfigured &&
		dataSource === 'json' &&
		(isMobileAutoSort
			? mobileExcludedOrder.length + mobileAutoSortedOrder.length > 1
			: mobileEffectiveOrder.length > 1);

	const hiddenCount =
		dataSource === 'json' ||
		contextLike ||
		(dataSource === 'csv' && pivotActive)
			? (hiddenColumns?.length ?? 0)
			: 0;
	const colCount = totalColCount - hiddenCount;

	const mobileHeaderColumnOptions = useMemo(
		() =>
			getMobileHeaderColumnOptions({
				dataSource,
				jsonColumns,
				csvTable,
				hiddenColumns,
				contextData: resolvedContextData,
			}),
		[dataSource, jsonColumns, csvTable, hiddenColumns, resolvedContextData]
	);

	const showMobileHeaderControl = mobileHeaderColumnOptions.length > 1;

	const allTableColumns = useMemo(
		() =>
			getAllTableColumns({
				dataSource,
				jsonColumns,
				csvTable,
				remoteContext,
				contextData: resolvedContextData,
			}),
		[dataSource, jsonColumns, csvTable, remoteContext, resolvedContextData]
	);

	const formatableColumns = useMemo(
		() =>
			getFormatableColumns({
				dataSource,
				jsonColumns,
				csvTable,
				hiddenColumns,
				remoteContext,
				contextData: resolvedContextData,
			}),
		[
			dataSource,
			jsonColumns,
			csvTable,
			hiddenColumns,
			remoteContext,
			resolvedContextData,
		]
	);

	const valueFormatExcluded = useMemo(
		() =>
			Array.isArray(valueFormatExcludedColumns)
				? valueFormatExcludedColumns
				: [],
		[valueFormatExcludedColumns]
	);
	const valueFormatSelectedSheets = useMemo(
		() =>
			Array.isArray(valueFormatSheets)
				? valueFormatSheets.map(String)
				: [],
		[valueFormatSheets]
	);

	const rowDropdownColumnList = useMemo(
		() => (Array.isArray(rowDropdownColumns) ? rowDropdownColumns : []),
		[rowDropdownColumns]
	);

	const valueFormatColumns = useMemo(
		() =>
			getValueFormatColumns({
				formatableColumns,
				enableRowDropdowns,
				rowDropdownColumns: rowDropdownColumnList,
				rowDropdownIdentityColumn,
			}),
		[
			formatableColumns,
			enableRowDropdowns,
			rowDropdownColumnList,
			rowDropdownIdentityColumn,
		]
	);

	const rowDropdownSortableColumns = useMemo(
		() =>
			rowDropdownColumnList.filter(
				(col) => col !== rowDropdownIdentityColumn
			),
		[rowDropdownColumnList, rowDropdownIdentityColumn]
	);

	const handleRowDropdownColumnDragEnd = ({ active, over }) => {
		if (!over || active.id === over.id) {
			return;
		}
		const oldIndex = rowDropdownSortableColumns.indexOf(active.id);
		const newIndex = rowDropdownSortableColumns.indexOf(over.id);
		if (oldIndex < 0 || newIndex < 0) {
			return;
		}
		setAttributes({
			rowDropdownColumns: arrayMove(
				rowDropdownSortableColumns,
				oldIndex,
				newIndex
			),
		});
	};

	// Default dropdown columns to all table columns except the identity column.
	useEffect(() => {
		if (!enableRowDropdowns || allTableColumns.length === 0) {
			return;
		}
		if (rowDropdownColumnList.length > 0) {
			return;
		}
		const initial = allTableColumns.filter(
			(col) => col !== rowDropdownIdentityColumn
		);
		if (initial.length > 0) {
			setAttributes({ rowDropdownColumns: initial });
		}
	}, [
		enableRowDropdowns,
		allTableColumns,
		rowDropdownColumnList.length,
		rowDropdownIdentityColumn,
		setAttributes,
	]);

	// Keep identity column out of dropdown column selection.
	useEffect(() => {
		if (!rowDropdownIdentityColumn || rowDropdownColumnList.length === 0) {
			return;
		}
		if (!rowDropdownColumnList.includes(rowDropdownIdentityColumn)) {
			return;
		}
		setAttributes({
			rowDropdownColumns: rowDropdownColumnList.filter(
				(col) => col !== rowDropdownIdentityColumn
			),
		});
	}, [rowDropdownIdentityColumn, rowDropdownColumnList, setAttributes]);

	const handlePivotColumnsDragEnd = ({ active, over }) => {
		if (!over || active.id === over.id) {
			return;
		}
		const values = normalizedPivotColumns.map((col) => col.value);
		const oldIndex = values.indexOf(active.id);
		const newIndex = values.indexOf(over.id);
		if (oldIndex < 0 || newIndex < 0) {
			return;
		}
		setAttributes({
			pivotColumns: arrayMove(normalizedPivotColumns, oldIndex, newIndex),
		});
	};

	const handlePivotValueFieldsDragEnd = ({ active, over }) => {
		if (!over || active.id === over.id) {
			return;
		}
		const fields = normalizedPivotValueFields.map((entry) => entry.field);
		const oldIndex = fields.indexOf(active.id);
		const newIndex = fields.indexOf(over.id);
		if (oldIndex < 0 || newIndex < 0) {
			return;
		}
		setAttributes({
			pivotValueFields: arrayMove(
				normalizedPivotValueFields,
				oldIndex,
				newIndex
			),
		});
	};

	const handlePivotExtraColumnsDragEnd = ({ active, over }) => {
		if (!over || active.id === over.id) {
			return;
		}
		const oldIndex = normalizedPivotExtraColumns.indexOf(active.id);
		const newIndex = normalizedPivotExtraColumns.indexOf(over.id);
		if (oldIndex < 0 || newIndex < 0) {
			return;
		}
		setAttributes({
			pivotExtraColumns: arrayMove(
				normalizedPivotExtraColumns,
				oldIndex,
				newIndex
			),
		});
	};

	const showPivotPanel = rawSourceColumns.length > 0;

	// Migrate per-column columnValueFormats to global prefix/suffix + exclusions.
	useEffect(() => {
		const legacyFormats = attributes.columnValueFormats;
		if (
			!legacyFormats ||
			typeof legacyFormats !== 'object' ||
			Array.isArray(legacyFormats) ||
			Object.keys(legacyFormats).length === 0
		) {
			return;
		}
		if (valuePrefix || valueSuffix) {
			return;
		}
		const entries = Object.entries(legacyFormats);
		const firstFormat =
			entries[0][1] && typeof entries[0][1] === 'object'
				? entries[0][1]
				: {};
		const prefix = firstFormat.prefix ?? '';
		const suffix = firstFormat.suffix ?? '';
		const excluded = new Set();
		entries.forEach(([col, fmt]) => {
			const row = fmt && typeof fmt === 'object' ? fmt : {};
			if (row.prefix !== prefix || row.suffix !== suffix) {
				excluded.add(col);
			}
		});
		formatableColumns.forEach((col) => {
			if (!legacyFormats[col]) {
				excluded.add(col);
			}
		});
		setAttributes({
			valuePrefix: prefix,
			valueSuffix: suffix,
			valueFormatExcludedColumns: [...excluded],
			columnValueFormats: {},
		});
	}, [
		attributes.columnValueFormats,
		valuePrefix,
		valueSuffix,
		formatableColumns,
		setAttributes,
	]);

	return (
		<div {...blockProps}>
			<InspectorControls>
				<PanelBody
					title={__('Data source', 'data-table-controller')}
					initialOpen
				>
					<SelectControl
						label={__('Source', 'data-table-controller')}
						value={dataSource}
						options={[
							{
								label: __(
									'CSV upload',
									'data-table-controller'
								),
								value: 'csv',
							},
							{
								label: __(
									'JSON upload',
									'data-table-controller'
								),
								value: 'json',
							},
							{
								label: __(
									'Firebase (Realtime DB path)',
									'data-table-controller'
								),
								value: 'firebase',
							},
							{
								label: __(
									'Remote Data Blocks',
									'data-table-controller'
								),
								value: 'remote',
							},
							{
								label: __(
									'Provider (Context)',
									'data-table-controller'
								),
								value: 'context',
							},
						]}
						onChange={(value) =>
							setAttributes({ dataSource: value })
						}
					/>
					{dataSource === 'csv' && (
						<>
							<p className="prc-data-table-controller-help">
								{__(
									'Upload a CSV file (first row = column headers).',
									'data-table-controller'
								)}
							</p>
							<MediaUploadCheck>
								<MediaUpload
									onSelect={(media) => {
										const url = media?.url;
										if (!url) {
											return;
										}
										window
											.fetch(url)
											.then((r) => r.text())
											.then((text) => {
												const parsed =
													parseCsvToTable(text);
												setAttributes({
													csvTable: parsed,
													dataSource: 'csv',
												});
											})
											.catch(() => {});
									}}
									allowedTypes={['text', 'text/csv']}
									render={({ open }) => (
										<Button
											variant="secondary"
											onClick={open}
										>
											{__(
												'Choose CSV from Media Library',
												'data-table-controller'
											)}
										</Button>
									)}
								/>
							</MediaUploadCheck>
							<p className="prc-data-table-controller-help">
								{__(
									'Or pick a local file (not stored in Media Library):',
									'data-table-controller'
								)}
							</p>
							<input
								type="file"
								accept=".csv,text/csv"
								onChange={(e) => {
									const file = e.target.files?.[0];
									if (file) {
										onCsvFile(file);
									}
								}}
							/>
						</>
					)}
					{dataSource === 'json' && (
						<>
							<p className="prc-data-table-controller-help">
								{__(
									'Upload a JSON file (array of objects, keys become column headers). Nested object groups (e.g. Percents / Counts) become separate sheets.',
									'data-table-controller'
								)}
							</p>
							<MediaUploadCheck>
								<MediaUpload
									onSelect={(media) => {
										const url = media?.url;
										if (!url) {
											return;
										}
										window
											.fetch(url)
											.then((r) => r.text())
											.then((text) => {
												handleJsonParsed(
													parseJsonToTable(text)
												);
											})
											.catch(() => {});
									}}
									allowedTypes={['application/json']}
									render={({ open }) => (
										<Button
											variant="secondary"
											onClick={open}
										>
											{__(
												'Choose JSON from Media Library',
												'data-table-controller'
											)}
										</Button>
									)}
								/>
							</MediaUploadCheck>
							<p className="prc-data-table-controller-help">
								{__(
									'Or pick a local file (not stored in Media Library):',
									'data-table-controller'
								)}
							</p>
							<input
								type="file"
								accept=".json,application/json"
								onChange={(e) => {
									const file = e.target.files?.[0];
									if (file) {
										onJsonFile(file);
									}
								}}
							/>
						</>
					)}
					{dataSource === 'firebase' && (
						<>
							<p className="prc-data-table-controller-help">
								{__(
									'Enter a path on the data-table-builder Firebase Realtime Database. Data is fetched with the platform service account and normalized like provider context data.',
									'data-table-controller'
								)}
							</p>
							<TextControl
								label={__(
									'Firebase path',
									'data-table-controller'
								)}
								value={firebasePath}
								onChange={(value) =>
									setAttributes({
										firebasePath: value ?? '',
									})
								}
								placeholder="migrations"
								help={__(
									'Path relative to the data-table-builder Realtime Database root (no leading slash or URL).',
									'data-table-controller'
								)}
							/>
							{firebaseStatus === 'loading' && (
								<p className="prc-data-table-controller-help">
									<Spinner />{' '}
									{__(
										'Loading Firebase data…',
										'data-table-controller'
									)}
								</p>
							)}
							{firebaseStatus === 'error' && (
								<Notice status="error" isDismissible={false}>
									{firebaseError}
								</Notice>
							)}
							{hasContextData ? (
								<p className="prc-data-table-controller-help">
									{sprintf(
										/* translators: 1: number of columns, 2: number of preview rows */
										__(
											'Firebase preview: %1$d columns, %2$d rows (editor shows up to 500 rows; the published table uses the full dataset).',
											'data-table-controller'
										),
										colCount,
										rowCount
									)}
								</p>
							) : (
								firebaseStatus !== 'loading' &&
								firebasePath.trim() === '' && (
									<Notice
										status="warning"
										isDismissible={false}
									>
										{__(
											'Enter a Firebase path to load table data.',
											'data-table-controller'
										)}
									</Notice>
								)
							)}
						</>
					)}
					{dataSource === 'remote' && (
						<>
							<p className="prc-data-table-controller-help">
								{__(
									'Place this block inside a Remote Data Container and select a list query (e.g. Hispanic Origins list).',
									'data-table-controller'
								)}
							</p>
							{!hasRemoteResults && (
								<Notice status="warning" isDismissible={false}>
									{__(
										'No remote list results in context yet. Use the block inside Remote Data.',
										'data-table-controller'
									)}
								</Notice>
							)}
						</>
					)}
					{dataSource === 'context' && (
						<>
							<p className="prc-data-table-controller-help">
								{__(
									'Place this block inside a parent that provides prc-block/dataTableData via block context. Tabular data is resolved at render time; unrecognized shapes can be adapted with the prc_platform_data_table_context_data filter.',
									'data-table-controller'
								)}
							</p>
							{hasContextData ? (
								<p className="prc-data-table-controller-help">
									{sprintf(
										/* translators: 1: number of columns, 2: number of data rows */
										__(
											'Provider preview: %1$d columns, %2$d data rows.',
											'data-table-controller'
										),
										colCount,
										rowCount
									)}
								</p>
							) : (
								<Notice status="warning" isDismissible={false}>
									{__(
										'No provider data in context yet. Nest this block under a provider ancestor, or data will be resolved on the frontend via a custom adapter.',
										'data-table-controller'
									)}
								</Notice>
							)}
						</>
					)}
				</PanelBody>
				{showPivotPanel && (
					<PanelBody
						title={__(
							'Data reshaping (Pivot)',
							'data-table-controller'
						)}
						initialOpen={false}
					>
						<ToggleControl
							label={__(
								'Reshape long data into wide columns',
								'data-table-controller'
							)}
							help={__(
								'Turn rows sharing an identity (e.g. country) into one row, with values of another field (e.g. religion) becoming columns. Each value field becomes a toggleable sheet.',
								'data-table-controller'
							)}
							checked={pivotEnabled}
							onChange={(value) => {
								if (!value) {
									setAttributes({
										pivotEnabled: false,
										pivotExtraColumns: [],
										jsonColumns: rawSourceColumns,
										columnOrder: [],
										defaultJsonSheet: '',
									});
									return;
								}
								setAttributes({ pivotEnabled: true });
							}}
						/>
						{pivotEnabled && (
							<>
								<SelectControl
									label={__(
										'Row identity column',
										'data-table-controller'
									)}
									value={pivotIndexColumn}
									options={[
										{
											label: __(
												'Select a column…',
												'data-table-controller'
											),
											value: '',
										},
										...rawSourceColumns.map((col) => ({
											label: col,
											value: col,
										})),
									]}
									onChange={(value) =>
										setAttributes({
											pivotIndexColumn: value ?? '',
										})
									}
									help={__(
										'Each distinct value becomes one table row (e.g. country).',
										'data-table-controller'
									)}
								/>
								<SelectControl
									label={__(
										'Column field',
										'data-table-controller'
									)}
									value={pivotColumnField}
									options={[
										{
											label: __(
												'Select a column…',
												'data-table-controller'
											),
											value: '',
										},
										...rawSourceColumns.map((col) => ({
											label: col,
											value: col,
										})),
									]}
									onChange={(value) => {
										const nextField = value ?? '';
										const distinct = nextField
											? getDistinctValues(
													rawSourceSheets,
													nextField
												)
											: [];
										const defaultExtras = nextField
											? rawSourceColumns.filter(
													(col) =>
														col !==
															pivotIndexColumn &&
														col !== nextField
												)
											: [];
										setAttributes({
											pivotColumnField: nextField,
											pivotColumns: distinct.map(
												(entry) => ({
													value: entry,
													label: entry,
												})
											),
											pivotExtraColumns: defaultExtras,
										});
									}}
									help={__(
										'Distinct values of this field become columns (e.g. religion).',
										'data-table-controller'
									)}
								/>
								{pivotColumnField &&
									pivotDistinctColumnValues.length > 0 && (
										<>
											<p className="prc-data-table-controller-help">
												{__(
													'Choose which values become columns. Customize the header label for each.',
													'data-table-controller'
												)}
											</p>
											{pivotDistinctColumnValues.map(
												(value) => {
													const selected =
														normalizedPivotColumns.find(
															(col) =>
																col.value ===
																value
														);
													return (
														<div
															key={`pivot-col-${value}`}
															className="prc-data-table-controller-pivot-column"
														>
															<CheckboxControl
																__nextHasNoMarginBottom
																label={value}
																checked={
																	!!selected
																}
																onChange={(
																	checked
																) => {
																	const next =
																		checked
																			? [
																					...normalizedPivotColumns.filter(
																						(
																							col
																						) =>
																							col.value !==
																							value
																					),
																					{
																						value,
																						label:
																							selected?.label ||
																							value,
																					},
																				]
																			: normalizedPivotColumns.filter(
																					(
																						col
																					) =>
																						col.value !==
																						value
																				);
																	setAttributes(
																		{
																			pivotColumns:
																				next,
																		}
																	);
																}}
															/>
															{selected && (
																<TextControl
																	label={__(
																		'Column label',
																		'data-table-controller'
																	)}
																	value={
																		selected.label
																	}
																	onChange={(
																		label
																	) => {
																		setAttributes(
																			{
																				pivotColumns:
																					normalizedPivotColumns.map(
																						(
																							col
																						) =>
																							col.value ===
																							value
																								? {
																										...col,
																										label:
																											label ||
																											value,
																									}
																								: col
																					),
																			}
																		);
																	}}
																/>
															)}
														</div>
													);
												}
											)}
											{normalizedPivotColumns.length >
												1 && (
												<>
													<p className="prc-data-table-controller-column-order__help">
														{__(
															'Drag to set column order after the identity column.',
															'data-table-controller'
														)}
													</p>
													<DndContext
														sensors={sensors}
														collisionDetection={
															closestCenter
														}
														onDragEnd={
															handlePivotColumnsDragEnd
														}
													>
														<SortableContext
															items={normalizedPivotColumns.map(
																(col) =>
																	col.value
															)}
															strategy={
																horizontalListSortingStrategy
															}
														>
															<div
																className="prc-data-table-controller-column-order__list"
																role="list"
															>
																{normalizedPivotColumns.map(
																	(col) => (
																		<SortableColumnChip
																			key={`pivot-order-${col.value}`}
																			id={
																				col.value
																			}
																			label={
																				col.label
																			}
																		/>
																	)
																)}
															</div>
														</SortableContext>
													</DndContext>
												</>
											)}
										</>
									)}
								{pivotExtraColumnOptions.length > 0 && (
									<>
										<p className="prc-data-table-controller-help">
											{__(
												'Also group by these fields (e.g. year, direction). Each unique combination with the row identity becomes its own row. Hide columns via Column visibility if needed.',
												'data-table-controller'
											)}
										</p>
										{pivotExtraColumnOptions.map((col) => (
											<CheckboxControl
												key={`pivot-extra-${col}`}
												__nextHasNoMarginBottom
												label={col}
												checked={normalizedPivotExtraColumns.includes(
													col
												)}
												onChange={(checked) => {
													const next = checked
														? [
																...normalizedPivotExtraColumns.filter(
																	(entry) =>
																		entry !==
																		col
																),
																col,
															]
														: normalizedPivotExtraColumns.filter(
																(entry) =>
																	entry !==
																	col
															);
													setAttributes({
														pivotExtraColumns: next,
													});
												}}
											/>
										))}
										{normalizedPivotExtraColumns.length >
											1 && (
											<>
												<p className="prc-data-table-controller-column-order__help">
													{__(
														'Drag to set column order after the identity column.',
														'data-table-controller'
													)}
												</p>
												<DndContext
													sensors={sensors}
													collisionDetection={
														closestCenter
													}
													onDragEnd={
														handlePivotExtraColumnsDragEnd
													}
												>
													<SortableContext
														items={
															normalizedPivotExtraColumns
														}
														strategy={
															horizontalListSortingStrategy
														}
													>
														<div
															className="prc-data-table-controller-column-order__list"
															role="list"
														>
															{normalizedPivotExtraColumns.map(
																(col) => (
																	<SortableColumnChip
																		key={`pivot-extra-order-${col}`}
																		id={col}
																		label={
																			col
																		}
																	/>
																)
															)}
														</div>
													</SortableContext>
												</DndContext>
											</>
										)}
									</>
								)}
								<p className="prc-data-table-controller-help">
									{__(
										'Choose value fields. Each selected field becomes a sheet readers can toggle between.',
										'data-table-controller'
									)}
								</p>
								{rawSourceColumns.map((field) => {
									const selected =
										normalizedPivotValueFields.find(
											(entry) => entry.field === field
										);
									return (
										<div
											key={`pivot-value-${field}`}
											className="prc-data-table-controller-pivot-column"
										>
											<CheckboxControl
												__nextHasNoMarginBottom
												label={field}
												checked={!!selected}
												onChange={(checked) => {
													const next = checked
														? [
																...normalizedPivotValueFields.filter(
																	(entry) =>
																		entry.field !==
																		field
																),
																{
																	field,
																	label:
																		selected?.label ||
																		field,
																},
															]
														: normalizedPivotValueFields.filter(
																(entry) =>
																	entry.field !==
																	field
															);
													setAttributes({
														pivotValueFields: next,
														...(checked
															? {
																	pivotExtraColumns:
																		pivotExtraColumns.filter(
																			(
																				col
																			) =>
																				col !==
																				field
																		),
																}
															: {}),
													});
												}}
											/>
											{selected && (
												<TextControl
													label={__(
														'Sheet label',
														'data-table-controller'
													)}
													value={selected.label}
													onChange={(label) => {
														setAttributes({
															pivotValueFields:
																normalizedPivotValueFields.map(
																	(entry) =>
																		entry.field ===
																		field
																			? {
																					...entry,
																					label:
																						label ||
																						field,
																				}
																			: entry
																),
														});
													}}
												/>
											)}
										</div>
									);
								})}
								{normalizedPivotValueFields.length > 1 && (
									<>
										<p className="prc-data-table-controller-column-order__help">
											{__(
												'Drag to set sheet order.',
												'data-table-controller'
											)}
										</p>
										<DndContext
											sensors={sensors}
											collisionDetection={closestCenter}
											onDragEnd={
												handlePivotValueFieldsDragEnd
											}
										>
											<SortableContext
												items={normalizedPivotValueFields.map(
													(entry) => entry.field
												)}
												strategy={
													horizontalListSortingStrategy
												}
											>
												<div
													className="prc-data-table-controller-column-order__list"
													role="list"
												>
													{normalizedPivotValueFields.map(
														(entry) => (
															<SortableColumnChip
																key={`pivot-value-order-${entry.field}`}
																id={entry.field}
																label={
																	entry.label
																}
															/>
														)
													)}
												</div>
											</SortableContext>
										</DndContext>
									</>
								)}
							</>
						)}
					</PanelBody>
				)}
				<PanelBody
					title={__('Table behavior', 'data-table-controller')}
					initialOpen={false}
				>
					<ToggleControl
						label={__(
							'Enable column sorting',
							'data-table-controller'
						)}
						help={__(
							'When enabled, readers can sort the table by clicking column headers. Disable to render static, non-sortable headers.',
							'data-table-controller'
						)}
						checked={enableColumnSorting}
						onChange={(value) =>
							setAttributes({
								enableColumnSorting: value,
								...(value ? {} : { defaultSortColumn: '' }),
							})
						}
					/>
					{enableColumnSorting &&
						defaultSheetVisibleColumns.length > 0 && (
							<>
								<SelectControl
									label={__(
										'Default sort column',
										'data-table-controller'
									)}
									help={__(
										'Sort rows by this column when the table first loads. Sheet and filter changes clear the sort.',
										'data-table-controller'
									)}
									value={defaultSortColumn || ''}
									options={[
										{
											label: __(
												'None',
												'data-table-controller'
											),
											value: '',
										},
										...defaultSheetVisibleColumns.map(
											(col) => ({
												label: col,
												value: col,
											})
										),
									]}
									onChange={(value) =>
										setAttributes({
											defaultSortColumn: value || '',
										})
									}
								/>
								{defaultSortColumn && (
									<SelectControl
										label={__(
											'Default sort direction',
											'data-table-controller'
										)}
										value={defaultSortDirection || 'asc'}
										options={[
											{
												label: __(
													'Ascending',
													'data-table-controller'
												),
												value: 'asc',
											},
											{
												label: __(
													'Descending',
													'data-table-controller'
												),
												value: 'desc',
											},
										]}
										onChange={(value) =>
											setAttributes({
												defaultSortDirection:
													value || 'asc',
											})
										}
									/>
								)}
							</>
						)}
				</PanelBody>
				{isMultiSheetJson && sheetNames.length > 0 && (
					<PanelBody
						title={__('Sheets', 'data-table-controller')}
						initialOpen={false}
					>
						<SelectControl
							label={__('Default sheet', 'data-table-controller')}
							value={resolvedDefaultSheet}
							options={sheetNames.map((name) => ({
								label: name,
								value: name,
							}))}
							onChange={(value) =>
								setAttributes({ defaultJsonSheet: value })
							}
						/>
						<p className="prc-data-table-controller-help">
							{sprintf(
								/* translators: %s: comma-separated sheet names */
								__(
									'Detected sheets: %s. Filter buttons toggle between them on the frontend.',
									'data-table-controller'
								),
								sheetNames.join(', ')
							)}
						</p>
					</PanelBody>
				)}
				{(dataSource === 'json' ||
					contextLike ||
					(dataSource === 'csv' && pivotActive)) &&
					jsonColumnList.length > 0 && (
						<PanelBody
							title={__(
								'Column visibility',
								'data-table-controller'
							)}
							initialOpen={false}
						>
							<p className="prc-data-table-controller-help">
								{__(
									'Uncheck columns to hide them from the rendered table on every sheet.',
									'data-table-controller'
								)}
							</p>
							{(Array.isArray(jsonColumns)
								? jsonColumns
								: []
							).map((col) => (
								<CheckboxControl
									key={col}
									__nextHasNoMarginBottom
									label={col}
									checked={!hiddenColumns?.includes(col)}
									onChange={(visible) => {
										const next = visible
											? (hiddenColumns || []).filter(
													(c) => c !== col
												)
											: [...(hiddenColumns || []), col];
										const nextHidden = next;
										setAttributes({
											hiddenColumns: nextHidden,
											columnOrder: (
												columnOrder || []
											).filter(
												(key) =>
													!nextHidden.includes(key)
											),
										});
									}}
								/>
							))}
							{Array.isArray(sheetNames) &&
								sheetNames.length > 1 && (
									<>
										<hr />
										<p className="prc-data-table-controller-help">
											{__(
												'Hide columns only when a specific sheet is active.',
												'data-table-controller'
											)}
										</p>
										<SelectControl
											label={__(
												'Sheet',
												'data-table-controller'
											)}
											value={
												columnVisibilitySheet ||
												resolvedDefaultSheet ||
												sheetNames[0] ||
												''
											}
											options={sheetNames.map((name) => ({
												label: name,
												value: name,
											}))}
											onChange={setColumnVisibilitySheet}
										/>
										{visibleColumns.map((col) => (
											<CheckboxControl
												key={`${columnVisibilitySheet}-${col}`}
												__nextHasNoMarginBottom
												label={col}
												checked={
													!perSheetHiddenColumns.includes(
														col
													)
												}
												onChange={(visible) => {
													const sheet =
														columnVisibilitySheet ||
														resolvedDefaultSheet ||
														sheetNames[0] ||
														'';
													if (!sheet) {
														return;
													}
													const current =
														hiddenColumnsBySheet?.[
															sheet
														] || [];
													const nextHidden = visible
														? current.filter(
																(c) => c !== col
															)
														: [...current, col];
													const nextBySheet = {
														...(hiddenColumnsBySheet ||
															{}),
													};
													if (nextHidden.length > 0) {
														nextBySheet[sheet] =
															nextHidden;
													} else {
														delete nextBySheet[
															sheet
														];
													}
													setAttributes({
														hiddenColumnsBySheet:
															nextBySheet,
													});
												}}
											/>
										))}
									</>
								)}
						</PanelBody>
					)}
				{dataSource === 'json' && jsonColumnList.length > 0 && (
					<PanelBody
						title={__(
							'Column sorting (desktop)',
							'data-table-controller'
						)}
						initialOpen={false}
					>
						<ColumnSortingControls
							sortMode={columnSortMode}
							onSortModeChange={(value) =>
								setAttributes({ columnSortMode: value })
							}
							isAutoSort={isAutoSort}
							autoSortVariable={autoSortVariable}
							autoSortRowIndex={autoSortRowIndex}
							autoSortExcluded={autoSortExcluded}
							autoSortRowOptions={autoSortRowOptions}
							visibleColumns={visibleColumns}
							jsonColumnList={jsonColumnList}
							onAutoSortVariableChange={(value) =>
								setAttributes({
									autoSortVariable: value,
									autoSortRowIndex: -1,
								})
							}
							onAutoSortRowIndexChange={(value) =>
								setAttributes({
									autoSortRowIndex:
										value === '' ? -1 : parseInt(value, 10),
								})
							}
							onAutoSortExcludedChange={(next) =>
								setAttributes({
									autoSortExcludedColumns: next,
								})
							}
						/>
					</PanelBody>
				)}
				{dataSource === 'json' && jsonColumnList.length > 0 && (
					<PanelBody
						title={__(
							'Column sorting (mobile)',
							'data-table-controller'
						)}
						initialOpen={false}
					>
						<ColumnSortingControls
							sortMode={mobileColumnSortMode}
							includeInheritOption
							onSortModeChange={(value) => {
								if (
									value === 'custom' &&
									mobileColumnSortMode === 'inherit'
								) {
									setAttributes({
										mobileColumnSortMode: value,
										mobileColumnOrder: effectiveOrder,
									});
									return;
								}
								if (value === 'auto') {
									setAttributes({
										mobileColumnSortMode: value,
										mobileColumnOrder: [],
										mobileAutoSortRowIndex: -1,
									});
									return;
								}
								setAttributes({ mobileColumnSortMode: value });
							}}
							isAutoSort={isMobileAutoSort}
							autoSortVariable={mobileAutoSortVariable}
							autoSortRowIndex={mobileAutoSortRowIndex}
							autoSortExcluded={mobileAutoSortExcluded}
							autoSortRowOptions={mobileAutoSortRowOptions}
							visibleColumns={visibleColumns}
							jsonColumnList={jsonColumnList}
							excludeCheckboxKeyPrefix="mobile-auto-exclude"
							onAutoSortVariableChange={(value) =>
								setAttributes({
									mobileAutoSortVariable: value,
									mobileAutoSortRowIndex: -1,
								})
							}
							onAutoSortRowIndexChange={(value) =>
								setAttributes({
									mobileAutoSortRowIndex:
										value === '' ? -1 : parseInt(value, 10),
								})
							}
							onAutoSortExcludedChange={(next) =>
								setAttributes({
									mobileAutoSortExcludedColumns: next,
								})
							}
						/>
					</PanelBody>
				)}
				{showMobileHeaderControl && (
					<PanelBody
						title={__('Mobile layout', 'data-table-controller')}
						initialOpen={false}
					>
						<SelectControl
							label={__(
								'Mobile card header column',
								'data-table-controller'
							)}
							value={mobileHeaderColumn || ''}
							options={mobileHeaderColumnOptions}
							onChange={(value) =>
								setAttributes({ mobileHeaderColumn: value })
							}
							help={__(
								'On small screens, each row becomes a card with this column as the title.',
								'data-table-controller'
							)}
						/>
					</PanelBody>
				)}
				<PanelBody
					title={__('Row dropdowns', 'data-table-controller')}
					initialOpen={false}
				>
					<ToggleControl
						label={__(
							'Enable row dropdown tables',
							'data-table-controller'
						)}
						help={__(
							'When enabled, each row can expand to show all dataset rows that share the same identity column value (including filtered-out rows).',
							'data-table-controller'
						)}
						checked={enableRowDropdowns}
						onChange={(value) =>
							setAttributes({ enableRowDropdowns: value })
						}
					/>
					{enableRowDropdowns && (
						<SelectControl
							label={__(
								'Row identity column',
								'data-table-controller'
							)}
							value={rowDropdownIdentityColumn || ''}
							options={[
								{
									label: __(
										'Select column…',
										'data-table-controller'
									),
									value: '',
								},
								...allTableColumns.map((col) => ({
									label: col,
									value: col,
								})),
							]}
							onChange={(value) =>
								setAttributes({
									rowDropdownIdentityColumn: value ?? '',
								})
							}
							help={__(
								'Rows with the same value in this column are grouped; expanding a row shows every matching row from the full dataset.',
								'data-table-controller'
							)}
						/>
					)}
					{enableRowDropdowns && allTableColumns.length > 0 && (
						<>
							<p className="prc-data-table-controller-help">
								{__(
									'Choose which columns appear in the expandable dropdown tables. The identity column is always excluded.',
									'data-table-controller'
								)}
							</p>
							{allTableColumns.map((col) => (
								<CheckboxControl
									key={`row-dropdown-col-${col}`}
									__nextHasNoMarginBottom
									label={col}
									checked={
										col !== rowDropdownIdentityColumn &&
										rowDropdownColumnList.includes(col)
									}
									disabled={col === rowDropdownIdentityColumn}
									onChange={(visible) => {
										const next = visible
											? [
													...rowDropdownColumnList.filter(
														(c) => c !== col
													),
													col,
												]
											: rowDropdownColumnList.filter(
													(c) => c !== col
												);
										setAttributes({
											rowDropdownColumns: next,
										});
									}}
								/>
							))}
							{rowDropdownSortableColumns.length > 1 && (
								<>
									<p className="prc-data-table-controller-column-order__help">
										{__(
											'Drag to set column order in dropdown rows.',
											'data-table-controller'
										)}
									</p>
									<DndContext
										sensors={sensors}
										collisionDetection={closestCenter}
										onDragEnd={
											handleRowDropdownColumnDragEnd
										}
									>
										<SortableContext
											items={rowDropdownSortableColumns}
											strategy={
												horizontalListSortingStrategy
											}
										>
											<div
												className="prc-data-table-controller-column-order__list"
												role="list"
											>
												{rowDropdownSortableColumns.map(
													(colKey) => (
														<SortableColumnChip
															key={`row-dropdown-order-${colKey}`}
															id={colKey}
															label={colKey}
														/>
													)
												)}
											</div>
										</SortableContext>
									</DndContext>
								</>
							)}
						</>
					)}
				</PanelBody>
				<PanelBody
					title={__('Value formatting', 'data-table-controller')}
					initialOpen={false}
				>
					<TextControl
						label={__('Prefix', 'data-table-controller')}
						value={valuePrefix}
						onChange={(value) =>
							setAttributes({ valuePrefix: value ?? '' })
						}
						help={__(
							'Added before each value, e.g. $',
							'data-table-controller'
						)}
					/>
					<TextControl
						label={__('Suffix', 'data-table-controller')}
						value={valueSuffix}
						onChange={(value) =>
							setAttributes({ valueSuffix: value ?? '' })
						}
						help={__(
							'Added after each value, e.g. %',
							'data-table-controller'
						)}
					/>
					{Array.isArray(sheetNames) && sheetNames.length > 1 && (
						<>
							<p className="prc-data-table-controller-help">
								{__(
									'Sheets (none selected = all sheets)',
									'data-table-controller'
								)}
							</p>
							{sheetNames.map((sheet) => (
								<CheckboxControl
									key={`value-format-sheet-${sheet}`}
									__nextHasNoMarginBottom
									label={sheet}
									checked={valueFormatSelectedSheets.includes(
										sheet
									)}
									onChange={(checked) => {
										const next = checked
											? [
													...valueFormatSelectedSheets.filter(
														(s) => s !== sheet
													),
													sheet,
												]
											: valueFormatSelectedSheets.filter(
													(s) => s !== sheet
												);
										setAttributes({
											valueFormatSheets: next,
										});
									}}
								/>
							))}
						</>
					)}
					{valueFormatColumns.length > 0 && (
						<>
							<p className="prc-data-table-controller-help">
								{__(
									'Check columns to exclude from prefix/suffix (e.g. row labels). Includes columns shown only in row dropdowns. Non-empty cells only; sorting and filtering use raw values.',
									'data-table-controller'
								)}
							</p>
							{valueFormatColumns.map((col) => (
								<CheckboxControl
									key={`value-format-exclude-${col}`}
									__nextHasNoMarginBottom
									label={sprintf(
										/* translators: %s: column name */
										__(
											'Exclude %s',
											'data-table-controller'
										),
										col
									)}
									checked={valueFormatExcluded.includes(col)}
									onChange={(excluded) => {
										const next = excluded
											? [...valueFormatExcluded, col]
											: valueFormatExcluded.filter(
													(c) => c !== col
												);
										setAttributes({
											valueFormatExcludedColumns: next,
										});
									}}
								/>
							))}
						</>
					)}
					{dataSource === 'remote' &&
						!hasRemoteResults &&
						valueFormatColumns.length === 0 && (
							<p className="prc-data-table-controller-help">
								{__(
									'Load remote data to choose columns to exclude from formatting.',
									'data-table-controller'
								)}
							</p>
						)}
					{dataSource === 'context' &&
						!hasContextData &&
						valueFormatColumns.length === 0 && (
							<p className="prc-data-table-controller-help">
								{__(
									'Load provider context data to choose columns to exclude from formatting.',
									'data-table-controller'
								)}
							</p>
						)}
					{dataSource === 'firebase' &&
						!hasContextData &&
						valueFormatColumns.length === 0 && (
							<p className="prc-data-table-controller-help">
								{__(
									'Load Firebase data to choose columns to exclude from formatting.',
									'data-table-controller'
								)}
							</p>
						)}
					<ValueFormatRules
						rules={valueFormatRules}
						sheetNames={sheetNames}
						formatableColumns={valueFormatColumns}
						onChange={(nextRules) =>
							setAttributes({ valueFormatRules: nextRules })
						}
					/>
				</PanelBody>
				<PanelBody
					title={__(
						'Mobile value formatting',
						'data-table-controller'
					)}
					initialOpen={false}
				>
					<p className="prc-data-table-controller-help">
						{__(
							'Mobile-only formatting: conditional replacements override Value formatting replacements on small screens; k/M/B/T abbreviation for numbers ≥ 1,000. Display only; sorting and filtering use raw values.',
							'data-table-controller'
						)}
					</p>
					<MobileValueFormatRules
						rules={mobileValueFormatRules}
						sheetNames={sheetNames}
						formatableColumns={valueFormatColumns}
						onChange={(nextRules) =>
							setAttributes({
								mobileValueFormatRules: nextRules,
							})
						}
					/>
				</PanelBody>
				<PanelBody
					title={__('Header styling', 'data-table-controller')}
					initialOpen={false}
				>
					<HeaderSpecialBorders
						enabled={enableHeaderSpecialBorders}
						colors={headerSpecialBorderColors}
						columns={formatableColumns}
						onEnabledChange={(value) =>
							setAttributes({ enableHeaderSpecialBorders: value })
						}
						onColorsChange={(nextColors) =>
							setAttributes({
								headerSpecialBorderColors: nextColors,
							})
						}
					/>
				</PanelBody>
				<PanelBody
					title={__('Mobile styling', 'data-table-controller')}
					initialOpen={false}
				>
					<MobileColumnColors
						colors={mobileColumnColors}
						columns={formatableColumns}
						onColorsChange={(nextColors) =>
							setAttributes({ mobileColumnColors: nextColors })
						}
					/>
				</PanelBody>
			</InspectorControls>
			{(dataSource === 'csv' || dataSource === 'json' || contextLike) && (
				<p className="prc-data-table-controller-preview-summary">
					{sprintf(
						/* translators: 1: number of columns, 2: number of data rows */
						__(
							'Table preview: %1$d columns, %2$d data rows (plus header).',
							'data-table-controller'
						),
						colCount,
						rowCount
					)}
				</p>
			)}
			{showColumnOrderUi && (
				<ColumnOrderPreview
					title={__('Desktop', 'data-table-controller')}
					isAutoSort={isAutoSort}
					effectiveOrder={effectiveOrder}
					excludedOrder={excludedOrder}
					autoSortedOrder={autoSortedOrder}
					sortReferenceRow={sortReferenceRow}
					sensors={sensors}
					onCustomDragEnd={handleColumnOrderDragEnd}
					onAutoExcludedDragEnd={handleAutoExcludedDragEnd}
				/>
			)}
			{showMobileColumnOrderUi && (
				<ColumnOrderPreview
					title={__('Mobile', 'data-table-controller')}
					isAutoSort={isMobileAutoSort}
					effectiveOrder={mobileEffectiveOrder}
					excludedOrder={mobileExcludedOrder}
					autoSortedOrder={mobileAutoSortedOrder}
					sortReferenceRow={mobileSortReferenceRow}
					sensors={sensors}
					onCustomDragEnd={handleMobileColumnOrderDragEnd}
					onAutoExcludedDragEnd={handleMobileAutoExcludedDragEnd}
				/>
			)}
			<div {...innerBlocksProps} />
		</div>
	);
}
