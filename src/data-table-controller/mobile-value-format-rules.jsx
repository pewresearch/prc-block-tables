/**
 * Mobile value format rules editor for Data Table Controller.
 */
import { __ } from '@wordpress/i18n';
import {
	Button,
	CheckboxControl,
	SelectControl,
	TextControl,
} from '@wordpress/components';

const GROUP_KEYS = ['K', 'M', 'B', 'T'];

const GROUP_LABELS = {
	K: __('Thousands (k)', 'data-table-controller'),
	M: __('Millions (M)', 'data-table-controller'),
	B: __('Billions (B)', 'data-table-controller'),
	T: __('Trillions (T)', 'data-table-controller'),
};

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
 * Default per-magnitude formatting settings.
 *
 * @return {Object} Groups map.
 */
export function createDefaultMobileGroups() {
	return {
		K: { decimals: 1, significantDigits: 2 },
		M: { decimals: 1, significantDigits: 2 },
		B: { decimals: 1, significantDigits: 2 },
		T: { decimals: 1, significantDigits: 2 },
	};
}

/**
 * Create a new mobile abbreviation rule.
 *
 * @return {Object} Rule object.
 */
export function createMobileAbbrevRule() {
	return {
		id:
			typeof crypto !== 'undefined' && crypto.randomUUID
				? crypto.randomUUID()
				: `mobile-rule-${Date.now()}`,
		type: 'abbrev',
		sheets: [],
		columns: [],
		groups: createDefaultMobileGroups(),
	};
}

/**
 * Create a new mobile conditional replacement rule.
 *
 * @return {Object} Rule object.
 */
