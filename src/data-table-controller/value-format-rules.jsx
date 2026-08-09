/**
 * Value format rules editor for Data Table Controller.
 */
import { __ } from '@wordpress/i18n';
import {
	Button,
	CheckboxControl,
	SelectControl,
	TextControl,
} from '@wordpress/components';

const RULE_TYPES = [
	{
		label: __('Conditional replacement', 'data-table-controller'),
		value: 'replace',
	},
	{
		label: __('Round to nearest', 'data-table-controller'),
		value: 'round',
	},
	{
		label: __('Decimal precision', 'data-table-controller'),
		value: 'precision',
	},
	{
		label: __('Thousands separators', 'data-table-controller'),
		value: 'commas',
	},
];

const OPERATORS = [
	{ label: __('< (less than)', 'data-table-controller'), value: 'lt' },
	{
		label: __('<= (less than or equal)', 'data-table-controller'),
		value: 'lte',
	},
	{ label: __('> (greater than)', 'data-table-controller'), value: 'gt' },
	{
		label: __('>= (greater than or equal)', 'data-table-controller'),
		value: 'gte',
	},
	{ label: __('= (equal)', 'data-table-controller'), value: 'eq' },
	{ label: __('Between', 'data-table-controller'), value: 'between' },
];

/**
 * Create a new empty rule with defaults.
 *
 * @param {string} type Rule type.
 * @return {Object} Rule object.
 */
export function createRule(type = 'replace') {
	return {
		id:
			typeof crypto !== 'undefined' && crypto.randomUUID
				? crypto.randomUUID()
				: `rule-${Date.now()}`,
		type,
		sheets: [],
		columns: [],
		operator: 'lt',
		threshold: '',
		thresholdMax: '',
		replacement: '',
		nearest: '',
		decimals: '0',
	};
}

/**
 * @param {unknown} value Input value.
 * @return {string[]} Normalized string array.
 */
function normalizeStringArray(value) {
	return Array.isArray(value) ? value.map(String) : [];
}

/**
 * Toggle a value in a string array.
 *
 * @param {string[]} list Current list.
 * @param {string}   item Item to toggle.
 * @param {boolean}  add  Whether to add (true) or remove (false).
 * @return {string[]} Updated list.
 */
function toggleInList(list, item, add) {
	const current = normalizeStringArray(list);
	if (add) {
		return current.includes(item) ? current : [...current, item];
	}
	return current.filter((entry) => entry !== item);
}

/**
 * Single rule card.
 *
 * @param {Object}   props                   Props.
 * @param {Object}   props.rule              Rule object.
 * @param {string[]} props.sheetNames        Available sheet names.
 * @param {string[]} props.formatableColumns Formatable column keys.
 * @param {Function} props.onChange          Rule update callback.
 * @param {Function} props.onRemove          Remove callback.
 */
