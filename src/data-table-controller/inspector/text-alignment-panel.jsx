/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { PanelBody, SelectControl } from '@wordpress/components';

const ALIGN_OPTIONS = [
	{ label: __('Left', 'data-table-controller'), value: 'left' },
	{ label: __('Center', 'data-table-controller'), value: 'center' },
	{ label: __('Right', 'data-table-controller'), value: 'right' },
];

/**
 * Inspector panel for header and body text alignment.
 *
 * @param {Object}   props
 * @param {string}   props.tableHeaderTextAlign
 * @param {string}   props.tableTextAlign
 * @param {Function} props.setAttributes
 */
export default function TextAlignmentPanel({
	tableHeaderTextAlign,
	tableTextAlign,
	setAttributes,
}) {
	return (
		<PanelBody
			title={__('Text alignment', 'data-table-controller')}
			initialOpen={false}
		>
			<SelectControl
				__next40pxDefaultSize
				label={__('Header text alignment', 'data-table-controller')}
				value={tableHeaderTextAlign || tableTextAlign || 'center'}
				options={ALIGN_OPTIONS}
				onChange={(value) =>
					setAttributes({ tableHeaderTextAlign: value })
				}
				help={__(
					'Applies to header cells except the first column. On mobile, all text is centered.',
					'data-table-controller'
				)}
			/>
			<SelectControl
				__next40pxDefaultSize
				label={__('Data cell text alignment', 'data-table-controller')}
				value={tableTextAlign || 'center'}
				options={ALIGN_OPTIONS}
				onChange={(value) => setAttributes({ tableTextAlign: value })}
				help={__(
					'Applies to data and dropdown row cells except the first column. On mobile, all text is centered.',
					'data-table-controller'
				)}
			/>
		</PanelBody>
	);
}
