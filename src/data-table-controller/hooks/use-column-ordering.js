/**
 * External dependencies
 */
import { arrayMove } from '@dnd-kit/sortable';

/**
 * WordPress dependencies
 */
import { useEffect, useMemo } from '@wordpress/element';

/**
 * Internal dependencies
 */
import {
	buildAutoColumnOrder,
	columnOrdersEqual,
	computeAutoSortOrder,
	getAutoSortRowOptions,
	getExcludedSides,
	mergeColumnOrder,
	normalizeAutoColumnOrder,
	resolveAutoSortRowIndex,
} from '../lib/edit-utils';

const ORDER_ATTRIBUTE = {
	desktop: 'columnOrder',
	mobile: 'mobileColumnOrder',
};

/**
 * Derive column order, auto-sort state, and drag handlers for one viewport.
 *
 * @param {Object}   params
 * @param {string}   params.viewport
 * @param {boolean}  params.enabled
 * @param {string}   params.sortMode
 * @param {string}   params.autoSortVariable
 * @param {number}   params.autoSortRowIndex
 * @param {string}   params.autoSortRowValue
 * @param {unknown}  params.autoSortExcludedColumns
 * @param {unknown}  params.savedOrder
 * @param {unknown}  params.jsonColumns
 * @param {unknown}  params.hiddenColumns
 * @param {string[]} params.visibleColumns
 * @param {Array}    params.previewRows
 * @param {Function} params.setAttributes
 * @return {Object} Column-order state for inspector controls and the preview strip.
 */
export function useColumnOrdering({
	viewport,
	enabled,
	sortMode,
	autoSortVariable,
	autoSortRowIndex,
	autoSortRowValue,
	autoSortExcludedColumns,
	savedOrder,
	jsonColumns,
	hiddenColumns,
	visibleColumns,
	previewRows,
	setAttributes,
}) {
	const orderAttribute = ORDER_ATTRIBUTE[viewport];
	const isConfigured = viewport === 'desktop' || sortMode !== 'inherit';
	const isAutoSort = enabled && sortMode === 'auto';

	const autoSortExcluded = useMemo(
		() =>
			Array.isArray(autoSortExcludedColumns)
				? autoSortExcludedColumns
				: [],
		[autoSortExcludedColumns]
	);

	const effectiveOrder = useMemo(
		() =>
			mergeColumnOrder({
				columns: jsonColumns,
				savedOrder,
				hidden: hiddenColumns,
			}),
		[jsonColumns, hiddenColumns, savedOrder]
	);

	const autoSortRowOptions = useMemo(
		() =>
			getAutoSortRowOptions({
				rows: previewRows,
				variable: autoSortVariable,
			}),
		[previewRows, autoSortVariable]
	);

	const resolvedAutoSortRowIndex = useMemo(
		() =>
			resolveAutoSortRowIndex({
				rows: previewRows,
				variable: autoSortVariable,
				rowValue: autoSortRowValue,
				rowIndex: autoSortRowIndex,
			}),
		[previewRows, autoSortVariable, autoSortRowValue, autoSortRowIndex]
	);

	const autoSortedOrder = useMemo(() => {
		if (!isAutoSort || resolvedAutoSortRowIndex === null) {
			return [];
		}
		return computeAutoSortOrder({
			rows: previewRows,
			rowIndex: resolvedAutoSortRowIndex,
			columns: jsonColumns,
			excluded: autoSortExcluded,
			hidden: hiddenColumns,
		});
	}, [
		isAutoSort,
		resolvedAutoSortRowIndex,
		previewRows,
		jsonColumns,
		autoSortExcluded,
		hiddenColumns,
	]);

	const { beforeOrder: excludedBefore, afterOrder: excludedAfter } =
		useMemo(() => {
			if (!isAutoSort) {
				return { beforeOrder: [], afterOrder: [] };
			}
			return getExcludedSides({
				columnOrder: savedOrder,
				excluded: autoSortExcluded,
				visible: visibleColumns,
				autoOrder: autoSortedOrder,
			});
		}, [
			isAutoSort,
			savedOrder,
			autoSortExcluded,
			visibleColumns,
			autoSortedOrder,
		]);

	const computedAutoColumnOrder = useMemo(() => {
		if (!isAutoSort) {
			return [];
		}
		return buildAutoColumnOrder({
			beforeOrder: excludedBefore,
			autoOrder: autoSortedOrder,
			afterOrder: excludedAfter,
		});
	}, [isAutoSort, excludedBefore, excludedAfter, autoSortedOrder]);

	useEffect(() => {
		if (!isAutoSort || resolvedAutoSortRowIndex === null) {
			return;
		}
		if (!columnOrdersEqual(savedOrder, computedAutoColumnOrder)) {
			setAttributes({ [orderAttribute]: computedAutoColumnOrder });
		}
	}, [
		isAutoSort,
		resolvedAutoSortRowIndex,
		computedAutoColumnOrder,
		savedOrder,
		orderAttribute,
		setAttributes,
	]);

	const handleCustomDragEnd = ({ active, over }) => {
		if (!over || active.id === over.id) {
			return;
		}
		const oldIndex = effectiveOrder.indexOf(active.id);
		const newIndex = effectiveOrder.indexOf(over.id);
		if (oldIndex < 0 || newIndex < 0) {
			return;
		}
		setAttributes({
			[orderAttribute]: arrayMove(effectiveOrder, oldIndex, newIndex),
		});
	};

	const handleAutoExcludedDragEnd = ({ active, over }) => {
		if (!over || active.id === over.id) {
			return;
		}
		const previewItems = [
			...excludedBefore,
			...autoSortedOrder,
			...excludedAfter,
		];
		const oldIndex = previewItems.indexOf(active.id);
		const newIndex = previewItems.indexOf(over.id);
		if (oldIndex < 0 || newIndex < 0) {
			return;
		}
		setAttributes({
			[orderAttribute]: normalizeAutoColumnOrder(
				arrayMove(previewItems, oldIndex, newIndex),
				autoSortedOrder,
				autoSortExcluded
			),
		});
	};

	const showOrderUi =
		enabled &&
		isConfigured &&
		(isAutoSort
			? excludedBefore.length +
					excludedAfter.length +
					autoSortedOrder.length >
				1
			: effectiveOrder.length > 1);

	return {
		isAutoSort,
		autoSortExcluded,
		autoSortRowOptions,
		controlRowIndex: resolvedAutoSortRowIndex ?? autoSortRowIndex,
		effectiveOrder,
		excludedBefore,
		excludedAfter,
		autoSortedOrder,
		sortReferenceRow:
			resolvedAutoSortRowIndex !== null
				? previewRows[resolvedAutoSortRowIndex]
				: null,
		handleCustomDragEnd,
		handleAutoExcludedDragEnd,
		showOrderUi,
	};
}
