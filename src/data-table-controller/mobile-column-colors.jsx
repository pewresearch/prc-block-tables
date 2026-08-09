/**
 * Mobile column background color controls for Data Table Controller.
 */
import { __ } from '@wordpress/i18n';
import { TextControl } from '@wordpress/components';

const HEX_COLOR_PATTERN = /^#([A-Fa-f0-9]{3,4}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/;

/**
 * @param {string} value Raw hex input.
 * @return {string} Normalized hex or empty string when invalid.
 */
function normalizeHexColor(value) {
	const trimmed = String(value ?? '').trim();
	if (!trimmed) {
		return '';
	}
	return HEX_COLOR_PATTERN.test(trimmed) ? trimmed.toLowerCase() : trimmed;
}

/**
 * @param {Object}   props                Props.
 * @param {Object}   props.colors         Column-to-color map.
 * @param {string[]} props.columns        Visible table columns.
 * @param {Function} props.onColorsChange Colors map callback.
 */
export default function MobileColumnColors({
	colors,
	columns,
	onColorsChange,
}) {
	const colorMap = colors && typeof colors === 'object' ? colors : {};
	const columnList = Array.isArray(columns) ? columns : [];

	const handleColorChange = (column, value) => {
		const next = { ...colorMap };
		const normalized = normalizeHexColor(value);
		if (!normalized) {
			delete next[column];
		} else {
			next[column] = normalized;
		}
		onColorsChange(next);
	};

	return (
		<div className="prc-data-table-controller-mobile-column-colors">
			<p className="prc-data-table-controller-help">
				{__(
					'Paste a hex color for each column to override the default mobile cell background. Leave empty to use the default grey.',
					'data-table-controller'
				)}
			</p>
			{columnList.length > 0 ? (
				columnList.map((column) => {
					const color = colorMap[column] || '';
					const isValid = !color || HEX_COLOR_PATTERN.test(color);

					return (
						<div
							key={`mobile-column-color-${column}`}
							className="prc-data-table-controller-mobile-column-colors__row"
						>
							<p className="prc-data-table-controller-mobile-column-colors__label">
								{column}
							</p>
							<div className="prc-data-table-controller-mobile-column-colors__input">
								<span
									className="prc-data-table-controller-mobile-column-colors__swatch"
									style={{
										backgroundColor: isValid
											? color || 'rgb(0 0 0 / 5%)'
											: 'transparent',
									}}
									aria-hidden="true"
								/>
								<TextControl
									__next40pxDefaultSize
									__nextHasNoMarginBottom
									label={__(
										'Mobile background color',
										'data-table-controller'
									)}
									hideLabelFromVision
									value={color}
									placeholder="#00000"
									onChange={(value) =>
										handleColorChange(column, value)
									}
									help={
										!isValid
											? __(
													'Enter a valid hex color (e.g. #FDA72733).',
													'data-table-controller'
												)
											: undefined
									}
								/>
							</div>
						</div>
					);
				})
			) : (
				<p className="prc-data-table-controller-help">
					{__(
						'Load table data to configure mobile column colors.',
						'data-table-controller'
					)}
				</p>
			)}
		</div>
	);
}
