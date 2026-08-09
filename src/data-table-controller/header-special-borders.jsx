/**
 * Header special border controls for Data Table Controller.
 */
import { __ } from '@wordpress/i18n';
import { ColorPicker, ToggleControl } from '@wordpress/components';

import { DEFAULT_PALETTE } from '../data-table-key/edit-utils';

/**
 * Seed missing column colors from the default palette.
 *
 * @param {string[]}              columns Visible table columns.
 * @param {Record<string,string>} colors  Existing color map.
 * @return {Record<string,string>} Patched color map.
 */
export function seedHeaderBorderColors(columns, colors) {
	const prev = colors && typeof colors === 'object' ? { ...colors } : {};
	const used = new Set(Object.values(prev));
	let paletteIndex = 0;

	for (const column of columns) {
		if (prev[column]) {
			continue;
		}
		for (let guard = 0; guard < DEFAULT_PALETTE.length * 3; guard += 1) {
			const candidate =
				DEFAULT_PALETTE[paletteIndex % DEFAULT_PALETTE.length];
			paletteIndex += 1;
			if (!used.has(candidate)) {
				prev[column] = candidate;
				used.add(candidate);
				break;
			}
		}
		if (!prev[column]) {
			const fallback =
				DEFAULT_PALETTE[paletteIndex % DEFAULT_PALETTE.length];
			paletteIndex += 1;
			prev[column] = fallback;
		}
	}

	return prev;
}

/**
 * @param {Object}   props                   Props.
 * @param {boolean}  props.enabled           Whether special borders are on.
 * @param {Object}   props.colors            Column-to-color map.
 * @param {string[]} props.columns           Visible table columns.
 * @param {Function} props.onEnabledChange   Toggle callback.
 * @param {Function} props.onColorsChange    Colors map callback.
 */
export default function HeaderSpecialBorders({
	enabled,
	colors,
	columns,
	onEnabledChange,
	onColorsChange,
}) {
	const colorMap = colors && typeof colors === 'object' ? colors : {};
	const columnList = Array.isArray(columns) ? columns : [];

	const handleToggle = (value) => {
		if (value && columnList.length > 0) {
			onEnabledChange(true);
			onColorsChange(seedHeaderBorderColors(columnList, colorMap));
			return;
		}
		onEnabledChange(value);
	};

	const handleColorChange = (column, value) => {
		onColorsChange({
			...colorMap,
			[column]: value,
		});
	};

	return (
		<div className="prc-data-table-controller-header-special-borders">
			<ToggleControl
				label={__('Header special borders', 'data-table-controller')}
				help={__(
					'Adds a centered accent line along the top of each column header.',
					'data-table-controller'
				)}
				checked={enabled}
				onChange={handleToggle}
			/>
			{enabled && columnList.length > 0 && (
				<>
					<p className="prc-data-table-controller-help">
						{__(
							'Choose a color for each column header accent.',
							'data-table-controller'
						)}
					</p>
					{columnList.map((column) => (
						<div
							key={`header-border-${column}`}
							className="prc-data-table-controller-header-special-borders__row"
						>
							<p className="prc-data-table-controller-header-special-borders__label">
								{column}
							</p>
							<ColorPicker
								color={colorMap[column] || '#cccccc'}
								onChange={(value) =>
									handleColorChange(column, value)
								}
								enableAlpha={false}
							/>
						</div>
					))}
				</>
			)}
			{enabled && columnList.length === 0 && (
				<p className="prc-data-table-controller-help">
					{__(
						'Load table data to configure header border colors.',
						'data-table-controller'
					)}
				</p>
			)}
		</div>
	);
}
