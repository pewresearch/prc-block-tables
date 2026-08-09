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
 * @param {string[]}    props.excludedOrder         Auto mode excluded columns.
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
	excludedOrder,
	autoSortedOrder,
	sortReferenceRow,
	sensors,
	onCustomDragEnd,
	onAutoExcludedDragEnd,
}) {
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
							'Excluded columns can be reordered. Remaining columns are auto-sorted by the selected row (descending).',
							'data-table-controller'
						)}
					</p>
					{excludedOrder.length > 0 && (
						<div className="prc-data-table-controller-column-order__group">
							<p className="prc-data-table-controller-column-order__group-title">
								{__(
									'Excluded from auto sort',
									'data-table-controller'
								)}
							</p>
							<DndContext
								sensors={sensors}
								collisionDetection={closestCenter}
								onDragEnd={onAutoExcludedDragEnd}
							>
								<SortableContext
									items={excludedOrder}
									strategy={horizontalListSortingStrategy}
								>
									<div
										className="prc-data-table-controller-column-order__list"
										role="list"
									>
										{excludedOrder.map((colKey) => (
											<SortableColumnChip
												key={colKey}
												id={colKey}
												label={colKey}
											/>
										))}
									</div>
								</SortableContext>
							</DndContext>
						</div>
					)}
					{autoSortedOrder.length > 0 && (
						<div className="prc-data-table-controller-column-order__group">
							<p className="prc-data-table-controller-column-order__group-title">
								{__(
									'Auto-sorted (locked)',
									'data-table-controller'
								)}
							</p>
							<div
								className="prc-data-table-controller-column-order__list prc-data-table-controller-column-order__list--locked"
								role="list"
							>
								{autoSortedOrder.map((colKey) => {
									const cellValue =
										sortReferenceRow?.[colKey];
									const suffix =
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
											disabled
											suffix={suffix}
										/>
									);
								})}
							</div>
						</div>
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
