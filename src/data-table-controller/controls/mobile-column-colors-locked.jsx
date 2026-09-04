/**
 * Read-only notice when mobile column colors are provided by context.
 */
import { __ } from '@wordpress/i18n';

/**
 * @param {Object} props                   Props.
 * @param {string} props.background        Context-provided mobile cell background hex.
 * @param {string} [props.worldBackground] Context-provided World-column mobile background hex.
 */
export default function MobileColumnColorsLocked({
	background,
	worldBackground = '',
}) {
	const color =
		typeof background === 'string' && background.trim()
			? background.trim()
			: '';
	const worldColor =
		typeof worldBackground === 'string' && worldBackground.trim()
			? worldBackground.trim()
			: '';

	return (
		<div className="prc-data-table-controller-mobile-column-colors">
			<p className="prc-data-table-controller-help">
				{__(
					'Mobile cell backgrounds are set automatically for this religion page and cannot be edited here.',
					'data-table-controller'
				)}
			</p>
			{color ? (
				<div className="prc-data-table-controller-mobile-column-colors__row">
					<p className="prc-data-table-controller-mobile-column-colors__label">
						{__('Mobile background', 'data-table-controller')}
					</p>
					<div className="prc-data-table-controller-mobile-column-colors__input">
						<span
							className="prc-data-table-controller-mobile-column-colors__swatch"
							style={{ backgroundColor: color }}
							aria-hidden="true"
						/>
						<code>{color}</code>
					</div>
				</div>
			) : null}
			{worldColor ? (
				<div className="prc-data-table-controller-mobile-column-colors__row">
					<p className="prc-data-table-controller-mobile-column-colors__label">
						{__('World column', 'data-table-controller')}
					</p>
					<div className="prc-data-table-controller-mobile-column-colors__input">
						<span
							className="prc-data-table-controller-mobile-column-colors__swatch"
							style={{ backgroundColor: worldColor }}
							aria-hidden="true"
						/>
						<code>{worldColor}</code>
					</div>
				</div>
			) : null}
		</div>
	);
}