export function createMobileReplaceRule() {
	return {
		id:
			typeof crypto !== 'undefined' && crypto.randomUUID
				? crypto.randomUUID()
				: `mobile-rule-${Date.now()}`,
		type: 'replace',
		sheets: [],
		columns: [],
		operator: 'lt',
		threshold: '',
		thresholdMax: '',
		replacement: '',
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
 * @param {unknown} value    Raw input.
 * @param {number}  fallback Fallback when invalid.
 * @param {number}  min      Minimum allowed value.
 * @return {number} Clamped integer.
 */
function parseNonNegativeInt(value, fallback, min = 0) {
	const parsed = Number.parseInt(String(value ?? ''), 10);
	if (!Number.isFinite(parsed) || parsed < min) {
		return fallback;
	}
	return parsed;
}

/**
 * Sheet and column scope controls shared by mobile rule types.
 *
 * @param {Object}   props                   Props.
 * @param {Object}   props.rule              Rule object (for keys).
 * @param {string[]} props.sheetNames        Sheet names.
 * @param {string[]} props.formatableColumns Column keys.
 * @param {string[]} props.selectedSheets    Selected sheets.
 * @param {string[]} props.selectedColumns   Selected columns.
 * @param {Function} props.onSheetsChange    Sheets update callback.
 * @param {Function} props.onColumnsChange   Columns update callback.
 */
function MobileRuleScopeControls({
	rule,
	sheetNames,
	formatableColumns,
	selectedSheets,
	selectedColumns,
	onSheetsChange,
	onColumnsChange,
}) {
	const showSheetSelector =
		Array.isArray(sheetNames) && sheetNames.length > 1;

	return (
		<>
			{showSheetSelector && (
				<div className="prc-data-table-controller-mobile-value-format-rule__group">
					<p className="prc-data-table-controller-help">
						{__(
							'Sheets (none selected = all sheets)',
							'data-table-controller'
						)}
					</p>
					{sheetNames.map((sheet) => (
						<CheckboxControl
							key={`mobile-rule-sheet-${rule.id}-${sheet}`}
							__nextHasNoMarginBottom
							label={sheet}
							checked={selectedSheets.includes(sheet)}
							onChange={(checked) =>
								onSheetsChange(
									toggleInList(selectedSheets, sheet, checked)
								)
							}
						/>
					))}
				</div>
			)}
			{formatableColumns.length > 0 && (
				<div className="prc-data-table-controller-mobile-value-format-rule__group">
					<p className="prc-data-table-controller-help">
						{__(
							'Columns (none selected = all columns)',
							'data-table-controller'
						)}
					</p>
					{formatableColumns.map((col) => (
						<CheckboxControl
							key={`mobile-rule-col-${rule.id}-${col}`}
							__nextHasNoMarginBottom
							label={col}
							checked={selectedColumns.includes(col)}
							onChange={(checked) =>
								onColumnsChange(
									toggleInList(selectedColumns, col, checked)
								)
							}
						/>
					))}
				</div>
			)}
		</>
	);
}

/**
 * Single mobile value format rule card.
 *
 * @param {Object}   props                   Props.
 * @param {Object}   props.rule              Rule object.
 * @param {string[]} props.sheetNames        Available sheet names.
 * @param {string[]} props.formatableColumns Formatable column keys.
 * @param {Function} props.onChange          Rule update callback.
 * @param {Function} props.onRemove          Remove callback.
 */
function MobileValueFormatRuleCard({
	rule,
	sheetNames,
	formatableColumns,
	onChange,
	onRemove,
}) {
	const selectedSheets = normalizeStringArray(rule.sheets);
	const selectedColumns = normalizeStringArray(rule.columns);
	const groups = rule.groups || createDefaultMobileGroups();
	const isReplace = rule.type === 'replace';

	const update = (patch) => onChange({ ...rule, ...patch });

	const updateGroup = (key, field, value) => {
		const current = groups[key] || createDefaultMobileGroups()[key];
		const fallback =
			field === 'significantDigits'
				? createDefaultMobileGroups()[key].significantDigits
				: createDefaultMobileGroups()[key].decimals;
		const min = field === 'significantDigits' ? 1 : 0;
		const parsed = parseNonNegativeInt(value, fallback, min);
		update({
			groups: {
				...groups,
				[key]: {
					...current,
					[field]: parsed,
				},
			},
		});
	};

	return (
		<div className="prc-data-table-controller-mobile-value-format-rule">
			<p className="prc-data-table-controller-help">
				{isReplace
					? __(
							'Conditional replacement (mobile only)',
							'data-table-controller'
						)
					: __(
							'Number abbreviation (mobile only)',
							'data-table-controller'
						)}
			</p>
			<MobileRuleScopeControls
				rule={rule}
				sheetNames={sheetNames}
				formatableColumns={formatableColumns}
				selectedSheets={selectedSheets}
				selectedColumns={selectedColumns}
				onSheetsChange={(sheets) => update({ sheets })}
				onColumnsChange={(columns) => update({ columns })}
			/>
			{isReplace ? (
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
							'Overrides Value formatting replacement rules on mobile. Shown exactly as typed (no prefix/suffix).',
							'data-table-controller'
						)}
					/>
				</>
			) : (
				GROUP_KEYS.map((key) => (
					<div
						key={`mobile-group-${rule.id}-${key}`}
						className="prc-data-table-controller-mobile-value-format-rule__magnitude"
					>
						<p className="prc-data-table-controller-mobile-value-format-rule__magnitude-label">
							{GROUP_LABELS[key]}
						</p>
						<TextControl
							label={__(
								'Significant digits',
								'data-table-controller'
							)}
							type="number"
							min={1}
							value={String(groups[key]?.significantDigits ?? 2)}
							onChange={(value) =>
								updateGroup(key, 'significantDigits', value)
							}
						/>
						<TextControl
							label={__('Decimals', 'data-table-controller')}
							type="number"
							min={0}
							value={String(groups[key]?.decimals ?? 1)}
							onChange={(value) =>
								updateGroup(key, 'decimals', value)
							}
						/>
					</div>
				))
			)}
			<Button
				variant="secondary"
				isDestructive
				onClick={onRemove}
				className="prc-data-table-controller-mobile-value-format-rule__remove"
			>
				{__('Remove rule', 'data-table-controller')}
			</Button>
		</div>
	);
}

/**
 * Mobile value format rules list and builder.
 *
 * @param {Object}   props                   Props.
 * @param {Array}    props.rules             Current rules.
 * @param {string[]} props.sheetNames        Available sheet names.
 * @param {string[]} props.formatableColumns Formatable column keys.
 * @param {Function} props.onChange          Rules array update callback.
 */
export default function MobileValueFormatRules({
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

	return (
		<div className="prc-data-table-controller-mobile-value-format-rules">
			{ruleList.map((rule, index) => (
				<MobileValueFormatRuleCard
					key={rule.id || `mobile-rule-${index}`}
					rule={rule}
					sheetNames={sheetNames}
					formatableColumns={formatableColumns}
					onChange={(nextRule) => updateRuleAt(index, nextRule)}
					onRemove={() => removeRuleAt(index)}
				/>
			))}
			<div className="prc-data-table-controller-mobile-value-format-rules__add">
				<Button
					variant="secondary"
					onClick={() =>
						onChange([...ruleList, createMobileReplaceRule()])
					}
				>
					{__('Add replacement rule', 'data-table-controller')}
				</Button>
				<Button
					variant="secondary"
					onClick={() =>
						onChange([...ruleList, createMobileAbbrevRule()])
					}
				>
					{__('Add abbreviation rule', 'data-table-controller')}
				</Button>
			</div>
		</div>
	);
}