function ValueFormatRuleCard({
	rule,
	sheetNames,
	formatableColumns,
	onChange,
	onRemove,
}) {
	const showSheetSelector =
		Array.isArray(sheetNames) && sheetNames.length > 1;
	const selectedSheets = normalizeStringArray(rule.sheets);
	const selectedColumns = normalizeStringArray(rule.columns);

	const update = (patch) => onChange({ ...rule, ...patch });

	return (
		<div className="prc-data-table-controller-value-format-rule">
			<SelectControl
				label={__('Rule type', 'data-table-controller')}
				value={rule.type || 'replace'}
				options={RULE_TYPES}
				onChange={(value) => update({ type: value })}
			/>
			{showSheetSelector && (
				<div className="prc-data-table-controller-value-format-rule__group">
					<p className="prc-data-table-controller-help">
						{__(
							'Sheets (none selected = all sheets)',
							'data-table-controller'
						)}
					</p>
					{sheetNames.map((sheet) => (
						<CheckboxControl
							key={`rule-sheet-${rule.id}-${sheet}`}
							__nextHasNoMarginBottom
							label={sheet}
							checked={selectedSheets.includes(sheet)}
							onChange={(checked) =>
								update({
									sheets: toggleInList(
										selectedSheets,
										sheet,
										checked
									),
								})
							}
						/>
					))}
				</div>
			)}
			{formatableColumns.length > 0 && (
				<div className="prc-data-table-controller-value-format-rule__group">
					<p className="prc-data-table-controller-help">
						{__(
							'Columns (none selected = all columns)',
							'data-table-controller'
						)}
					</p>
					{formatableColumns.map((col) => (
						<CheckboxControl
							key={`rule-col-${rule.id}-${col}`}
							__nextHasNoMarginBottom
							label={col}
							checked={selectedColumns.includes(col)}
							onChange={(checked) =>
								update({
									columns: toggleInList(
										selectedColumns,
										col,
										checked
									),
								})
							}
						/>
					))}
				</div>
			)}
			{rule.type === 'replace' && (
				<>
					<SelectControl
						label={__('Operator', 'data-table-controller')}
						value={rule.operator || 'lt'}
						options={OPERATORS}
						onChange={(value) => update({ operator: value })}
					/>
					<TextControl
						label={__('Threshold', 'data-table-controller')}
						type="number"
						value={rule.threshold ?? ''}
						onChange={(value) => update({ threshold: value })}
					/>
					{rule.operator === 'between' && (
						<TextControl
							label={__(
								'Maximum threshold',
								'data-table-controller'
							)}
							type="number"
							value={rule.thresholdMax ?? ''}
							onChange={(value) =>
								update({ thresholdMax: value })
							}
						/>
					)}
					<TextControl
						label={__(
							'Replacement string',
							'data-table-controller'
						)}
						value={rule.replacement ?? ''}
						onChange={(value) => update({ replacement: value })}
						help={__(
							'Shown exactly as typed (no prefix/suffix).',
							'data-table-controller'
						)}
					/>
				</>
			)}
			{rule.type === 'round' && (
				<TextControl
					label={__('Round to nearest', 'data-table-controller')}
					type="number"
					value={rule.nearest ?? ''}
					onChange={(value) => update({ nearest: value })}
					help={__(
						'e.g. 10000 rounds 25,678 to 30,000. Prefix/suffix still apply.',
						'data-table-controller'
					)}
				/>
			)}
			{rule.type === 'precision' && (
				<TextControl
					label={__('Decimal places', 'data-table-controller')}
					type="number"
					min={0}
					value={rule.decimals ?? '0'}
					onChange={(value) => update({ decimals: value })}
					help={__(
						'Force a fixed number of decimal places. Prefix/suffix still apply.',
						'data-table-controller'
					)}
				/>
			)}
			{rule.type === 'commas' && (
				<p className="prc-data-table-controller-help">
					{__(
						'Adds comma grouping to numeric values (e.g. 9507079 becomes 9,507,079). Prefix and suffix still apply. Conditional replacement runs first and overrides this rule when it matches.',
						'data-table-controller'
					)}
				</p>
			)}
			<Button
				variant="secondary"
				isDestructive
				onClick={onRemove}
				className="prc-data-table-controller-value-format-rule__remove"
			>
				{__('Remove rule', 'data-table-controller')}
			</Button>
		</div>
	);
}

/**
 * Value format rules list and builder.
 *
 * @param {Object}   props                   Props.
 * @param {Array}    props.rules             Current rules.
 * @param {string[]} props.sheetNames        Available sheet names.
 * @param {string[]} props.formatableColumns Formatable column keys.
 * @param {Function} props.onChange          Rules array update callback.
 */
export default function ValueFormatRules({
	rules,
	sheetNames,
	formatableColumns,
	onChange,
}) {
	const ruleList = Array.isArray(rules) ? rules : [];

	const updateRuleAt = (index, nextRule) => {
		const next = [...ruleList];
		next[index] = nextRule;
		onChange(next);
	};

	const removeRuleAt = (index) => {
		onChange(ruleList.filter((_, i) => i !== index));
	};

	const addRule = (type) => {
		onChange([...ruleList, createRule(type)]);
	};

	return (
		<div className="prc-data-table-controller-value-format-rules">
			<p className="prc-data-table-controller-help">
				{__(
					'Formatting rules affect display only. Sorting and filtering always use raw cell values.',
					'data-table-controller'
				)}
			</p>
			{ruleList.map((rule, index) => (
				<ValueFormatRuleCard
					key={rule.id || `rule-${index}`}
					rule={rule}
					sheetNames={sheetNames}
					formatableColumns={formatableColumns}
					onChange={(nextRule) => updateRuleAt(index, nextRule)}
					onRemove={() => removeRuleAt(index)}
				/>
			))}
			<div className="prc-data-table-controller-value-format-rules__add">
				<Button variant="secondary" onClick={() => addRule('replace')}>
					{__('Add replacement rule', 'data-table-controller')}
				</Button>
				<Button variant="secondary" onClick={() => addRule('round')}>
					{__('Add rounding rule', 'data-table-controller')}
				</Button>
				<Button
					variant="secondary"
					onClick={() => addRule('precision')}
				>
					{__('Add precision rule', 'data-table-controller')}
				</Button>
				<Button variant="secondary" onClick={() => addRule('commas')}>
					{__(
						'Add thousands separators rule',
						'data-table-controller'
					)}
				</Button>
			</div>
		</div>
	);
}
