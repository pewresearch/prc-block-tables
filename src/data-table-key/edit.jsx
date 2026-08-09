/**
 * WordPress Dependencies
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	ColorPicker,
	ToggleControl,
	Button,
} from '@wordpress/components';
import { useEffect, useMemo } from '@wordpress/element';
import { chevronDown, chevronUp } from '@wordpress/icons';

/**
 * Internal Dependencies
 */
import {
	buildFreshColorMap,
	getKeyColumnOptions,
	sortedUniques,
	DEFAULT_PALETTE,
} from './edit-utils';
import { useControllerTableData } from './use-controller-table';

/**
 * @param {Record<string, string>} colorMap Attribute map.
 * @param {string[]}               order    Display order (sorted uniques).
 * @return {Record<string, string>} Patched map for new/changed rows.
 */
function syncColorMapToRows(colorMap, order) {
	const prev =
		colorMap && typeof colorMap === 'object' ? { ...colorMap } : {};
	for (const k of Object.keys(prev)) {
		if (!order.includes(k)) {
			delete prev[k];
		}
	}
	const used = new Set(Object.values(prev));
	let p = 0;
	for (const u of order) {
		if (prev[u]) {
			continue;
		}
		for (let guard = 0; guard < DEFAULT_PALETTE.length * 3; guard += 1) {
			const c = DEFAULT_PALETTE[p % DEFAULT_PALETTE.length];
			p += 1;
			if (!used.has(c)) {
				prev[u] = c;
				used.add(c);
				break;
			}
		}
		if (!prev[u]) {
			const c = DEFAULT_PALETTE[p % DEFAULT_PALETTE.length];
			p += 1;
			prev[u] = c;
		}
	}
	return prev;
}

/**
 * @param {string[]} keyOrder  Saved display order.
 * @param {string[]} canonical Sorted uniques from table data.
 * @return {string[]} Reconciled order.
 */
function reconcileKeyOrder(keyOrder, canonical) {
	if (!canonical.length) {
		return [];
	}
	if (!keyOrder?.length) {
		return canonical;
	}
	const canonicalSet = new Set(canonical);
	const ordered = keyOrder.filter((label) => canonicalSet.has(label));
	const inOrder = new Set(ordered);
	for (const label of canonical) {
		if (!inOrder.has(label)) {
			ordered.push(label);
		}
	}
	return ordered;
}

/**
 * @param {string[]} excludedKeys Saved excluded labels.
 * @param {string[]} canonical    Sorted uniques from table data.
 * @return {string[]} Reconciled exclusions.
 */
function reconcileExcludedKeys(excludedKeys, canonical) {
	if (!excludedKeys?.length || !canonical.length) {
		return [];
	}
	const canonicalSet = new Set(canonical);
	return excludedKeys.filter((label) => canonicalSet.has(label));
}

function KeyColorRow({
	label,
	index,
	total,
	color,
	isExcluded,
	onMoveUp,
	onMoveDown,
	onColorChange,
	onToggleInclusion,
}) {
	return (
		<div
			className={
				isExcluded
					? 'prc-data-table-key__color-row prc-data-table-key__color-row--excluded'
					: 'prc-data-table-key__color-row'
			}
		>
			<div className="prc-data-table-key__color-row-header">
				<p className="prc-data-table-key__color-label">{label}</p>
				<div className="prc-data-table-key__reorder">
					<Button
						icon={chevronUp}
						label={__('Move up', 'data-table-key')}
						size="small"
						disabled={index === 0}
						onClick={onMoveUp}
					/>
					<Button
						icon={chevronDown}
						label={__('Move down', 'data-table-key')}
						size="small"
						disabled={index === total - 1}
						onClick={onMoveDown}
					/>
				</div>
			</div>
			<ToggleControl
				label={__('Include in legend', 'data-table-key')}
				checked={!isExcluded}
				onChange={onToggleInclusion}
			/>
			<ColorPicker
				color={color}
				onChange={onColorChange}
				enableAlpha={false}
			/>
		</div>
	);
}

function LegendPreview({ orderedLabels, colorMap, enableFilter, excludedSet }) {
	return (
		<div
			className="prc-data-table-key__legend"
			role={enableFilter ? 'group' : 'list'}
			aria-label={__('Legend', 'data-table-key')}
		>
			{orderedLabels.map((label) => {
				const isExcluded = excludedSet.has(label);
				const baseClass = enableFilter
					? 'prc-data-table-key__item prc-data-table-key__item--button'
					: 'prc-data-table-key__item';
				const itemClassName = isExcluded
					? `${baseClass} prc-data-table-key__item--excluded`
					: baseClass;
				const swatch = (
					<span
						className="prc-data-table-key__swatch"
						style={{
							backgroundColor: colorMap[label] || '#ccc',
						}}
						aria-hidden="true"
					/>
				);
				const labelEl = (
					<span className="prc-data-table-key__label">{label}</span>
				);

				if (enableFilter) {
					return (
						<button
							key={label}
							type="button"
							className={itemClassName}
						>
							{swatch}
							{labelEl}
						</button>
					);
				}

				return (
					<span key={label} className={itemClassName} role="listitem">
						{swatch}
						{labelEl}
					</span>
				);
			})}
		</div>
	);
}

