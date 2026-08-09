/**
 * WordPress Dependencies
 */
import { __, sprintf } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	SelectControl,
	ToggleControl,
	Button,
} from '@wordpress/components';
import { useSelect, useDispatch } from '@wordpress/data';
import { useMemo, useState } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';

/**
 * Internal Dependencies
 */
import { sortedUniques } from '../data-table-key/edit-utils';
import { useControllerTableData } from '../data-table-key/use-controller-table';

const TEMPLATE = [
	[
		'prc-block/data-table-filter',
		{
			filterType: 'column-include-only',
			label: __('Option 1', 'data-table-filter-select'),
		},
	],
];

/**
 * @param {string[]}                  columns Column names.
 * @param {Record<string, unknown>[]} rows    Table rows.
 * @return {{ label: string, value: string }[]} Select options with unique counts.
 */
function getImportColumnOptions(columns, rows) {
	const options = [];
	for (const col of columns) {
		if (col === 'row_id') {
			continue;
		}
		const n = sortedUniques(rows, col).length;
		if (n > 0) {
			options.push({
				label: sprintf(
					/* translators: 1: column name, 2: number of unique values */
					__('%1$s (%2$d)', 'data-table-filter-select'),
					col,
					n
				),
				value: col,
			});
		}
	}
	return options;
}

/**
 * @param {number} importedCount Imported option count.
 * @param {string} filterColumn  Source column name.
 * @return {string} Editor canvas note.
 */
function getEditorNote(importedCount, filterColumn) {
	if (importedCount > 0) {
		return sprintf(
			/* translators: 1: number of options, 2: column name */
			__(
				'%1$d options imported from “%2$s”. Add manual options below if needed. On the frontend these render as a single dropdown.',
				'data-table-filter-select'
			),
			importedCount,
			filterColumn
		);
	}

	return __(
		'Configure each option below, or import options from a table column in the sidebar. On the frontend these render as a single dropdown.',
		'data-table-filter-select'
	);
}

function DropdownSettingsPanel({
	placeholder,
	includeResetOption,
	resetLabel,
	defaultValue,
	isFullWidth,
	hasClearIcon,
	instanceId,
	defaultValueOptions,
	setAttributes,
}) {
	return (
		<PanelBody
			title={__('Dropdown settings', 'data-table-filter-select')}
			initialOpen
		>
			<TextControl
				label={__('Placeholder', 'data-table-filter-select')}
				help={__(
					'Text shown inside the dropdown when no filter is selected.',
					'data-table-filter-select'
				)}
				value={placeholder}
				onChange={(v) => setAttributes({ placeholder: v })}
			/>
			<ToggleControl
				label={__('Make full width', 'data-table-filter-select')}
				help={__(
					'Stretch the dropdown to fill the width of its parent block.',
					'data-table-filter-select'
				)}
				checked={isFullWidth}
				onChange={(v) => setAttributes({ isFullWidth: v })}
			/>
			<ToggleControl
				label={__('Include reset option', 'data-table-filter-select')}
				help={__(
					'Add an option that clears the filter and shows all rows.',
					'data-table-filter-select'
				)}
				checked={includeResetOption}
				onChange={(v) => setAttributes({ includeResetOption: v })}
			/>
			<ToggleControl
				label={__('Show clear icon', 'data-table-filter-select')}
				help={__(
					'Display a clear icon when a filter is selected. Clicking it clears the active filter.',
					'data-table-filter-select'
				)}
				checked={hasClearIcon}
				onChange={(v) => setAttributes({ hasClearIcon: v })}
			/>
			{includeResetOption && (
				<TextControl
					label={__('Reset option label', 'data-table-filter-select')}
					value={resetLabel}
					onChange={(v) => setAttributes({ resetLabel: v })}
				/>
			)}
			<SelectControl
				label={__('Default selection', 'data-table-filter-select')}
				help={__(
					'Which option is active when the table first loads. Child filters marked “Active by default” are used when this is unset.',
					'data-table-filter-select'
				)}
				value={defaultValue}
				options={defaultValueOptions}
				onChange={(v) => setAttributes({ defaultValue: v })}
			/>
			{instanceId && (
				<p style={{ fontSize: '12px', color: '#757575' }}>
					{__('Table instance:', 'data-table-filter-select')}{' '}
					<code>{instanceId}</code>
				</p>
			)}
		</PanelBody>
	);
}

