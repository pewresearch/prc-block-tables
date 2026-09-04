/**
 * WordPress dependencies
 */
import { __, sprintf } from '@wordpress/i18n';
import { useMemo } from '@wordpress/element';
import {
	PanelBody,
	TextControl,
	ToggleControl,
	CheckboxControl,
} from '@wordpress/components';

/**
 * Internal dependencies
 */
import ValueFormatRules from '../controls/value-format-rules';
import AbbreviationFormatRules from '../controls/abbreviation-format-rules';
import MobileValueFormatRules from '../controls/mobile-value-format-rules';

/**
 * Inspector panels for desktop and mobile value formatting.
 *
 * @param {Object}   props
 * @param {string}   props.valuePrefix
 * @param {string}   props.valueSuffix
 * @param {unknown}  props.valueFormatSheets
 * @param {unknown}  props.valueFormatExcludedColumns
 * @param {string[]} props.valueFormatColumns
 * @param {string[]} props.sheetNames
 * @param {string}   props.dataSource
 * @param {boolean}  props.hasRemoteResults
 * @param {boolean}  props.hasContextData
 * @param {unknown}  props.valueFormatRules
 * @param {boolean}  props.enableDesktopAbbreviation
 * @param {unknown}  props.valueAbbreviationRules
 * @param {unknown}  props.mobileValueFormatRules
 * @param {Function} props.setAttributes
 */