export default function Edit({ attributes, setAttributes, context, clientId }) {
	const { keyColumn, colorMap, enableFilter, keyOrder, excludedKeys } =
		attributes;
	const instanceId = context['prc-block/dataTableInstanceId'] || '';
	const dataSource = context['prc-block/dataTableDataSource'] || 'csv';
	const providerContext = context['prc-block/dataTableData'];

	const blockProps = useBlockProps({
		className: 'wp-block-prc-block-data-table-key',
	});

	const { columns, rows } = useControllerTableData({
		clientId,
		dataSource,
		providerContext,
	});

	const columnOptions = useMemo(
		() => getKeyColumnOptions(rows, columns),
		[rows, columns]
	);

	const canonicalLabels = useMemo(() => {
		if (!keyColumn) {
			return [];
		}
		return sortedUniques(rows, keyColumn);
	}, [keyColumn, rows]);

	const orderedLabels = useMemo(
		() => reconcileKeyOrder(keyOrder, canonicalLabels),
		[keyOrder, canonicalLabels]
	);

	useEffect(() => {
		if (!keyColumn || !canonicalLabels.length) {
			return;
		}
		const reconciled = reconcileKeyOrder(keyOrder, canonicalLabels);
		if (JSON.stringify(reconciled) !== JSON.stringify(keyOrder)) {
			setAttributes({ keyOrder: reconciled });
		}
	}, [keyColumn, canonicalLabels, keyOrder, setAttributes]);

	useEffect(() => {
		if (!keyColumn || !canonicalLabels.length) {
			return;
		}
		const reconciled = reconcileExcludedKeys(excludedKeys, canonicalLabels);
		if (JSON.stringify(reconciled) !== JSON.stringify(excludedKeys)) {
			setAttributes({ excludedKeys: reconciled });
		}
	}, [keyColumn, canonicalLabels, excludedKeys, setAttributes]);

	useEffect(() => {
		if (!keyColumn || !orderedLabels.length) {
			return;
		}
		const next = syncColorMapToRows(colorMap, orderedLabels);
		if (JSON.stringify(next) !== JSON.stringify(colorMap)) {
			setAttributes({ colorMap: next });
		}
	}, [keyColumn, orderedLabels, colorMap, setAttributes]);

	const handleColumnChange = (newCol) => {
		if (!newCol) {
			setAttributes({
				keyColumn: '',
				colorMap: {},
				keyOrder: [],
				excludedKeys: [],
			});
			return;
		}
		const uniques = sortedUniques(rows, newCol);
		setAttributes({
			keyColumn: newCol,
			colorMap: buildFreshColorMap(uniques),
			keyOrder: uniques,
			excludedKeys: [],
		});
	};

	const excludedSet = useMemo(
		() => new Set(excludedKeys ?? []),
		[excludedKeys]
	);

	const toggleLegendInclusion = (label, include) => {
		const current = excludedKeys ?? [];
		if (include) {
			setAttributes({
				excludedKeys: current.filter((key) => key !== label),
			});
			return;
		}
		if (current.includes(label)) {
			return;
		}
		setAttributes({ excludedKeys: [...current, label] });
	};

	const moveItem = (index, direction) => {
		const next = [...orderedLabels];
		const target = index + direction;
		if (target < 0 || target >= next.length) {
			return;
		}
		[next[index], next[target]] = [next[target], next[index]];
		setAttributes({ keyOrder: next });
	};

	const handleColorChange = (value, label) => {
		setAttributes({
			colorMap: {
				...colorMap,
				[label]: value,
			},
		});
	};

	const selectOptions = [
		{ label: __('Select column…', 'data-table-key'), value: '' },
		...columnOptions,
	];

	return (
		<>
			<InspectorControls>
				<PanelBody
					title={__('Key colors', 'data-table-key')}
					initialOpen
				>
					<SelectControl
						label={__('Key column', 'data-table-key')}
						help={__(
							'Only columns with 20 or fewer unique values are listed.',
							'data-table-key'
						)}
						value={keyColumn}
						options={selectOptions}
						onChange={handleColumnChange}
					/>
					<ToggleControl
						label={__(
							'Make key items filter the table',
							'data-table-key'
						)}
						help={__(
							'When enabled, clicking a legend item filters the table to rows matching that value in the key column.',
							'data-table-key'
						)}
						checked={enableFilter}
						onChange={(value) =>
							setAttributes({ enableFilter: value })
						}
					/>
					{keyColumn
						? orderedLabels.map((label, index) => (
								<KeyColorRow
									key={label}
									label={label}
									index={index}
									total={orderedLabels.length}
									color={colorMap[label] || '#cccccc'}
									isExcluded={excludedSet.has(label)}
									onMoveUp={() => moveItem(index, -1)}
									onMoveDown={() => moveItem(index, 1)}
									onColorChange={(c) =>
										handleColorChange(c, label)
									}
									onToggleInclusion={(include) =>
										toggleLegendInclusion(label, include)
									}
								/>
							))
						: null}
				</PanelBody>
			</InspectorControls>
			<div {...blockProps}>
				{instanceId ? (
					<p className="prc-data-table-key__id">
						<code>id: {instanceId}</code>
					</p>
				) : null}
				{!keyColumn ? (
					<p className="prc-data-table-key__placeholder">
						{__(
							'Choose a key column in the block sidebar (≤20 unique values).',
							'data-table-key'
						)}
					</p>
				) : (
					<LegendPreview
						orderedLabels={orderedLabels}
						colorMap={colorMap}
						enableFilter={enableFilter}
						excludedSet={excludedSet}
					/>
				)}
			</div>
		</>
	);
}
