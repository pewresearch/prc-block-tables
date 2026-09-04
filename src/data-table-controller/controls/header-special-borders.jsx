/**
 * Header special border controls for Data Table Controller.
 */
import { __ } from '@wordpress/i18n';
import { ToggleControl } from '@wordpress/components';

/**
 * @param {Object}   props                 Props.
 * @param {boolean}  props.enabled         Whether special borders are on.
 * @param {Function} props.onEnabledChange Toggle callback.
 */
export default function HeaderSpecialBorders({ enabled, onEnabledChange }) {
	return (
		<div className="prc-data-table-controller-header-special-borders">
			<ToggleControl
				label={__('Header special borders', 'data-table-controller')}
				help={__(
					'Adds a centered accent line along the top of each religion column header, using the Religious Projections icon colors.',
					'data-table-controller'
				)}
				checked={enabled}
				onChange={onEnabledChange}
			/>
		</div>
	);
}
