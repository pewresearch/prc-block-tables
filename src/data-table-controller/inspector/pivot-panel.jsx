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
import {
	PanelBody,
	SelectControl,
	CheckboxControl,
	TextControl,
	ToggleControl,
} from '@wordpress/components';

/**
 * Internal dependencies
 */
import { SortableColumnChip } from '../lib/edit-utils';
import { getDistinctValues } from '../lib/pivot';

/**
 * @param {Array}   items   Current ordered entries.
 * @param {string}  id      Entry identity.
 * @param {boolean} checked Whether the entry should be selected.
 * @param {string}  idKey   Identity key (`value` or `field`).
 * @return {Array} Next labeled entries.
 */
function toggleLabeledItem(items, id, checked, idKey) {
	if (!checked) {
		return items.filter((item) => item[idKey] !== id);
	}
	const existing = items.find((item) => item[idKey] === id);
	return [
		...items.filter((item) => item[idKey] !== id),
		{ [idKey]: id, label: existing?.label || id },
	];
}

/**
 * @param {string[]} items
 * @param {string}   id
 * @param {boolean}  checked
 * @return {string[]} Next string entries.
 */
function toggleStringItem(items, id, checked) {
	if (!checked) {
		return items.filter((entry) => entry !== id);
	}
	return [...items.filter((entry) => entry !== id), id];
}

/**
 * @param {Array}    items
 * @param {Function} getId
 * @param {Function} onReorder
 * @return {Function} dnd-kit onDragEnd handler.
 */
function createReorderHandler(items, getId, onReorder) {
	return ({ active, over }) => {
		if (!over || active.id === over.id) {
			return;
		}
		const ids = items.map(getId);
		const oldIndex = ids.indexOf(active.id);
		const newIndex = ids.indexOf(over.id);
		if (oldIndex < 0 || newIndex < 0) {
			return;
		}
		onReorder(arrayMove(items, oldIndex, newIndex));
	};
}

/**
 * Checkbox list with optional labels and a drag-to-reorder strip.
 *
 * @param {Object}   props
 * @param {string[]} props.options
 * @param {Array}    props.selectedItems
 * @param {Function} props.onToggle
 * @param {Function} [props.onLabelChange]
 * @param {string}   [props.labelControlLabel]
 * @param {string}   props.help
 * @param {string}   props.dragHelp
 * @param {Function} props.onDragEnd
 * @param {Object}   props.sensors
 * @param {string}   props.itemKeyPrefix
 */
function PivotFieldList({
	options,
	selectedItems,
	onToggle,
	onLabelChange,
	labelControlLabel,
	help,
	dragHelp,
	onDragEnd,
	sensors,
	itemKeyPrefix,
}) {
	const selectedById = new Map(selectedItems.map((item) => [item.id, item]));
	const selectedIds = selectedItems.map((item) => item.id);

	return (
		<>
			<p className="prc-data-table-controller-help">{help}</p>
			{options.map((id) => {
				const selected = selectedById.get(id);
				if (!onLabelChange) {
					return (
						<CheckboxControl
							key={`${itemKeyPrefix}-${id}`}
							__nextHasNoMarginBottom
							label={id}
							checked={!!selected}
							onChange={(checked) => onToggle(id, checked)}
						/>
					);
				}
				return (
					<div
						key={`${itemKeyPrefix}-${id}`}
						className="prc-data-table-controller-pivot-column"
					>
						<CheckboxControl
							__nextHasNoMarginBottom
							label={id}
							checked={!!selected}
							onChange={(checked) => onToggle(id, checked)}
						/>
						{selected && (
							<TextControl
								__next40pxDefaultSize
								label={labelControlLabel}
								value={selected.label}
								onChange={(label) => onLabelChange(id, label)}
							/>
						)}
					</div>
				);
			})}
			{selectedItems.length > 1 && (
				<>
					<p className="prc-data-table-controller-column-order__help">
						{dragHelp}
					</p>
					<DndContext
						sensors={sensors}
						collisionDetection={closestCenter}
						onDragEnd={onDragEnd}
					>
						<SortableContext
							items={selectedIds}
							strategy={horizontalListSortingStrategy}
						>
							<div
								className="prc-data-table-controller-column-order__list"
								role="list"
							>
								{selectedItems.map((item) => (
									<SortableColumnChip
										key={`${itemKeyPrefix}-order-${item.id}`}
										id={item.id}
										label={item.label}
									/>
								))}
							</div>
						</SortableContext>
					</DndContext>
				</>
			)}
		</>
	);
}