export default function ValueFormattingPanel({
	valuePrefix,
	valueSuffix,
	valueFormatSheets,
	valueFormatExcludedColumns,
	valueFormatColumns,
	sheetNames,
	dataSource,
	hasRemoteResults,
	hasContextData,
	valueFormatRules,
	enableDesktopAbbreviation,
	valueAbbreviationRules,
	mobileValueFormatRules,
	setAttributes,
}) {
	const valueFormatExcluded = useMemo(
		() =>
			Array.isArray(valueFormatExcludedColumns)
				? valueFormatExcludedColumns
				: [],
		[valueFormatExcludedColumns]
	);
	const valueFormatSelectedSheets = useMemo(
		() =>
			Array.isArray(valueFormatSheets)
				? valueFormatSheets.map(String)
				: [],
		[valueFormatSheets]
	);

	return [
		<PanelBody
			key="value-formatting"
			title={__('Value formatting', 'data-table-controller')}
			initialOpen={false}
		>
			<TextControl
				__next40pxDefaultSize
				label={__('Prefix', 'data-table-controller')}
				value={valuePrefix}
				onChange={(value) =>
					setAttributes({ valuePrefix: value ?? '' })
				}
				help={__(
					'Added before each value, e.g. $',
					'data-table-controller'
				)}
			/>
			<TextControl
				__next40pxDefaultSize
				label={__('Suffix', 'data-table-controller')}
				value={valueSuffix}
				onChange={(value) =>
					setAttributes({ valueSuffix: value ?? '' })
				}
				help={__(
					'Added after each value, e.g. %',
					'data-table-controller'
				)}
			/>
			{Array.isArray(sheetNames) && sheetNames.length > 1 && (
				<>
					<p className="prc-data-table-controller-help">
						{__(
							'Sheets (none selected = all sheets)',
							'data-table-controller'
						)}
					</p>
					{sheetNames.map((sheet) => (
						<CheckboxControl
							key={`value-format-sheet-${sheet}`}
							__nextHasNoMarginBottom
							label={sheet}
							checked={valueFormatSelectedSheets.includes(sheet)}
							onChange={(checked) => {
								const next = checked
									? [
											...valueFormatSelectedSheets.filter(
												(s) => s !== sheet
											),
											sheet,
										]
									: valueFormatSelectedSheets.filter(
											(s) => s !== sheet
										);
								setAttributes({
									valueFormatSheets: next,
								});
							}}
						/>
					))}
				</>
			)}
			{valueFormatColumns.length > 0 && (
				<>
					<p className="prc-data-table-controller-help">
						{__(
							'Check columns to exclude from prefix/suffix (e.g. row labels). Includes columns shown only in row dropdowns. Non-empty cells only; sorting and filtering use raw values.',
							'data-table-controller'
						)}
					</p>
					{valueFormatColumns.map((col) => (
						<CheckboxControl
							key={`value-format-exclude-${col}`}
							__nextHasNoMarginBottom
							label={sprintf(
								/* translators: %s: column name */
								__('Exclude %s', 'data-table-controller'),
								col
							)}
							checked={valueFormatExcluded.includes(col)}
							onChange={(excluded) => {
								const next = excluded
									? [...valueFormatExcluded, col]
									: valueFormatExcluded.filter(
											(c) => c !== col
										);
								setAttributes({
									valueFormatExcludedColumns: next,
								});
							}}
						/>
					))}
				</>
			)}
			{dataSource === 'remote' &&
				!hasRemoteResults &&
				valueFormatColumns.length === 0 && (
					<p className="prc-data-table-controller-help">
						{__(
							'Load remote data to choose columns to exclude from formatting.',
							'data-table-controller'
						)}
					</p>
				)}
			{dataSource === 'context' &&
				!hasContextData &&
				valueFormatColumns.length === 0 && (
					<p className="prc-data-table-controller-help">
						{__(
							'Load provider context data to choose columns to exclude from formatting.',
							'data-table-controller'
						)}
					</p>
				)}
			{dataSource === 'firebase' &&
				!hasContextData &&
				valueFormatColumns.length === 0 && (
					<p className="prc-data-table-controller-help">
						{__(
							'Load Firebase data to choose columns to exclude from formatting.',
							'data-table-controller'
						)}
					</p>
				)}
			<ValueFormatRules
				rules={valueFormatRules}
				sheetNames={sheetNames}
				formatableColumns={valueFormatColumns}
				onChange={(nextRules) =>
					setAttributes({ valueFormatRules: nextRules })
				}
			/>
			<hr />
			<ToggleControl
				label={__(
					'Abbreviate numbers on desktop',
					'data-table-controller'
				)}
				help={__(
					'When enabled, shared abbreviation rules below apply to desktop table cells. Mobile always uses these rules when configured.',
					'data-table-controller'
				)}
				checked={enableDesktopAbbreviation}
				onChange={(value) =>
					setAttributes({ enableDesktopAbbreviation: value })
				}
			/>
			<AbbreviationFormatRules
				rules={valueAbbreviationRules}
				sheetNames={sheetNames}
				formatableColumns={valueFormatColumns}
				onChange={(nextRules) =>
					setAttributes({ valueAbbreviationRules: nextRules })
				}
			/>
		</PanelBody>,
		<PanelBody
			key="mobile-value-formatting"
			title={__('Mobile value formatting', 'data-table-controller')}
			initialOpen={false}
		>
			<p className="prc-data-table-controller-help">
				{__(
					'Mobile-only formatting: conditional replacements override Value formatting replacements on small screens. Number abbreviation is configured in Value formatting. Display only; sorting and filtering use raw values.',
					'data-table-controller'
				)}
			</p>
			<MobileValueFormatRules
				rules={mobileValueFormatRules}
				sheetNames={sheetNames}
				formatableColumns={valueFormatColumns}
				onChange={(nextRules) =>
					setAttributes({
						mobileValueFormatRules: nextRules,
					})
				}
			/>
			<hr />
			<p className="prc-data-table-controller-help">
				{__(
					'Number abbreviation (shared with desktop when enabled above). Applies on mobile regardless of the desktop toggle.',
					'data-table-controller'
				)}
			</p>
			<AbbreviationFormatRules
				rules={valueAbbreviationRules}
				sheetNames={sheetNames}
				formatableColumns={valueFormatColumns}
				onChange={(nextRules) =>
					setAttributes({ valueAbbreviationRules: nextRules })
				}
			/>
		</PanelBody>,
	];
}
