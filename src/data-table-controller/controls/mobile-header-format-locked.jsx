/**
 * Read-only notice when mobile card header format is provided by context.
 */
import { __, sprintf } from '@wordpress/i18n';

/**
 * @param {Object} props            Props.
 * @param {string} props.nameColumn Context-provided name column key.
 * @param {string} props.yearColumn Context-provided year column key.
 */
export default function MobileHeaderFormatLocked({ nameColumn, yearColumn }) {
	const name =
		typeof nameColumn === 'string' && nameColumn.trim()
			? nameColumn.trim()
			: '';
	const year =
		typeof yearColumn === 'string' && yearColumn.trim()
			? yearColumn.trim()
			: '';

	if (!name || !year) {
		return null;
	}

	return (
		<div className="prc-data-table-controller-mobile-header-format">
			<p className="prc-data-table-controller-help">
				{sprintf(
					/* translators: 1: name column label, 2: year column label */
					__(
						'Mobile card titles use %1$s (%2$s) for this projections table and cannot be edited here.',
						'data-table-controller'
					),
					name,
					year
				)}
			</p>
		</div>
	);
}