/**
 * Field pickers and drag lists shown when pivot reshaping is enabled.
 *
 * @param {Object}   props
 * @param {string}   props.pivotIndexColumn
 * @param {string}   props.pivotColumnField
 * @param {string[]} props.pivotExtraColumns
 * @param {string[]} props.rawSourceColumns
 * @param {Object}   props.rawSourceSheets
 * @param {Array}    props.normalizedPivotColumns
 * @param {Array}    props.normalizedPivotValueFields
 * @param {string[]} props.normalizedPivotExtraColumns
 * @param {string[]} props.pivotDistinctColumnValues
 * @param {string[]} props.pivotExtraColumnOptions
 * @param {Function} props.setAttributes
 * @param {Object}   props.sensors
 */
function PivotEnabledFields({
	pivotIndexColumn,
	pivotColumnField,
	pivotExtraColumns,
	rawSourceColumns,
	rawSourceSheets,
	normalizedPivotColumns,
	normalizedPivotValueFields,
	normalizedPivotExtraColumns,
	pivotDistinctColumnValues,
	pivotExtraColumnOptions,
	setAttributes,
	sensors,
}) {
	const columnOptions = [
		{
			label: __('Select a column…', 'data-table-controller'),
			value: '',
		},
		...rawSourceColumns.map((col) => ({
			label: col,
			value: col,
		})),
	];

	return (
		<>
			<SelectControl
				__next40pxDefaultSize
				label={__('Row identity column', 'data-table-controller')}
				value={pivotIndexColumn}
				options={columnOptions}
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
				__next40pxDefaultSize
				label={__('Column field', 'data-table-controller')}
				value={pivotColumnField}
				options={columnOptions}
				onChange={(value) => {
					const nextField = value ?? '';
					const distinct = nextField
						? getDistinctValues(rawSourceSheets, nextField)
						: [];
					const defaultExtras = nextField
						? rawSourceColumns.filter(
								(col) =>
									col !== pivotIndexColumn &&
									col !== nextField
							)
						: [];
					setAttributes({
						pivotColumnField: nextField,
						pivotColumns: distinct.map((entry) => ({
							value: entry,
							label: entry,
						})),
						pivotExtraColumns: defaultExtras,
					});
				}}
				help={__(
					'Distinct values of this field become columns (e.g. religion).',
					'data-table-controller'
				)}
			/>
			{pivotColumnField && pivotDistinctColumnValues.length > 0 && (
				<PivotFieldList
					options={pivotDistinctColumnValues}
					selectedItems={normalizedPivotColumns.map((col) => ({
						id: col.value,
						label: col.label,
					}))}
					onToggle={(id, checked) =>
						setAttributes({
							pivotColumns: toggleLabeledItem(
								normalizedPivotColumns,
								id,
								checked,
								'value'
							),
						})
					}
					onLabelChange={(id, label) =>
						setAttributes({
							pivotColumns: normalizedPivotColumns.map((col) =>
								col.value === id
									? { ...col, label: label || id }
									: col
							),
						})
					}
					labelControlLabel={__(
						'Column label',
						'data-table-controller'
					)}
					help={__(
						'Choose which values become columns. Customize the header label for each.',
						'data-table-controller'
					)}
					dragHelp={__(
						'Drag to set column order after the identity column.',
						'data-table-controller'
					)}
					onDragEnd={createReorderHandler(
						normalizedPivotColumns,
						(col) => col.value,
						(next) => setAttributes({ pivotColumns: next })
					)}
					sensors={sensors}
					itemKeyPrefix="pivot-col"
				/>
			)}
			{pivotExtraColumnOptions.length > 0 && (
				<PivotFieldList
					options={pivotExtraColumnOptions}
					selectedItems={normalizedPivotExtraColumns.map((col) => ({
						id: col,
						label: col,
					}))}
					onToggle={(id, checked) =>
						setAttributes({
							pivotExtraColumns: toggleStringItem(
								normalizedPivotExtraColumns,
								id,
								checked
							),
						})
					}
					help={__(
						'Also group by these fields (e.g. year, direction). Each unique combination with the row identity becomes its own row. Hide columns via Column visibility if needed.',
						'data-table-controller'
					)}
					dragHelp={__(
						'Drag to set column order after the identity column.',
						'data-table-controller'
					)}
					onDragEnd={createReorderHandler(
						normalizedPivotExtraColumns,
						(col) => col,
						(next) => setAttributes({ pivotExtraColumns: next })
					)}
					sensors={sensors}
					itemKeyPrefix="pivot-extra"
				/>
			)}
			<PivotFieldList
				options={rawSourceColumns}
				selectedItems={normalizedPivotValueFields.map((entry) => ({
					id: entry.field,
					label: entry.label,
				}))}
				onToggle={(id, checked) =>
					setAttributes({
						pivotValueFields: toggleLabeledItem(
							normalizedPivotValueFields,
							id,
							checked,
							'field'
						),
						...(checked
							? {
									pivotExtraColumns: pivotExtraColumns.filter(
										(col) => col !== id
									),
								}
							: {}),
					})
				}
				onLabelChange={(id, label) =>
					setAttributes({
						pivotValueFields: normalizedPivotValueFields.map(
							(entry) =>
								entry.field === id
									? { ...entry, label: label || id }
									: entry
						),
					})
				}
				labelControlLabel={__('Sheet label', 'data-table-controller')}
				help={__(
					'Choose value fields. Each selected field becomes a sheet readers can toggle between.',
					'data-table-controller'
				)}
				dragHelp={__(
					'Drag to set sheet order.',
					'data-table-controller'
				)}
				onDragEnd={createReorderHandler(
					normalizedPivotValueFields,
					(entry) => entry.field,
					(next) => setAttributes({ pivotValueFields: next })
				)}
				sensors={sensors}
				itemKeyPrefix="pivot-value"
			/>
		</>
	);
}

