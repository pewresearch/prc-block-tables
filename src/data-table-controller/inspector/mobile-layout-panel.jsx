/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import {
	PanelBody,
	SelectControl,
	CheckboxControl,
} from '@wordpress/components';

/**
 * Internal dependencies
 */
import MobileHeaderFormatLocked from '../controls/mobile-header-format-locked';
import MobileColumnHeaders from '../controls/mobile-column-headers';

/**
 * Inspector panel for mobile card header and per-column mobile visibility.
 *
 * @param {Object}   props
 * @param {boolean}  props.enabled
 * @param {Object}   props.contextMobileHeaderFormat
 * @param {Array}    props.mobileHeaderColumnOptions
 * @param {string}   props.mobileHeaderColumn
 * @param {string[]} props.visibleColumns
 * @param {unknown}  props.mobileHiddenColumns
 * @param {unknown}  props.mobileColumnHeaders
 * @param {Function} props.setAttributes
 */
export default function MobileLayoutPanel({
	enabled,
	contextMobileHeaderFormat,
	mobileHeaderColumnOptions,
	mobileHeaderColumn,
	visibleColumns,
	mobileHiddenColumns,
	mobileColumnHeaders,
	setAttributes,
}) {
	if (!enabled) {
		return null;
	}

	return (
		<PanelBody
			title={__('Mobile layout', 'data-table-controller')}
			initialOpen={false}
		>
			{contextMobileHeaderFormat ? (
				<MobileHeaderFormatLocked
					nameColumn={contextMobileHeaderFormat.nameColumn}
					yearColumn={contextMobileHeaderFormat.yearColumn}
				/>
			) : (
				mobileHeaderColumnOptions.length > 1 && (
					<SelectControl
						__next40pxDefaultSize
						label={__(
							'Mobile card header column',
							'data-table-controller'
						)}
						value={mobileHeaderColumn || ''}
						options={mobileHeaderColumnOptions}
						onChange={(value) =>
							setAttributes({
								mobileHeaderColumn: value,
							})
						}
						help={__(
							'On small screens, each row becomes a card with this column as the title.',
							'data-table-controller'
						)}
					/>
				)
			)}
			<p className="prc-data-table-controller-help">
				{__(
					'Uncheck columns to hide them on small screens only. Desktop column visibility is unchanged.',
					'data-table-controller'
				)}
			</p>
			{visibleColumns.map((col) => (
				<CheckboxControl
					key={`mobile-visible-${col}`}
					__nextHasNoMarginBottom
					label={col}
					checked={!mobileHiddenColumns?.includes(col)}
					onChange={(visible) => {
						const current = Array.isArray(mobileHiddenColumns)
							? mobileHiddenColumns
							: [];
						setAttributes({
							mobileHiddenColumns: visible
								? current.filter((c) => c !== col)
								: [...current, col],
						});
					}}
				/>
			))}
			<MobileColumnHeaders
				headers={mobileColumnHeaders}
				columns={visibleColumns}
				onHeadersChange={(nextHeaders) =>
					setAttributes({
						mobileColumnHeaders: nextHeaders,
					})
				}
			/>
		</PanelBody>
	);
}
