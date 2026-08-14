/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { DndContext, closestCenter } from '@dnd-kit/core';
import {
	SortableContext,
	horizontalListSortingStrategy,
} from '@dnd-kit/sortable';

/**
 * Internal dependencies
 */
import { SortableColumnChip } from './edit-utils';

/**
 * Canvas drag UI for column order (custom or auto-excluded + locked auto columns).
 *
 * @param {Object}      props                       Props.
 * @param {string}      [props.title]               Optional group title above the strip.
 * @param {boolean}     props.isAutoSort            Whether auto sort mode is active.
 * @param {string[]}    props.effectiveOrder        Custom mode column order.
 * @param {string[]}    props.excludedBefore        Auto mode excluded columns before auto sort.
 * @param {string[]}    props.excludedAfter         Auto mode excluded columns after auto sort.
 * @param {string[]}    props.autoSortedOrder       Auto mode locked columns.
 * @param {Object|null} props.sortReferenceRow      Row used for auto sort value suffixes.
 * @param {Object}      props.sensors               dnd-kit sensors.
 * @param {Function}    props.onCustomDragEnd       Custom mode drag end handler.
 * @param {Function}    props.onAutoExcludedDragEnd Auto excluded drag end handler.
 */
export default function ColumnOrderPreview({
	title = '',
	isAutoSort,
	effectiveOrder,
	excludedBefore,
	excludedAfter,
	autoSortedOrder,
	sortReferenceRow,
	sensors,
	onCustomDragEnd,
	onAutoExcludedDragEnd,
}) {
	const autoPreviewItems = [
		...excludedBefore,
		...autoSortedOrder,
		...excludedAfter,
	];

	const renderAutoChip = (colKey, disabled = false) => {
		const cellValue = sortReferenceRow?.[colKey];
		const suffix =
			disabled &&
			cellValue !== undefined &&
			cellValue !== null &&
			cellValue !== ''
				? ` (${cellValue})`
				: '';

		return (
			<SortableColumnChip
				key={colKey}
				id={colKey}
				label={colKey}
				disabled={disabled}
				suffix={suffix}
			/>
		);
	};

	return (
		<div className="prc-data-table-controller-column-order">
			{title ? (
				<p className="prc-data-table-controller-column-order__title">
					{title}
				</p>
			) : null}
			{isAutoSort ? (
				<>
					<p className="prc-data-table-controller-column-order__help">
						{__(
							'Drag excluded columns before or after the auto-sorted group. Remaining columns are sorted by the selected row (descending).',
							'data-table-controller'
						)}
					</p>
					{autoPreviewItems.length > 0 && (
						<DndContext
							sensors={sensors}
							collisionDetection={closestCenter}
							onDragEnd={onAutoExcludedDragEnd}
						>
							<SortableContext
								items={autoPreviewItems}
								strategy={horizontalListSortingStrategy}
							>
								<div
									className="prc-data-table-controller-column-order__list"
									role="list"
								>
									{excludedBefore.map((colKey) =>
										renderAutoChip(colKey)
									)}
									{autoSortedOrder.map((colKey) =>
										renderAutoChip(colKey, true)
									)}
									{excludedAfter.map((colKey) =>
										renderAutoChip(colKey)
									)}
								</div>
							</SortableContext>
						</DndContext>
					)}
				</>
			) : (
				<>
					<p className="prc-data-table-controller-column-order__help">
						{__(
							'Drag columns to change their order in the rendered table.',
							'data-table-controller'
						)}
					</p>
					<DndContext
						sensors={sensors}
						collisionDetection={closestCenter}
						onDragEnd={onCustomDragEnd}
					>
						<SortableContext
							items={effectiveOrder}
							strategy={horizontalListSortingStrategy}
						>
							<div
								className="prc-data-table-controller-column-order__list"
								role="list"
							>
								{effectiveOrder.map((colKey) => (
									<SortableColumnChip
										key={colKey}
										id={colKey}
										label={colKey}
									/>
								))}
							</div>
						</SortableContext>
					</DndContext>
				</>
			)}
		</div>
	);
}
