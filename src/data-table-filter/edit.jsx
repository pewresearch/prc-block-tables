/**
 * WordPress Dependencies
 */
import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	RichText,
	InspectorControls,
} from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	SelectControl,
	ToggleControl,
} from '@wordpress/components';

export default function Edit({ attributes, setAttributes, context }) {
	const {
		value,
		label,
		filterType,
		filterColumn,
		isDefault,
		asCheckbox,
		invertCheckbox,
	} = attributes;
	const instanceId = context['prc-block/dataTableInstanceId'] || '';
	const dataSource = context['prc-block/dataTableDataSource'] || 'csv';
	const rawColumns = context['prc-block/dataTableColumns'];
	const jsonColumns = Array.isArray(rawColumns) ? rawColumns : [];

	const supportsSheetAndColumnFilters =
		dataSource === 'json' || dataSource === 'firebase';
	const isColumnFilter =
		filterType === 'column' ||
		filterType === 'column-include' ||
		filterType === 'column-include-only' ||
		filterType === 'column-exclude' ||
		filterType === 'column-exclude-begins-with';
	const supportsCheckboxToggle =
		isColumnFilter && filterType !== 'column-include';
	const blockProps = useBlockProps({
		className: `wp-block-prc-block-data-table-filter${
			asCheckbox && supportsCheckboxToggle ? ' is-checkbox' : ''
		}`,
	});

	const isColumnExclude = filterType === 'column-exclude';
	const isColumnExcludeBeginsWith =
		filterType === 'column-exclude-begins-with';
	/** Legacy blocks used `column`; map to include-only in the type picker. */
	const filterTypeSelectValue =
		filterType === 'column' ? 'column-include-only' : filterType;

	let valueLabel = __('Sheet value', 'data-table-filter');
	let valueHelp = __(
		'The sheet key this button activates (must match a key in the data source).',
		'data-table-filter'
	);
	if (isColumnExclude) {
		valueLabel = __('Exclude value', 'data-table-filter');
		valueHelp = __(
			'The column value to exclude (rows with this value in the selected column will be hidden).',
			'data-table-filter'
		);
	} else if (isColumnExcludeBeginsWith) {
		valueLabel = __('Exclude prefix', 'data-table-filter');
		valueHelp = __(
			'Rows whose value in the selected column begins with this string will be hidden.',
			'data-table-filter'
		);
	} else if (filterType === 'column-include') {
		valueLabel = __('Reference value', 'data-table-filter');
		valueHelp = __(
			'Removes the filter for the selected column so all values in that column are shown again.',
			'data-table-filter'
		);
	} else if (
		filterType === 'column-include-only' ||
		filterType === 'column'
	) {
		valueLabel = __('Match value', 'data-table-filter');
		valueHelp = __(
			'Only rows with this value in the selected column will be shown; all other rows are hidden.',
			'data-table-filter'
		);
	}

	return (
		<>
			<InspectorControls>
				<PanelBody
					title={__('Filter settings', 'data-table-filter')}
					initialOpen
				>
					{supportsSheetAndColumnFilters && (
						<SelectControl
							label={__('Filter type', 'data-table-filter')}
							help={valueHelp}
							value={filterTypeSelectValue}
							options={[
								{
									label: __('Sheet', 'data-table-filter'),
									value: 'sheet',
								},
								{
									label: __(
										'Column value (include only)',
										'data-table-filter'
									),
									value: 'column-include-only',
								},
								{
									label: __(
										'Column value (exclude)',
										'data-table-filter'
									),
									value: 'column-exclude',
								},
								{
									label: __(
										'Column value (exclude begins with)',
										'data-table-filter'
									),
									value: 'column-exclude-begins-with',
								},
								{
									label: __(
										'Reset column filter',
										'data-table-filter'
									),
									value: 'column-include',
								},
							]}
							onChange={(v) => {
								const isEligibleCheckboxType =
									v === 'column-include-only' ||
									v === 'column-exclude' ||
									v === 'column-exclude-begins-with' ||
									v === 'column';
								setAttributes({
									filterType: v,
									...(asCheckbox && !isEligibleCheckboxType
										? {
												asCheckbox: false,
												invertCheckbox: false,
											}
										: {}),
								});
							}}
						/>
					)}
					{isColumnFilter && jsonColumns.length > 0 && (
						<SelectControl
							label={__('Column', 'data-table-filter')}
							value={filterColumn}
							options={[
								{
									label: __(
										'— Select column —',
										'data-table-filter'
									),
									value: '',
								},
								...jsonColumns.map((col) => ({
									label: col,
									value: col,
								})),
							]}
							onChange={(v) => setAttributes({ filterColumn: v })}
						/>
					)}
					<TextControl
						label={valueLabel}
						value={value}
						onChange={(v) => setAttributes({ value: v })}
					/>
					{supportsCheckboxToggle && (
						<ToggleControl
							label={__('Make checkbox', 'data-table-filter')}
							help={__(
								'Show a checkbox instead of a button. Checking applies the filter; unchecking clears the column filter.',
								'data-table-filter'
							)}
							checked={asCheckbox}
							onChange={(v) =>
								setAttributes({
									asCheckbox: v,
									...(v ? {} : { invertCheckbox: false }),
								})
							}
						/>
					)}
					{supportsCheckboxToggle && asCheckbox && (
						<ToggleControl
							label={__('Invert checkbox', 'data-table-filter')}
							help={__(
								'Checked clears the filter; unchecked applies it. Use with labels like “Show Regional Totals”.',
								'data-table-filter'
							)}
							checked={invertCheckbox}
							onChange={(v) =>
								setAttributes({ invertCheckbox: v })
							}
						/>
					)}
					<ToggleControl
						label={__('Active by default', 'data-table-filter')}
						help={__(
							'Apply this filter automatically when the table first loads.',
							'data-table-filter'
						)}
						checked={isDefault}
						onChange={(v) => setAttributes({ isDefault: v })}
					/>
					{instanceId && (
						<p style={{ fontSize: '12px', color: '#757575' }}>
							{__('Table instance:', 'data-table-filter')}{' '}
							<code>{instanceId}</code>
						</p>
					)}
				</PanelBody>
			</InspectorControls>
			{asCheckbox && supportsCheckboxToggle ? (
				<label {...blockProps}>
					<input type="checkbox" disabled />
					<RichText
						tagName="span"
						value={label}
						onChange={(v) => setAttributes({ label: v })}
						placeholder={__('Filter', 'data-table-filter')}
						allowedFormats={['core/bold', 'core/italic']}
					/>
				</label>
			) : (
				<button {...blockProps} type="button">
					<RichText
						value={label}
						onChange={(v) => setAttributes({ label: v })}
						placeholder={__('Filter', 'data-table-filter')}
						allowedFormats={['core/bold', 'core/italic']}
					/>
				</button>
			)}
		</>
	);
}
