/**
 * Bold column controls for Data Table Controller.
 */
import { __ } from '@wordpress/i18n';
import { CheckboxControl } from '@wordpress/components';

/**
 * @param {Object}   props                     Props.
 * @param {string[]} props.boldColumns         Column keys with bold body cells.
 * @param {string[]} props.columns             Visible table columns.
 * @param {Function} props.onBoldColumnsChange Bold columns callback.
 */
export default function BoldColumns({
	boldColumns,
	columns,
	onBoldColumnsChange,
}) {
	const boldList = Array.isArray(boldColumns) ? boldColumns : [];
	const columnList = Array.isArray(columns) ? columns : [];

	const handleToggle = (column, bold) => {
		const next = bold
			? [...boldList, column]
			: boldList.filter((col) => col !== column);
		onBoldColumnsChange(next);
	};

	return (
		<div className="prc-data-table-controller-bold-columns">
			<p className="prc-data-table-controller-help">
				{__(
					'Bold body cells in selected columns. Header cells are unchanged.',
					'data-table-controller'
				)}
			</p>
			{columnList.length > 0 ? (
				columnList.map((column) => (
					<CheckboxControl
						key={`bold-column-${column}`}
						label={column}
						checked={boldList.includes(column)}
						onChange={(bold) => handleToggle(column, bold)}
					/>
				))
			) : (
				<p className="prc-data-table-controller-help">
					{__(
						'Load table data to configure bold columns.',
						'data-table-controller'
					)}
				</p>
			)}
		</div>
	);
}
