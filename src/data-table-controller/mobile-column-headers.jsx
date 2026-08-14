/**
 * Mobile column header label controls for Data Table Controller.
 */
import { __ } from '@wordpress/i18n';
import { TextControl } from '@wordpress/components';

/**
 * @param {Object}   props                 Props.
 * @param {Object}   props.headers         Column-to-mobile-header map.
 * @param {string[]} props.columns         Visible table columns.
 * @param {Function} props.onHeadersChange Headers map callback.
 */
export default function MobileColumnHeaders({
	headers,
	columns,
	onHeadersChange,
}) {
	const headerMap = headers && typeof headers === 'object' ? headers : {};
	const columnList = Array.isArray(columns) ? columns : [];

	const handleHeaderChange = (column, value) => {
		const next = { ...headerMap };
		const trimmed = String(value ?? '').trim();
		if (!trimmed) {
			delete next[column];
		} else {
			next[column] = trimmed;
		}
		onHeadersChange(next);
	};

	return (
		<div className="prc-data-table-controller-mobile-column-headers">
			<p className="prc-data-table-controller-help">
				{__(
					'Enter a shorter label for each column to display above cell values on small screens. Leave empty to use the full column header.',
					'data-table-controller'
				)}
			</p>
			{columnList.length > 0 ? (
				columnList.map((column) => {
					const substitute = headerMap[column] || '';

					return (
						<div
							key={`mobile-column-header-${column}`}
							className="prc-data-table-controller-mobile-column-headers__row"
						>
							<p className="prc-data-table-controller-mobile-column-headers__label">
								{column}
							</p>
							<TextControl
								__next40pxDefaultSize
								__nextHasNoMarginBottom
								label={__(
									'Mobile header label',
									'data-table-controller'
								)}
								hideLabelFromVision
								value={substitute}
								placeholder={column}
								onChange={(value) =>
									handleHeaderChange(column, value)
								}
							/>
						</div>
					);
				})
			) : (
				<p className="prc-data-table-controller-help">
					{__(
						'Load table data to configure mobile column headers.',
						'data-table-controller'
					)}
				</p>
			)}
		</div>
	);
}