function ImportColumnControls({
	supportsColumnImport,
	isFirebaseSource,
	importColumnOptions,
	importColumn,
	setImportColumn,
	onImport,
	isImporting,
	importError,
}) {
	if (!supportsColumnImport) {
		return (
			<p style={{ fontSize: '12px', color: '#757575' }}>
				{__(
					'Column import is available when the table uses JSON or Firebase data.',
					'data-table-filter-select'
				)}
			</p>
		);
	}

	if (importColumnOptions.length === 0) {
		return (
			<p style={{ fontSize: '12px', color: '#757575' }}>
				{__(
					'No columns with values found in the controller table.',
					'data-table-filter-select'
				)}
			</p>
		);
	}

	return (
		<>
			{isFirebaseSource && (
				<p style={{ fontSize: '12px', color: '#757575' }}>
					{__(
						'The table preview shows up to 500 rows. Firebase import scans the full dataset and may take a moment. Column counts in the list below are from the preview.',
						'data-table-filter-select'
					)}
				</p>
			)}
			<SelectControl
				label={__('Column', 'data-table-filter-select')}
				help={
					isFirebaseSource
						? __(
								'Each unique value in this column becomes a dropdown option. Import reads the full Firebase dataset, not the preview.',
								'data-table-filter-select'
							)
						: __(
								'Each unique value in this column becomes a dropdown option that filters to include only matching rows.',
								'data-table-filter-select'
							)
				}
				value={importColumn}
				options={importColumnOptions}
				onChange={setImportColumn}
			/>
			<Button
				variant="primary"
				onClick={onImport}
				disabled={!importColumn || isImporting}
				isBusy={isImporting}
			>
				{isImporting
					? __('Importing…', 'data-table-filter-select')
					: __('Import unique values', 'data-table-filter-select')}
			</Button>
			{importError && (
				<p style={{ fontSize: '12px', color: '#cc1818' }}>
					{importError}
				</p>
			)}
		</>
	);
}

function ImportOptionsPanel({
	filterColumn,
	importedOptionEntries,
	supportsColumnImport,
	isFirebaseSource,
	importColumnOptions,
	importColumn,
	setImportColumn,
	onImport,
	onClear,
	isImporting,
	importError,
}) {
	return (
		<PanelBody
			title={__('Import options from column', 'data-table-filter-select')}
			initialOpen={importedOptionEntries.length > 0}
		>
			<ImportColumnControls
				supportsColumnImport={supportsColumnImport}
				isFirebaseSource={isFirebaseSource}
				importColumnOptions={importColumnOptions}
				importColumn={importColumn}
				setImportColumn={setImportColumn}
				onImport={onImport}
				isImporting={isImporting}
				importError={importError}
			/>
			{importedOptionEntries.length > 0 && (
				<>
					<p style={{ fontSize: '12px', marginTop: '12px' }}>
						{sprintf(
							/* translators: 1: number of options, 2: column name */
							__(
								'%1$d options imported from column “%2$s”. Re-import to refresh after table data changes.',
								'data-table-filter-select'
							),
							importedOptionEntries.length,
							filterColumn
						)}
					</p>
					<Button variant="secondary" isDestructive onClick={onClear}>
						{__(
							'Clear imported options',
							'data-table-filter-select'
						)}
					</Button>
				</>
			)}
		</PanelBody>
	);
}