/**
 * Inspector panel for reshaping long-format source data into wide columns.
 *
 * @param {Object}   props
 * @param {boolean}  props.pivotEnabled
 * @param {string}   props.pivotIndexColumn
 * @param {string}   props.pivotColumnField
 * @param {string[]} props.pivotExtraColumns
 * @param {string[]} props.rawSourceColumns
 * @param {Object}   props.rawSourceSheets
 * @param {Array}    props.normalizedPivotColumns
 * @param {Array}    props.normalizedPivotValueFields
 * @param {string[]} props.normalizedPivotExtraColumns
 * @param {string[]} props.pivotDistinctColumnValues
 * @param {string[]} props.pivotExtraColumnOptions
 * @param {Function} props.setAttributes
 */
export default function PivotPanel({
	pivotEnabled,
	pivotIndexColumn,
	pivotColumnField,
	pivotExtraColumns,
	rawSourceColumns,
	rawSourceSheets,
	normalizedPivotColumns,
	normalizedPivotValueFields,
	normalizedPivotExtraColumns,
	pivotDistinctColumnValues,
	pivotExtraColumnOptions,
	setAttributes,
}) {
	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		})
	);

	if (rawSourceColumns.length === 0) {
		return null;
	}

	return (
		<PanelBody
			title={__('Data reshaping (Pivot)', 'data-table-controller')}
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
				<PivotEnabledFields
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
					sensors={sensors}
				/>
			)}
		</PanelBody>
	);
}
