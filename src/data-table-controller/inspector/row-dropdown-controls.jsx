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
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useEffect, useMemo, useState } from '@wordpress/element';
import {
	CheckboxControl,
	PanelBody,
	SelectControl,
	ToggleControl,
} from '@wordpress/components';

/**
 * Internal dependencies
 */
import {
	getEffectiveRowDropdownColumns,
	normalizeRowDropdownColumnsBySheet,
	SortableColumnChip,
} from '../lib/edit-utils';

/** Sentinel for editing the global default (not a real sheet key). */
const ALL_SHEETS_VALUE = '__all__';

/**
 * @param {string} sheetKey Editor sheet scope (sentinel or real sheet name).
 * @return {string} Empty string for global scope; otherwise the sheet key.
 */
function toColumnSheetKey(sheetKey) {
	return sheetKey === ALL_SHEETS_VALUE ? '' : sheetKey;
}

/**
 * Inspector controls for expandable row dropdown table columns.
 *
 * @param {Object}   props                           Props.
 * @param {boolean}  props.enableRowDropdowns        Whether row dropdowns are enabled.
 * @param {Function} props.setAttributes             Block attribute setter.
 * @param {string}   props.rowDropdownIdentityColumn Identity column key.
 * @param {string[]} props.rowDropdownColumns        Global dropdown column keys.
 * @param {Object}   props.rowDropdownColumnsBySheet Per-sheet dropdown overrides.
 * @param {string[]} props.allTableColumns           All known column keys.
 * @param {string[]} props.sheetNames                Multi-sheet names.
 */
export default function RowDropdownControls({
	enableRowDropdowns,
	setAttributes,
	rowDropdownIdentityColumn,
	rowDropdownColumns,
	rowDropdownColumnsBySheet = {},
	allTableColumns = [],
	sheetNames = [],
}) {
	const safeSheetNames = Array.isArray(sheetNames)
		? sheetNames.map(String)
		: [];
	const safeColumns = Array.isArray(allTableColumns)
		? allTableColumns.map(String)
		: [];
	const [rowDropdownSheet, setRowDropdownSheet] = useState(ALL_SHEETS_VALUE);
	const isMultiSheet = safeSheetNames.length > 1;
	const bySheet = normalizeRowDropdownColumnsBySheet(
		rowDropdownColumnsBySheet
	);
	const columnSheetKey = toColumnSheetKey(rowDropdownSheet);

	useEffect(() => {
		if (!isMultiSheet) {
			setRowDropdownSheet(ALL_SHEETS_VALUE);
			return;
		}
		if (
			rowDropdownSheet !== ALL_SHEETS_VALUE &&
			!safeSheetNames.includes(rowDropdownSheet)
		) {
			setRowDropdownSheet(ALL_SHEETS_VALUE);
		}
		// Depend on sheetNames (prop), not the mapped copy, to avoid effect churn.
		// eslint-disable-next-line react-hooks/exhaustive-deps -- safeSheetNames is derived from sheetNames
	}, [isMultiSheet, rowDropdownSheet, sheetNames]);

	const effectiveColumns = useMemo(
		() =>
			getEffectiveRowDropdownColumns(
				columnSheetKey,
				rowDropdownColumns,
				rowDropdownColumnsBySheet
			),
		[columnSheetKey, rowDropdownColumns, rowDropdownColumnsBySheet]
	);

	const sortableColumns = useMemo(
		() =>
			effectiveColumns.filter((col) => col !== rowDropdownIdentityColumn),
		[effectiveColumns, rowDropdownIdentityColumn]
	);

	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		})
	);

	const writeColumns = (nextColumns) => {
		if (!columnSheetKey) {
			setAttributes({ rowDropdownColumns: nextColumns });
			return;
		}
		const nextBySheet = { ...bySheet, [columnSheetKey]: nextColumns };
		setAttributes({ rowDropdownColumnsBySheet: nextBySheet });
	};

	const ensureSheetOverride = () => {
		if (!columnSheetKey) {
			return effectiveColumns;
		}
		if (
			Object.prototype.hasOwnProperty.call(bySheet, columnSheetKey) &&
			Array.isArray(bySheet[columnSheetKey])
		) {
			return bySheet[columnSheetKey].map(String);
		}
		return getEffectiveRowDropdownColumns(
			'',
			rowDropdownColumns,
			rowDropdownColumnsBySheet
		);
	};

	const handleColumnVisibilityChange = (col, visible) => {
		const current = ensureSheetOverride();
		const next = visible
			? [...current.filter((c) => c !== col), col]
			: current.filter((c) => c !== col);
		writeColumns(next);
	};

	const handleColumnDragEnd = ({ active, over }) => {
		if (!over || active.id === over.id) {
			return;
		}
		const current = ensureSheetOverride().filter(
			(col) => col !== rowDropdownIdentityColumn
		);
		const oldIndex = current.indexOf(active.id);
		const newIndex = current.indexOf(over.id);
		if (oldIndex < 0 || newIndex < 0) {
			return;
		}
		writeColumns(arrayMove(current, oldIndex, newIndex));
	};

	const sheetOptions = [
		{
			label: __('All sheets (default)', 'data-table-controller'),
			value: ALL_SHEETS_VALUE,
		},
		...safeSheetNames.map((name) => ({
			label: name,
			value: name,
		})),
	];

	return (
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
				<>
					<SelectControl
						__next40pxDefaultSize
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
							...safeColumns.map((col) => ({
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
					{isMultiSheet && (
						<SelectControl
							__next40pxDefaultSize
							label={__(
								'Sheet for dropdown columns',
								'data-table-controller'
							)}
							value={rowDropdownSheet}
							options={sheetOptions}
							onChange={(value) =>
								setRowDropdownSheet(
									value && safeSheetNames.includes(value)
										? value
										: ALL_SHEETS_VALUE
								)
							}
							help={__(
								'Choose a sheet to override dropdown columns for that sheet only, or edit the default used by all sheets.',
								'data-table-controller'
							)}
						/>
					)}
				</>
			)}
			{enableRowDropdowns && safeColumns.length > 0 && (
				<>
					<p className="prc-data-table-controller-help">
						{__(
							'Choose which columns appear in the expandable dropdown tables. The identity column is always excluded.',
							'data-table-controller'
						)}
					</p>
					{safeColumns.map((col) => (
						<CheckboxControl
							key={`row-dropdown-col-${rowDropdownSheet}-${col}`}
							__nextHasNoMarginBottom
							label={col}
							checked={
								col !== rowDropdownIdentityColumn &&
								effectiveColumns.includes(col)
							}
							disabled={col === rowDropdownIdentityColumn}
							onChange={(visible) =>
								handleColumnVisibilityChange(col, visible)
							}
						/>
					))}
					{sortableColumns.length > 1 && (
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
								onDragEnd={handleColumnDragEnd}
							>
								<SortableContext
									items={sortableColumns}
									strategy={horizontalListSortingStrategy}
								>
									<div
										className="prc-data-table-controller-column-order__list"
										role="list"
									>
										{sortableColumns.map((colKey) => (
											<SortableColumnChip
												key={`row-dropdown-order-${rowDropdownSheet}-${colKey}`}
												id={colKey}
												label={colKey}
											/>
										))}
									</div>
								</SortableContext>
							</DndContext>
						</>
					)}
				</>
			)}
		</PanelBody>
	);
}
