/**
 * WordPress dependencies
 */
import { __, sprintf } from '@wordpress/i18n';
import { PanelBody, SelectControl } from '@wordpress/components';

/**
 * Inspector panel for multi-sheet default selection.
 *
 * @param {Object}   props
 * @param {boolean}  props.isMultiSheetJson
 * @param {string[]} props.sheetNames
 * @param {string}   props.resolvedDefaultSheet
 * @param {Function} props.setAttributes
 */
export default function SheetsPanel({
	isMultiSheetJson,
	sheetNames,
	resolvedDefaultSheet,
	setAttributes,
}) {
	if (
		!isMultiSheetJson ||
		!Array.isArray(sheetNames) ||
		sheetNames.length === 0
	) {
		return null;
	}

	return (
		<PanelBody
			title={__('Sheets', 'data-table-controller')}
			initialOpen={false}
		>
			<SelectControl
				__next40pxDefaultSize
				label={__('Default sheet', 'data-table-controller')}
				value={resolvedDefaultSheet}
				options={sheetNames.map((name) => ({
					label: name,
					value: name,
				}))}
				onChange={(value) => setAttributes({ defaultJsonSheet: value })}
			/>
			<p className="prc-data-table-controller-help">
				{sprintf(
					/* translators: %s: comma-separated sheet names */
					__(
						'Detected sheets: %s. Filter buttons toggle between them on the frontend.',
						'data-table-controller'
					),
					sheetNames.join(', ')
				)}
			</p>
		</PanelBody>
	);
}
