/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useEffect, useMemo, useState } from '@wordpress/element';
import {
	PanelBody,
	CheckboxControl,
	SelectControl,
} from '@wordpress/components';

/**
 * Add or remove a column key from a list.
 *
 * @param {unknown} list   Current column-name list.
 * @param {string}  col    Column key to add or remove.
 * @param {boolean} listed Whether the column should be in the list.
 * @return {string[]} Next list.
 */
function setColumnListed(list, col, listed) {
	const current = Array.isArray(list) ? list : [];
	if (listed) {
		return current.includes(col) ? current : [...current, col];
	}
	return current.filter((key) => key !== col);
}

/**
 * Inspector panel for global, header-only, and per-sheet column visibility.
 *
 * @param {Object}   props
 * @param {boolean}  props.enabled
 * @param {string[]} props.jsonColumnList
 * @param {unknown}  props.hiddenColumns
 * @param {unknown}  props.columnOrder
 * @param {string[]} props.visibleColumns
 * @param {unknown}  props.hiddenColumnHeaders
 * @param {string[]} props.sheetNames
 * @param {string}   props.resolvedDefaultSheet
 * @param {unknown}  props.hiddenColumnsBySheet
 * @param {Function} props.setAttributes
 */
export default function ColumnVisibilityPanel({
	enabled,
	jsonColumnList,
	hiddenColumns,
	columnOrder,
	visibleColumns,
	hiddenColumnHeaders,
	sheetNames,
	resolvedDefaultSheet,
	hiddenColumnsBySheet,
	setAttributes,
}) {
	const [columnVisibilitySheet, setColumnVisibilitySheet] = useState('');

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

	const perSheetHiddenColumns = useMemo(() => {
		const bySheet =
			hiddenColumnsBySheet &&
			typeof hiddenColumnsBySheet === 'object' &&
			!Array.isArray(hiddenColumnsBySheet)
				? hiddenColumnsBySheet
				: {};
		return bySheet[columnVisibilitySheet] || [];
	}, [hiddenColumnsBySheet, columnVisibilitySheet]);

	if (!enabled) {
		return null;
	}

	const activeSheet =
		columnVisibilitySheet || resolvedDefaultSheet || sheetNames[0] || '';

	return (
		<PanelBody
			title={__('Column visibility', 'data-table-controller')}
			initialOpen={false}
		>
			<p className="prc-data-table-controller-help">
				{__(
					'Uncheck columns to hide them from the rendered table on every sheet.',
					'data-table-controller'
				)}
			</p>
			{jsonColumnList.map((col) => (
				<CheckboxControl
					key={col}
					__nextHasNoMarginBottom
					label={col}
					checked={!hiddenColumns?.includes(col)}
					onChange={(visible) => {
						const nextHidden = setColumnListed(
							hiddenColumns,
							col,
							!visible
						);
						setAttributes({
							hiddenColumns: nextHidden,
							columnOrder: (columnOrder || []).filter(
								(key) => !nextHidden.includes(key)
							),
						});
					}}
				/>
			))}
			<hr />
			<p className="prc-data-table-controller-help">
				{__(
					'Uncheck column names to hide header text only. Column data still displays.',
					'data-table-controller'
				)}
			</p>
			{visibleColumns.map((col) => (
				<CheckboxControl
					key={`header-${col}`}
					__nextHasNoMarginBottom
					label={col}
					checked={!hiddenColumnHeaders?.includes(col)}
					onChange={(showHeaderName) =>
						setAttributes({
							hiddenColumnHeaders: setColumnListed(
								hiddenColumnHeaders,
								col,
								!showHeaderName
							),
						})
					}
				/>
			))}
			{Array.isArray(sheetNames) && sheetNames.length > 1 && (
				<>
					<hr />
					<p className="prc-data-table-controller-help">
						{__(
							'Hide columns only when a specific sheet is active.',
							'data-table-controller'
						)}
					</p>
					<SelectControl
						__next40pxDefaultSize
						label={__('Sheet', 'data-table-controller')}
						value={activeSheet}
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
							checked={!perSheetHiddenColumns.includes(col)}
							onChange={(visible) => {
								if (!activeSheet) {
									return;
								}
								const current =
									hiddenColumnsBySheet?.[activeSheet] || [];
								const nextHidden = setColumnListed(
									current,
									col,
									!visible
								);
								const nextBySheet = {
									...(hiddenColumnsBySheet || {}),
								};
								if (nextHidden.length > 0) {
									nextBySheet[activeSheet] = nextHidden;
								} else {
									delete nextBySheet[activeSheet];
								}
								setAttributes({
									hiddenColumnsBySheet: nextBySheet,
								});
							}}
						/>
					))}
				</>
			)}
		</PanelBody>
	);
}