export default function Edit({ clientId, attributes, setAttributes, context }) {
	const {
		placeholder,
		includeResetOption,
		resetLabel,
		defaultValue,
		filterColumn,
		importedOptions,
		isFullWidth,
		hasClearIcon,
	} = attributes;
	const instanceId = context['prc-block/dataTableInstanceId'] || '';
	const dataSource = context['prc-block/dataTableDataSource'] || 'csv';
	const providerContext = context['prc-block/dataTableData'];

	const { removeBlocks } = useDispatch('core/block-editor');

	const childFilters = useSelect(
		(select) =>
			select('core/block-editor')
				.getBlocks(clientId)
				.filter(
					(block) => block.name === 'prc-block/data-table-filter'
				),
		[clientId]
	);

	const { columns, rows, parentTable } = useControllerTableData({
		clientId,
		dataSource,
		providerContext,
	});

	const importColumnOptions = useMemo(
		() => getImportColumnOptions(columns, rows),
		[columns, rows]
	);

	const [importColumn, setImportColumn] = useState(
		filterColumn || importColumnOptions[0]?.value || ''
	);
	const [isImporting, setIsImporting] = useState(false);
	const [importError, setImportError] = useState('');

	const importedOptionEntries = Array.isArray(importedOptions)
		? importedOptions
		: [];

	const childFilterOptions = childFilters
		.filter((block) => block.attributes.value)
		.map((block) => ({
			label: block.attributes.label || block.attributes.value,
			value: block.attributes.value,
		}));

	const defaultValueOptions = [
		{
			label: includeResetOption
				? __('— Reset / All —', 'data-table-filter-select')
				: __('— None —', 'data-table-filter-select'),
			value: '',
		},
		...importedOptionEntries
			.filter((option) => option?.value)
			.map((option) => ({
				label: option.label || option.value,
				value: option.value,
			})),
		...childFilterOptions,
	];

	const applyImportedOptions = (column, uniques) => {
		setAttributes({
			filterColumn: column,
			importedOptions: uniques.map((value) => ({
				value,
				label: value,
			})),
		});

		const emptyChildIds = childFilters
			.filter((block) => !block.attributes.value)
			.map((block) => block.clientId);

		if (emptyChildIds.length > 0) {
			removeBlocks(emptyChildIds);
		}
	};

	const handleImportFromColumn = async () => {
		if (!importColumn || isImporting) {
			return;
		}

		setImportError('');

		if (dataSource === 'firebase') {
			const path =
				typeof parentTable.firebasePath === 'string'
					? parentTable.firebasePath.trim()
					: '';
			if (!path) {
				setImportError(
					__(
						'Configure a Firebase path on the data table controller first.',
						'data-table-filter-select'
					)
				);
				return;
			}

			setIsImporting(true);
			try {
				const response = await apiFetch({
					path: '/prc-api/v3/data-table/firebase-column-values',
					method: 'POST',
					data: {
						path,
						column: importColumn,
						defaultJsonSheet: parentTable.defaultJsonSheet,
						pivotEnabled: parentTable.pivotEnabled,
						pivotIndexColumn: parentTable.pivotIndexColumn,
						pivotColumnField: parentTable.pivotColumnField,
						pivotColumns: parentTable.pivotColumns,
						pivotValueFields: parentTable.pivotValueFields,
						pivotExtraColumns: parentTable.pivotExtraColumns,
					},
				});

				const uniques = Array.isArray(response?.values)
					? response.values.filter((value) => value !== '')
					: [];

				applyImportedOptions(importColumn, uniques);
			} catch (err) {
				setImportError(
					err?.message ||
						__(
							'Failed to import values from Firebase.',
							'data-table-filter-select'
						)
				);
			} finally {
				setIsImporting(false);
			}
			return;
		}

		const uniques = sortedUniques(rows, importColumn).filter(
			(value) => value !== ''
		);
		applyImportedOptions(importColumn, uniques);
	};

	const handleClearImportedOptions = () => {
		setAttributes({
			filterColumn: '',
			importedOptions: [],
		});
	};

	const blockProps = useBlockProps({
		className: [
			'wp-block-prc-block-data-table-filter-select',
			isFullWidth ? 'is-full-width' : '',
		]
			.filter(Boolean)
			.join(' '),
	});

	const innerBlocksProps = useInnerBlocksProps(
		{
			className: 'prc-data-table-filter-select__options',
		},
		{
			template: TEMPLATE,
			templateLock: false,
		}
	);

	const supportsColumnImport =
		dataSource === 'json' || dataSource === 'firebase';
	const isFirebaseSource = dataSource === 'firebase';

	return (
		<>
			<InspectorControls>
				<DropdownSettingsPanel
					placeholder={placeholder}
					includeResetOption={includeResetOption}
					resetLabel={resetLabel}
					defaultValue={defaultValue}
					isFullWidth={isFullWidth}
					hasClearIcon={hasClearIcon}
					instanceId={instanceId}
					defaultValueOptions={defaultValueOptions}
					setAttributes={setAttributes}
				/>
				<ImportOptionsPanel
					filterColumn={filterColumn}
					importedOptionEntries={importedOptionEntries}
					supportsColumnImport={supportsColumnImport}
					isFirebaseSource={isFirebaseSource}
					importColumnOptions={importColumnOptions}
					importColumn={importColumn}
					setImportColumn={setImportColumn}
					onImport={handleImportFromColumn}
					onClear={handleClearImportedOptions}
					isImporting={isImporting}
					importError={importError}
				/>
			</InspectorControls>
			<div {...blockProps}>
				<p className="prc-data-table-filter-select__editor-note">
					{getEditorNote(importedOptionEntries.length, filterColumn)}
				</p>
				{placeholder && (
					<span className="prc-data-table-filter-select__placeholder-preview">
						{placeholder}
					</span>
				)}
				<div {...innerBlocksProps} />
			</div>
		</>
	);
}
