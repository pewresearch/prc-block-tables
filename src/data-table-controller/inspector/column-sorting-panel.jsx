/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { PanelBody } from '@wordpress/components';

/**
 * Internal dependencies
 */
import ColumnSortingControls from '../controls/column-sorting-controls';

const SORT_ATTRIBUTES = {
	desktop: {
		sortMode: 'columnSortMode',
		variable: 'autoSortVariable',
		rowIndex: 'autoSortRowIndex',
		rowValue: 'autoSortRowValue',
		excluded: 'autoSortExcludedColumns',
	},
	mobile: {
		sortMode: 'mobileColumnSortMode',
		variable: 'mobileAutoSortVariable',
		rowIndex: 'mobileAutoSortRowIndex',
		rowValue: 'mobileAutoSortRowValue',
		excluded: 'mobileAutoSortExcludedColumns',
	},
};

/**
 * @param {Object}   params
 * @param {string}   params.viewport
 * @param {string}   params.value
 * @param {string}   params.sortMode
 * @param {string[]} params.desktopEffectiveOrder
 * @param {Function} params.setAttributes
 * @param {Object}   params.keys
 */
function applySortModeChange({
	viewport,
	value,
	sortMode,
	desktopEffectiveOrder,
	setAttributes,
	keys,
}) {
	if (viewport === 'mobile') {
		if (value === 'custom' && sortMode === 'inherit') {
			setAttributes({
				[keys.sortMode]: value,
				mobileColumnOrder: desktopEffectiveOrder,
			});
			return;
		}
		if (value === 'auto') {
			setAttributes({
				[keys.sortMode]: value,
				mobileColumnOrder: [],
				mobileAutoSortRowIndex: -1,
				mobileAutoSortRowValue: '',
			});
			return;
		}
	}
	setAttributes({ [keys.sortMode]: value });
}

/**
 * Inspector panel for desktop or mobile column sort mode.
 *
 * @param {Object}   props
 * @param {string}   props.viewport
 * @param {boolean}  props.enabled
 * @param {string}   props.sortMode
 * @param {boolean}  props.isAutoSort
 * @param {string}   props.autoSortVariable
 * @param {number}   props.autoSortRowIndex
 * @param {string[]} props.autoSortExcluded
 * @param {Array}    props.autoSortRowOptions
 * @param {string[]} props.visibleColumns
 * @param {string[]} props.jsonColumnList
 * @param {Array}    props.previewRows
 * @param {string[]} [props.desktopEffectiveOrder]
 * @param {Function} props.setAttributes
 */
export default function ColumnSortingPanel({
	viewport,
	enabled,
	sortMode,
	isAutoSort,
	autoSortVariable,
	autoSortRowIndex,
	autoSortExcluded,
	autoSortRowOptions,
	visibleColumns,
	jsonColumnList,
	previewRows,
	desktopEffectiveOrder = [],
	setAttributes,
}) {
	if (!enabled) {
		return null;
	}

	const keys = SORT_ATTRIBUTES[viewport];
	const isMobile = viewport === 'mobile';

	return (
		<PanelBody
			title={
				isMobile
					? __('Column sorting (mobile)', 'data-table-controller')
					: __('Column sorting (desktop)', 'data-table-controller')
			}
			initialOpen={false}
		>
			<ColumnSortingControls
				sortMode={sortMode}
				includeInheritOption={isMobile}
				onSortModeChange={(value) =>
					applySortModeChange({
						viewport,
						value,
						sortMode,
						desktopEffectiveOrder,
						setAttributes,
						keys,
					})
				}
				isAutoSort={isAutoSort}
				autoSortVariable={autoSortVariable}
				autoSortRowIndex={autoSortRowIndex}
				autoSortExcluded={autoSortExcluded}
				autoSortRowOptions={autoSortRowOptions}
				visibleColumns={visibleColumns}
				jsonColumnList={jsonColumnList}
				excludeCheckboxKeyPrefix={
					isMobile ? 'mobile-auto-exclude' : 'auto-exclude'
				}
				onAutoSortVariableChange={(value) =>
					setAttributes({
						[keys.variable]: value,
						[keys.rowIndex]: -1,
						[keys.rowValue]: '',
					})
				}
				onAutoSortRowIndexChange={(value) => {
					const index = value === '' ? -1 : parseInt(value, 10);
					const rowValue =
						index >= 0 && autoSortVariable && previewRows[index]
							? String(previewRows[index][autoSortVariable] ?? '')
							: '';
					setAttributes({
						[keys.rowIndex]: index,
						[keys.rowValue]: rowValue,
					});
				}}
				onAutoSortExcludedChange={(next) =>
					setAttributes({
						[keys.excluded]: next,
					})
				}
			/>
		</PanelBody>
	);
}
