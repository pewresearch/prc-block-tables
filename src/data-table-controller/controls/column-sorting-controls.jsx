/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { SelectControl, CheckboxControl } from '@wordpress/components';

/**
 * Sidebar controls for column sort mode (custom, auto, and optional inherit).
 *
 * @param {Object}   props                            Props.
 * @param {string}   props.sortMode                   Current sort mode value.
 * @param {Function} props.onSortModeChange           Mode change handler.
 * @param {boolean}  [props.includeInheritOption]     When true, adds inherit mode (mobile).
 * @param {boolean}  props.isAutoSort                 Whether auto mode is active.
 * @param {string}   props.autoSortVariable           Auto sort row label column.
 * @param {number}   props.autoSortRowIndex           Selected auto sort row index.
 * @param {string[]} props.autoSortExcluded           Excluded column keys.
 * @param {Array}    props.autoSortRowOptions         Row select options.
 * @param {string[]} props.visibleColumns             Visible column keys.
 * @param {string[]} props.jsonColumnList             All column keys for selects.
 * @param {Function} props.onAutoSortVariableChange   Auto variable change handler.
 * @param {Function} props.onAutoSortRowIndexChange   Auto row index change handler.
 * @param {Function} props.onAutoSortExcludedChange   Excluded columns change handler.
 * @param {string}   [props.excludeCheckboxKeyPrefix] Prefix for exclusion checkbox keys.
 */
export default function ColumnSortingControls({
	sortMode,
	onSortModeChange,
	includeInheritOption = false,
	isAutoSort,
	autoSortVariable,
	autoSortRowIndex,
	autoSortExcluded,
	autoSortRowOptions,
	visibleColumns,
	jsonColumnList,
	onAutoSortVariableChange,
	onAutoSortRowIndexChange,
	onAutoSortExcludedChange,
	excludeCheckboxKeyPrefix = 'auto-exclude',
}) {
	const modeOptions = [
		...(includeInheritOption
			? [
					{
						label: __(
							'Inherit desktop order',
							'data-table-controller'
						),
						value: 'inherit',
					},
				]
			: []),
		{
			label: __('Custom (drag to reorder)', 'data-table-controller'),
			value: 'custom',
		},
		{
			label: __('Auto (sort by row values)', 'data-table-controller'),
			value: 'auto',
		},
	];

	return (
		<>
			<SelectControl
				__next40pxDefaultSize
				label={__('Sort mode', 'data-table-controller')}
				value={sortMode}
				options={modeOptions}
				onChange={onSortModeChange}
			/>
			{includeInheritOption && sortMode === 'inherit' && (
				<p className="prc-data-table-controller-help">
					{__(
						'Mobile uses the desktop column order until you choose custom or auto.',
						'data-table-controller'
					)}
				</p>
			)}
			{isAutoSort && (
				<>
					<p className="prc-data-table-controller-help">
						{__(
							'Columns are ordered by numeric values in the selected row (largest first). Label columns such as the sort variable are usually excluded below.',
							'data-table-controller'
						)}
					</p>
					<SelectControl
						__next40pxDefaultSize
						label={__(
							'Variable to target rows',
							'data-table-controller'
						)}
						value={autoSortVariable}
						options={[
							{
								label: __(
									'Select a column…',
									'data-table-controller'
								),
								value: '',
							},
							...jsonColumnList.map((col) => ({
								label: col,
								value: col,
							})),
						]}
						onChange={onAutoSortVariableChange}
					/>
					<SelectControl
						__next40pxDefaultSize
						label={__('Select row', 'data-table-controller')}
						value={
							autoSortRowIndex >= 0
								? String(autoSortRowIndex)
								: ''
						}
						options={[
							{
								label: __(
									'Select a row…',
									'data-table-controller'
								),
								value: '',
							},
							...autoSortRowOptions,
						]}
						onChange={onAutoSortRowIndexChange}
						disabled={!autoSortVariable}
					/>
					<p className="prc-data-table-controller-help">
						{__(
							'Exclude columns from auto sort (drag to reorder in the block preview):',
							'data-table-controller'
						)}
					</p>
					{visibleColumns.map((col) => (
						<CheckboxControl
							key={`${excludeCheckboxKeyPrefix}-${col}`}
							__nextHasNoMarginBottom
							label={col}
							checked={autoSortExcluded.includes(col)}
							onChange={(excluded) => {
								const next = excluded
									? [...autoSortExcluded, col]
									: autoSortExcluded.filter((c) => c !== col);
								onAutoSortExcludedChange(next);
							}}
						/>
					))}
				</>
			)}
		</>
	);
}
