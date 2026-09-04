/* eslint-disable max-lines */
/* eslint-disable max-lines-per-function */
/* global FileReader */
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
	TextControl,
	ToggleControl,
	Spinner,
} from '@wordpress/components';

/**
 * Internal Dependencies
 */
import { parseCsvToTable, parseJsonToTable } from './lib/utils';
import {
	normalizeContextData,
	unionContextSheetColumns,
} from './lib/context-data';
import {
	insertSheetFilterBlocks,
	jsonParsedAttributes,
	getEditorTablePreview,
	getMobileHeaderColumnOptions,
	getAllTableColumns,
	getFormatableColumns,
	getValueFormatColumns,
} from './lib/edit-utils';
import ColumnSortingPanel from './inspector/column-sorting-panel';
import ColumnOrderPreview from './controls/column-order-preview';
import { useColumnOrdering } from './hooks/use-column-ordering';
import { isPivotConfigured } from './lib/pivot';
import { usePivot } from './hooks/use-pivot';
import { useSyncedTableAttributes } from './hooks/use-synced-table-attributes';
import PivotPanel from './inspector/pivot-panel';
import TableBehaviorPanel from './inspector/table-behavior-panel';
import SheetsPanel from './inspector/sheets-panel';
import ColumnVisibilityPanel from './inspector/column-visibility-panel';
import MobileLayoutPanel from './inspector/mobile-layout-panel';
import ValueFormattingPanel from './inspector/value-formatting-panel';
import TextAlignmentPanel from './inspector/text-alignment-panel';
import HeaderSpecialBorders from './controls/header-special-borders';
import MobileColumnColors from './controls/mobile-column-colors';
import MobileColumnColorsLocked from './controls/mobile-column-colors-locked';
import BoldColumns from './controls/bold-columns';
import RowDropdownControls from './inspector/row-dropdown-controls';

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
		hiddenColumnHeaders = [],
		tableTextAlign = 'center',
		tableHeaderTextAlign = '',
		boldColumns = [],
		jsonColumns,
		columnOrder,
		defaultJsonSheet,
		mobileHeaderColumn,
		mobileHiddenColumns = [],
		enableColumnSorting = true,
		defaultSortColumn = '',
		defaultSortDirection = 'asc',
		columnSortMode = 'custom',
		autoSortVariable = '',
		autoSortRowIndex = -1,
		autoSortRowValue = '',
		autoSortExcludedColumns = [],
		mobileColumnSortMode = 'inherit',
		mobileColumnOrder = [],
		mobileAutoSortVariable = '',
		mobileAutoSortRowIndex = -1,
		mobileAutoSortRowValue = '',
		mobileAutoSortExcludedColumns = [],
		valuePrefix = '',
		valueSuffix = '',
		valueFormatSheets = [],
		valueFormatExcludedColumns = [],
		valueFormatRules = [],
		enableDesktopAbbreviation = false,
		valueAbbreviationRules = [],
		mobileValueFormatRules = [],
		enableRowDropdowns = false,
		rowDropdownIdentityColumn = '',
		rowDropdownColumns = [],
		rowDropdownColumnsBySheet = {},
		enableHeaderSpecialBorders = false,
		mobileColumnColors = {},
		mobileColumnHeaders = {},
		firebasePath = '',
		pivotEnabled = false,
		pivotIndexColumn = '',
		pivotColumnField = '',
		pivotColumns = [],
		pivotValueFields = [],
		pivotExtraColumns = [],
		allowDataDownload = true,
	} = attributes;

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

	const contextLike = dataSource === 'context' || dataSource === 'firebase';
	const supportsColumnSortingSources =
		dataSource === 'json' ||
		contextLike ||
		(dataSource === 'csv' && pivotActive);

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

	const [firebaseData, setFirebaseData] = useState(null);
	const [firebaseStatus, setFirebaseStatus] = useState('idle'); // idle | loading | ready | error
	const [firebaseError, setFirebaseError] = useState('');

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

	const contextMobileCellBackground =
		dataSource === 'context' &&
		providerContext &&
		typeof providerContext === 'object' &&
		typeof providerContext.mobileCellBackground === 'string'
			? providerContext.mobileCellBackground.trim()
			: '';

	const contextMobileWorldCellBackground =
		dataSource === 'context' &&
		providerContext &&
		typeof providerContext === 'object' &&
		typeof providerContext.mobileWorldCellBackground === 'string'
			? providerContext.mobileWorldCellBackground.trim()
			: '';

	const contextMobileHeaderFormat =
		dataSource === 'context' &&
		providerContext &&
		typeof providerContext === 'object' &&
		providerContext.mobileHeaderFormat &&
		typeof providerContext.mobileHeaderFormat === 'object' &&
		typeof providerContext.mobileHeaderFormat.nameColumn === 'string' &&
		typeof providerContext.mobileHeaderFormat.yearColumn === 'string'
			? {
					nameColumn:
						providerContext.mobileHeaderFormat.nameColumn.trim(),
					yearColumn:
						providerContext.mobileHeaderFormat.yearColumn.trim(),
				}
			: null;

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

	const {
		pivotedSheets,
		normalizedPivotColumns,
		normalizedPivotValueFields,
		normalizedPivotExtraColumns,
		pivotDistinctColumnValues,
		pivotExtraColumnOptions,
	} = usePivot({
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
	});

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

	const desktopOrdering = useColumnOrdering({
		viewport: 'desktop',
		enabled: supportsColumnSortingSources,
		sortMode: columnSortMode,
		autoSortVariable,
		autoSortRowIndex,
		autoSortRowValue,
		autoSortExcludedColumns,
		savedOrder: columnOrder,
		jsonColumns,
		hiddenColumns,
		visibleColumns,
		previewRows,
		setAttributes,
	});
	const mobileOrdering = useColumnOrdering({
		viewport: 'mobile',
		enabled: supportsColumnSortingSources,
		sortMode: mobileColumnSortMode,
		autoSortVariable: mobileAutoSortVariable,
		autoSortRowIndex: mobileAutoSortRowIndex,
		autoSortRowValue: mobileAutoSortRowValue,
		autoSortExcludedColumns: mobileAutoSortExcludedColumns,
		savedOrder: mobileColumnOrder,
		jsonColumns,
		hiddenColumns,
		visibleColumns,
		previewRows,
		setAttributes,
	});

	const jsonColumnList = Array.isArray(jsonColumns) ? jsonColumns : [];

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
				rowDropdownColumnsBySheet,
				rowDropdownIdentityColumn,
			}),
		[
			formatableColumns,
			enableRowDropdowns,
			rowDropdownColumnList,
			rowDropdownColumnsBySheet,
			rowDropdownIdentityColumn,
		]
	);

	useSyncedTableAttributes({
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
		columnValueFormats: attributes.columnValueFormats,
		valuePrefix,
		valueSuffix,
		formatableColumns,
		mobileValueFormatRules,
		valueAbbreviationRules,
		setAttributes,
	});

	return (
		<div {...blockProps}>
			<InspectorControls>
				<PanelBody
					title={__('Data source', 'data-table-controller')}
					initialOpen
				>
					<SelectControl
						__next40pxDefaultSize
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
					<ToggleControl
						label={__(
							'Allow data download',
							'data-table-controller'
						)}
						help={__(
							'Show a visitor-facing link to download the current table as a CSV file.',
							'data-table-controller'
						)}
						checked={allowDataDownload}
						onChange={(value) =>
							setAttributes({ allowDataDownload: value })
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
											__next40pxDefaultSize
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
											__next40pxDefaultSize
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
								__next40pxDefaultSize
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
				<PivotPanel
					pivotEnabled={pivotEnabled}
					pivotIndexColumn={pivotIndexColumn}
					pivotColumnField={pivotColumnField}
					pivotExtraColumns={pivotExtraColumns}
					rawSourceColumns={rawSourceColumns}
					rawSourceSheets={rawSourceSheets}
					normalizedPivotColumns={normalizedPivotColumns}
					normalizedPivotValueFields={normalizedPivotValueFields}
					normalizedPivotExtraColumns={normalizedPivotExtraColumns}
					pivotDistinctColumnValues={pivotDistinctColumnValues}
					pivotExtraColumnOptions={pivotExtraColumnOptions}
					setAttributes={setAttributes}
				/>
				<TableBehaviorPanel
					enableColumnSorting={enableColumnSorting}
					defaultSheetVisibleColumns={defaultSheetVisibleColumns}
					defaultSortColumn={defaultSortColumn}
					defaultSortDirection={defaultSortDirection}
					setAttributes={setAttributes}
				/>
				<SheetsPanel
					isMultiSheetJson={isMultiSheetJson}
					sheetNames={sheetNames}
					resolvedDefaultSheet={resolvedDefaultSheet}
					setAttributes={setAttributes}
				/>
				<ColumnVisibilityPanel
					enabled={
						supportsColumnSortingSources &&
						jsonColumnList.length > 0
					}
					jsonColumnList={jsonColumnList}
					hiddenColumns={hiddenColumns}
					columnOrder={columnOrder}
					visibleColumns={visibleColumns}
					hiddenColumnHeaders={hiddenColumnHeaders}
					sheetNames={sheetNames}
					resolvedDefaultSheet={resolvedDefaultSheet}
					hiddenColumnsBySheet={hiddenColumnsBySheet}
					setAttributes={setAttributes}
				/>
				<ColumnSortingPanel
					viewport="desktop"
					enabled={
						supportsColumnSortingSources &&
						jsonColumnList.length > 0
					}
					sortMode={columnSortMode}
					isAutoSort={desktopOrdering.isAutoSort}
					autoSortVariable={autoSortVariable}
					autoSortRowIndex={desktopOrdering.controlRowIndex}
					autoSortExcluded={desktopOrdering.autoSortExcluded}
					autoSortRowOptions={desktopOrdering.autoSortRowOptions}
					visibleColumns={visibleColumns}
					jsonColumnList={jsonColumnList}
					previewRows={previewRows}
					setAttributes={setAttributes}
				/>
				<ColumnSortingPanel
					viewport="mobile"
					enabled={
						supportsColumnSortingSources &&
						jsonColumnList.length > 0
					}
					sortMode={mobileColumnSortMode}
					isAutoSort={mobileOrdering.isAutoSort}
					autoSortVariable={mobileAutoSortVariable}
					autoSortRowIndex={mobileOrdering.controlRowIndex}
					autoSortExcluded={mobileOrdering.autoSortExcluded}
					autoSortRowOptions={mobileOrdering.autoSortRowOptions}
					visibleColumns={visibleColumns}
					jsonColumnList={jsonColumnList}
					previewRows={previewRows}
					desktopEffectiveOrder={desktopOrdering.effectiveOrder}
					setAttributes={setAttributes}
				/>
				<MobileLayoutPanel
					enabled={visibleColumns.length > 0}
					contextMobileHeaderFormat={contextMobileHeaderFormat}
					mobileHeaderColumnOptions={mobileHeaderColumnOptions}
					mobileHeaderColumn={mobileHeaderColumn}
					visibleColumns={visibleColumns}
					mobileHiddenColumns={mobileHiddenColumns}
					mobileColumnHeaders={mobileColumnHeaders}
					setAttributes={setAttributes}
				/>
				<RowDropdownControls
					enableRowDropdowns={enableRowDropdowns}
					setAttributes={setAttributes}
					rowDropdownIdentityColumn={rowDropdownIdentityColumn}
					rowDropdownColumns={rowDropdownColumns}
					rowDropdownColumnsBySheet={rowDropdownColumnsBySheet}
					allTableColumns={allTableColumns}
					sheetNames={sheetNames}
					resolvedDefaultSheet={resolvedDefaultSheet}
				/>
				<ValueFormattingPanel
					valuePrefix={valuePrefix}
					valueSuffix={valueSuffix}
					valueFormatSheets={valueFormatSheets}
					valueFormatExcludedColumns={valueFormatExcludedColumns}
					valueFormatColumns={valueFormatColumns}
					sheetNames={sheetNames}
					dataSource={dataSource}
					hasRemoteResults={hasRemoteResults}
					hasContextData={hasContextData}
					valueFormatRules={valueFormatRules}
					enableDesktopAbbreviation={enableDesktopAbbreviation}
					valueAbbreviationRules={valueAbbreviationRules}
					mobileValueFormatRules={mobileValueFormatRules}
					setAttributes={setAttributes}
				/>
				<PanelBody
					title={__('Header styling', 'data-table-controller')}
					initialOpen={false}
				>
					<HeaderSpecialBorders
						enabled={enableHeaderSpecialBorders}
						onEnabledChange={(value) =>
							setAttributes({ enableHeaderSpecialBorders: value })
						}
					/>
				</PanelBody>
				<TextAlignmentPanel
					tableHeaderTextAlign={tableHeaderTextAlign}
					tableTextAlign={tableTextAlign}
					setAttributes={setAttributes}
				/>
				<PanelBody
					title={__('Bold columns', 'data-table-controller')}
					initialOpen={false}
				>
					<BoldColumns
						boldColumns={boldColumns}
						columns={formatableColumns}
						onBoldColumnsChange={(nextBoldColumns) =>
							setAttributes({ boldColumns: nextBoldColumns })
						}
					/>
				</PanelBody>
				<PanelBody
					title={__('Mobile styling', 'data-table-controller')}
					initialOpen={false}
				>
					{contextMobileCellBackground ? (
						<MobileColumnColorsLocked
							background={contextMobileCellBackground}
							worldBackground={contextMobileWorldCellBackground}
						/>
					) : (
						<MobileColumnColors
							colors={mobileColumnColors}
							columns={formatableColumns}
							onColorsChange={(nextColors) =>
								setAttributes({
									mobileColumnColors: nextColors,
								})
							}
						/>
					)}
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
			{desktopOrdering.showOrderUi && (
				<ColumnOrderPreview
					title={__('Desktop', 'data-table-controller')}
					isAutoSort={desktopOrdering.isAutoSort}
					effectiveOrder={desktopOrdering.effectiveOrder}
					excludedBefore={desktopOrdering.excludedBefore}
					excludedAfter={desktopOrdering.excludedAfter}
					autoSortedOrder={desktopOrdering.autoSortedOrder}
					sortReferenceRow={desktopOrdering.sortReferenceRow}
					onCustomDragEnd={desktopOrdering.handleCustomDragEnd}
					onAutoExcludedDragEnd={
						desktopOrdering.handleAutoExcludedDragEnd
					}
				/>
			)}
			{mobileOrdering.showOrderUi && (
				<ColumnOrderPreview
					title={__('Mobile', 'data-table-controller')}
					isAutoSort={mobileOrdering.isAutoSort}
					effectiveOrder={mobileOrdering.effectiveOrder}
					excludedBefore={mobileOrdering.excludedBefore}
					excludedAfter={mobileOrdering.excludedAfter}
					autoSortedOrder={mobileOrdering.autoSortedOrder}
					sortReferenceRow={mobileOrdering.sortReferenceRow}
					onCustomDragEnd={mobileOrdering.handleCustomDragEnd}
					onAutoExcludedDragEnd={
						mobileOrdering.handleAutoExcludedDragEnd
					}
				/>
			)}
			<div {...innerBlocksProps} />
			{allowDataDownload && (
				<>
					<hr className="prc-data-table-controller__download-hr" />
					<div className="prc-data-table-controller__download">
						<span
							className="has-sans-serif-font-family"
							aria-hidden="true"
						>
							{__(
								'Download data as .csv',
								'data-table-controller'
							)}
						</span>
					</div>
				</>
			)}
		</div>
	);
}
