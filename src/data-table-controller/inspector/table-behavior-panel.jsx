/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { PanelBody, SelectControl, ToggleControl } from '@wordpress/components';

/**
 * Inspector panel for default column sorting on first load.
 *
 * @param {Object}   props
 * @param {boolean}  props.enableColumnSorting
 * @param {string[]} props.defaultSheetVisibleColumns
 * @param {string}   props.defaultSortColumn
 * @param {string}   props.defaultSortDirection
 * @param {Function} props.setAttributes
 */
export default function TableBehaviorPanel({
	enableColumnSorting,
	defaultSheetVisibleColumns,
	defaultSortColumn,
	defaultSortDirection,
	setAttributes,
}) {
	return (
		<PanelBody
			title={__('Table behavior', 'data-table-controller')}
			initialOpen={false}
		>
			<ToggleControl
				label={__('Enable column sorting', 'data-table-controller')}
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
			{enableColumnSorting && defaultSheetVisibleColumns.length > 0 && (
				<>
					<SelectControl
						__next40pxDefaultSize
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
								label: __('None', 'data-table-controller'),
								value: '',
							},
							...defaultSheetVisibleColumns.map((col) => ({
								label: col,
								value: col,
							})),
						]}
						onChange={(value) =>
							setAttributes({
								defaultSortColumn: value || '',
							})
						}
					/>
					{defaultSortColumn && (
						<SelectControl
							__next40pxDefaultSize
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
									defaultSortDirection: value || 'asc',
								})
							}
						/>
					)}
				</>
			)}
		</PanelBody>
	);
}
