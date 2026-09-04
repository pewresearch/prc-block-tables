/**
 * Shared number abbreviation rules editor for Data Table Controller.
 */
import { __ } from '@wordpress/i18n';
import { Button, CheckboxControl, TextControl } from '@wordpress/components';

const GROUP_KEYS = ['K', 'M', 'B', 'T'];

const GROUP_LABELS = {
	K: __('Thousands', 'data-table-controller'),
	M: __('Millions', 'data-table-controller'),
	B: __('Billions', 'data-table-controller'),
	T: __('Trillions', 'data-table-controller'),
};

const DEFAULT_ABBREVIATIONS = {
	K: 'k',
	M: 'M',
	B: 'B',
	T: 'T',
};

/**
 * Default per-magnitude formatting settings.
 *
 * @return {Object} Groups map.
 */
export function createDefaultAbbreviationGroups() {
	return {
		K: {
			abbreviation: DEFAULT_ABBREVIATIONS.K,
			decimals: 1,
			significantDigits: 2,
		},
		M: {
			abbreviation: DEFAULT_ABBREVIATIONS.M,
			decimals: 1,
			significantDigits: 2,
		},
		B: {
			abbreviation: DEFAULT_ABBREVIATIONS.B,
			decimals: 1,
			significantDigits: 2,
		},
		T: {
			abbreviation: DEFAULT_ABBREVIATIONS.T,
			decimals: 1,
			significantDigits: 2,
		},
	};
}

/**
 * Create a new abbreviation rule.
 *
 * @return {Object} Rule object.
 */
export function createAbbreviationRule() {
	return {
		id:
			typeof crypto !== 'undefined' && crypto.randomUUID
				? crypto.randomUUID()
				: `abbrev-rule-${Date.now()}`,
		type: 'abbrev',
		sheets: [],
		columns: [],
		groups: createDefaultAbbreviationGroups(),
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
 * Sheet and column scope controls shared by abbreviation rules.
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
function AbbreviationRuleScopeControls({
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
				<div className="prc-data-table-controller-abbreviation-format-rule__group">
					<p className="prc-data-table-controller-help">
						{__(
							'Sheets (none selected = all sheets)',
							'data-table-controller'
						)}
					</p>
					{sheetNames.map((sheet) => (
						<CheckboxControl
							key={`abbrev-rule-sheet-${rule.id}-${sheet}`}
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
				<div className="prc-data-table-controller-abbreviation-format-rule__group">
					<p className="prc-data-table-controller-help">
						{__(
							'Columns (none selected = all columns)',
							'data-table-controller'
						)}
					</p>
					{formatableColumns.map((col) => (
						<CheckboxControl
							key={`abbrev-rule-col-${rule.id}-${col}`}
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
 * Single abbreviation rule card.
 *
 * @param {Object}   props                   Props.
 * @param {Object}   props.rule              Rule object.
 * @param {string[]} props.sheetNames        Available sheet names.
 * @param {string[]} props.formatableColumns Formatable column keys.
 * @param {Function} props.onChange          Rule update callback.
 * @param {Function} props.onRemove          Remove callback.
 */
function AbbreviationFormatRuleCard({
	rule,
	sheetNames,
	formatableColumns,
	onChange,
	onRemove,
}) {
	const selectedSheets = normalizeStringArray(rule.sheets);
	const selectedColumns = normalizeStringArray(rule.columns);
	const groups = rule.groups || createDefaultAbbreviationGroups();

	const update = (patch) => onChange({ ...rule, ...patch });

	const updateGroup = (key, field, value) => {
		const current = groups[key] || createDefaultAbbreviationGroups()[key];
		if (field === 'abbreviation') {
			update({
				groups: {
					...groups,
					[key]: {
						...current,
						abbreviation: value ?? '',
					},
				},
			});
			return;
		}
		const fallback =
			field === 'significantDigits'
				? createDefaultAbbreviationGroups()[key].significantDigits
				: createDefaultAbbreviationGroups()[key].decimals;
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
		<div className="prc-data-table-controller-abbreviation-format-rule">
			<p className="prc-data-table-controller-help">
				{__(
					'Number abbreviation for values ≥ 1,000. Prefix and suffix from Value formatting still apply.',
					'data-table-controller'
				)}
			</p>
			<AbbreviationRuleScopeControls
				rule={rule}
				sheetNames={sheetNames}
				formatableColumns={formatableColumns}
				selectedSheets={selectedSheets}
				selectedColumns={selectedColumns}
				onSheetsChange={(sheets) => update({ sheets })}
				onColumnsChange={(columns) => update({ columns })}
			/>
			{GROUP_KEYS.map((key) => (
				<div
					key={`abbrev-group-${rule.id}-${key}`}
					className="prc-data-table-controller-abbreviation-format-rule__magnitude"
				>
					<p className="prc-data-table-controller-abbreviation-format-rule__magnitude-label">
						{GROUP_LABELS[key]}
					</p>
					<TextControl
						__next40pxDefaultSize
						label={__('Abbreviation', 'data-table-controller')}
						value={
							groups[key]?.abbreviation ??
							DEFAULT_ABBREVIATIONS[key]
						}
						onChange={(value) =>
							updateGroup(key, 'abbreviation', value)
						}
						help={__(
							'Suffix appended to the compact number (e.g. K for 407K).',
							'data-table-controller'
						)}
					/>
					<TextControl
						__next40pxDefaultSize
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
						__next40pxDefaultSize
						label={__('Decimals', 'data-table-controller')}
						type="number"
						min={0}
						value={String(groups[key]?.decimals ?? 1)}
						onChange={(value) =>
							updateGroup(key, 'decimals', value)
						}
					/>
				</div>
			))}
			<Button
				__next40pxDefaultSize
				variant="secondary"
				isDestructive
				onClick={onRemove}
				className="prc-data-table-controller-abbreviation-format-rule__remove"
			>
				{__('Remove rule', 'data-table-controller')}
			</Button>
		</div>
	);
}

/**
 * Abbreviation rules list and builder.
 *
 * @param {Object}   props                   Props.
 * @param {Array}    props.rules             Current rules.
 * @param {string[]} props.sheetNames        Available sheet names.
 * @param {string[]} props.formatableColumns Formatable column keys.
 * @param {Function} props.onChange          Rules array update callback.
 */
export default function AbbreviationFormatRules({
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
		<div className="prc-data-table-controller-abbreviation-format-rules">
			{ruleList.map((rule, index) => (
				<AbbreviationFormatRuleCard
					key={rule.id || `abbrev-rule-${index}`}
					rule={rule}
					sheetNames={sheetNames}
					formatableColumns={formatableColumns}
					onChange={(nextRule) => updateRuleAt(index, nextRule)}
					onRemove={() => removeRuleAt(index)}
				/>
			))}
			<div className="prc-data-table-controller-abbreviation-format-rules__add">
				<Button
					__next40pxDefaultSize
					variant="secondary"
					onClick={() =>
						onChange([...ruleList, createAbbreviationRule()])
					}
				>
					{__('Add abbreviation rule', 'data-table-controller')}
				</Button>
			</div>
		</div>
	);
}
