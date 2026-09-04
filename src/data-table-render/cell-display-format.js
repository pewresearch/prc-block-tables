/**
 * Cell display formatting for data-table-render.
 */
import { format as d3Format } from 'd3-format';

/**
 * Format a cell for display with optional prefix/suffix. Empty values stay empty.
 *
 * @param {unknown} raw    Cell value.
 * @param {string}  prefix Prefix string.
 * @param {string}  suffix Suffix string.
 * @return {string} Display text.
 */
function formatCellValue(raw, prefix, suffix) {
	if (raw === null || raw === undefined || raw === '') {
		return '';
	}
	return `${prefix}${String(raw)}${suffix}`;
}

/**
 * Resolve global prefix/suffix for the active sheet.
 * Empty valueFormatSheets means all sheets; otherwise only listed sheets apply.
 *
 * @param {Object} options Formatting options.
 * @return {{ prefix: string, suffix: string }} Effective prefix/suffix.
 */
function resolvePrefixSuffix(options) {
	const {
		activeSheetName,
		valuePrefix = '',
		valueSuffix = '',
		valueFormatSheets = [],
	} = options;
	const sheets = Array.isArray(valueFormatSheets) ? valueFormatSheets : [];
	if (sheets.length > 0 && !sheets.includes(activeSheetName)) {
		return { prefix: '', suffix: '' };
	}
	return { prefix: valuePrefix, suffix: valueSuffix };
}

/**
 * Parse a cell value as a number for formatting rules.
 *
 * @param {unknown} raw Cell value.
 * @return {number|null} Parsed number or null when not numeric.
 */
function parseNumericValue(raw) {
	if (raw === null || raw === undefined || raw === '') {
		return null;
	}
	const str = String(raw).trim().replace(/,/g, '');
	const cleaned = str.replace(/^[^0-9.\-+]+/, '');
	const num = Number(cleaned);
	return Number.isFinite(num) ? num : null;
}

/**
 * Decimal places in the raw cell string (after comma strip), for commas-only formatting.
 *
 * @param {unknown} raw Cell value.
 * @return {number} Fractional digit count (0 when none).
 */
function decimalPlacesFromRaw(raw) {
	if (raw === null || raw === undefined || raw === '') {
		return 0;
	}
	const str = String(raw).trim().replace(/,/g, '');
	const cleaned = str.replace(/^[^0-9.\-+]+/, '');
	const dot = cleaned.indexOf('.');
	if (dot === -1) {
		return 0;
	}
	return cleaned.length - dot - 1;
}

/**
 * @param {number} num          Numeric cell value.
 * @param {string} operator     Comparison operator key.
 * @param {number} threshold    Primary threshold.
 * @param {number} thresholdMax Secondary threshold (between).
 * @return {boolean} Whether the operator matches.
 */
function evaluateReplaceOperator(num, operator, threshold, thresholdMax) {
	switch (operator) {
		case 'lt':
			return num < threshold;
		case 'lte':
			return num <= threshold;
		case 'gt':
			return num > threshold;
		case 'gte':
			return num >= threshold;
		case 'eq':
			return num === threshold;
		case 'between': {
			const min = Math.min(threshold, thresholdMax);
			const max = Math.max(threshold, thresholdMax);
			return num >= min && num <= max;
		}
		default:
			return false;
	}
}

/**
 * @param {string} activeSheet Active sheet name.
 * @param {string} col         Column key.
 * @param {Object} rule        Format rule.
 * @return {boolean} Whether the rule applies to this cell scope.
 */
function ruleMatchesScope(activeSheet, col, rule) {
	const sheets = Array.isArray(rule.sheets) ? rule.sheets : [];
	const columns = Array.isArray(rule.columns) ? rule.columns : [];
	if (sheets.length > 0 && !sheets.includes(activeSheet)) {
		return false;
	}
	if (columns.length > 0 && !columns.includes(col)) {
		return false;
	}
	return true;
}

const COMPACT_MAGNITUDES = [
	{ key: 'T', suffix: 'T', divisor: 1e12 },
	{ key: 'B', suffix: 'B', divisor: 1e9 },
	{ key: 'M', suffix: 'M', divisor: 1e6 },
	{ key: 'K', suffix: 'k', divisor: 1e3 },
];

const DEFAULT_COMPACT_GROUP = { decimals: 1, significantDigits: 2 };

/**
 * Resolve shared abbreviation rules from attributes, including legacy mobile abbrev rules.
 *
 * @param {Object} options Formatting options.
 * @return {Array<Object>} Abbreviation rules.
 */
function resolveAbbreviationRules(options) {
	const { valueAbbreviationRules = [], mobileValueFormatRules = [] } =
		options;
	if (
		Array.isArray(valueAbbreviationRules) &&
		valueAbbreviationRules.length > 0
	) {
		return valueAbbreviationRules;
	}
	return (
		Array.isArray(mobileValueFormatRules) ? mobileValueFormatRules : []
	).filter((rule) => rule && rule.type === 'abbrev');
}

/**
 * First matching abbreviation rule display string, if any.
 *
 * @param {unknown} raw     Raw cell value.
 * @param {string}  col     Column key.
 * @param {Object}  options Formatting options.
 * @return {string|null} Abbreviated display text or null.
 */
function getAbbreviationDisplay(raw, col, options) {
	const { activeSheetName } = options;
	const num = parseNumericValue(raw);
	if (num === null || Math.abs(num) < 1000) {
		return null;
	}
	const { prefix, suffix } = resolvePrefixSuffix(options);
	const rules = resolveAbbreviationRules(options);
	for (const rule of rules) {
		if (
			!rule ||
			rule.type !== 'abbrev' ||
			!ruleMatchesScope(activeSheetName, col, rule)
		) {
			continue;
		}
		const compact = formatCompactNumber(num, rule.groups);
		if (compact !== null) {
			return `${prefix}${compact}${suffix}`;
		}
	}
	return null;
}

/**
 * First matching desktop replace rule display string, if any.
 *
 * @param {unknown}       raw         Raw cell value.
 * @param {string}        col         Column key.
 * @param {string}        activeSheet Active sheet name.
 * @param {Array<Object>} rules       Format rules.
 * @return {string|null} Replacement text or null.
 */
function getReplaceRuleDisplay(raw, col, activeSheet, rules) {
	const num = parseNumericValue(raw);
	if (num === null) {
		return null;
	}
	const ruleList = Array.isArray(rules) ? rules : [];
	for (const rule of ruleList) {
		if (
			!rule ||
			rule.type !== 'replace' ||
			!ruleMatchesScope(activeSheet, col, rule)
		) {
			continue;
		}
		const threshold = Number(rule.threshold);
		const thresholdMax = Number(rule.thresholdMax);
		if (
			evaluateReplaceOperator(
				num,
				rule.operator || 'lt',
				threshold,
				thresholdMax
			)
		) {
			return String(rule.replacement ?? '');
		}
	}
	return null;
}

/**
 * Format a number as k/M/B/T using Option A (sig digits then decimal places).
 *
 * @param {number}      num    Numeric value.
 * @param {Object|null} groups Per-magnitude settings map.
 * @return {string|null} Compact string or null when below 1,000.
 */
function formatCompactNumber(num, groups) {
	const abs = Math.abs(num);
	if (abs < 1000) {
		return null;
	}

	let magnitude = null;
	for (const entry of COMPACT_MAGNITUDES) {
		if (abs >= entry.divisor) {
			magnitude = entry;
			break;
		}
	}
	if (!magnitude) {
		return null;
	}

	const groupSettings =
		groups && typeof groups === 'object' && groups[magnitude.key]
			? groups[magnitude.key]
			: DEFAULT_COMPACT_GROUP;
	const decimals = Number.isFinite(Number(groupSettings.decimals))
		? Math.max(0, Number(groupSettings.decimals))
		: DEFAULT_COMPACT_GROUP.decimals;
	const significantDigits = Number.isFinite(
		Number(groupSettings.significantDigits)
	)
		? Math.max(1, Number(groupSettings.significantDigits))
		: DEFAULT_COMPACT_GROUP.significantDigits;

	let coefficient = abs / magnitude.divisor;
	coefficient = Number(coefficient.toPrecision(significantDigits));

	let formattedCoeff;
	if (decimals === 0) {
		formattedCoeff = String(Math.round(coefficient));
	} else {
		formattedCoeff = d3Format(`.${decimals}f`)(coefficient);
	}

	const sign = num < 0 ? '-' : '';
	const suffix =
		groupSettings &&
		Object.prototype.hasOwnProperty.call(groupSettings, 'abbreviation')
			? String(groupSettings.abbreviation)
			: magnitude.suffix;
	return `${sign}${formattedCoeff}${suffix}`;
}

/**
 * Format a transformed number with grouping and optional decimal places.
 *
 * @param {number} num      Transformed number.
 * @param {number} decimals Decimal places (0 = integer).
 * @return {string} Formatted number string.
 */
function formatTransformedNumber(num, decimals = 0) {
	const safeDecimals =
		Number.isFinite(decimals) && decimals >= 0 ? decimals : 0;
	if (safeDecimals === 0) {
		return d3Format(',')(Math.round(num));
	}
	return d3Format(`,.${safeDecimals}f`)(num);
}

/**
 * Apply sheet/column-scoped value format rules for display.
 *
 * @param {unknown}       raw         Raw cell value.
 * @param {string}        col         Column key.
 * @param {string}        activeSheet Active sheet name.
 * @param {Array<Object>} rules       Format rules from interactivity state.
 * @param {string}        prefix      Global prefix.
 * @param {string}        suffix      Global suffix.
 * @return {string} Display text.
 */
function applyValueFormatRules(raw, col, activeSheet, rules, prefix, suffix) {
	const num = parseNumericValue(raw);
	if (num === null) {
		return formatCellValue(raw, prefix, suffix);
	}

	const ruleList = Array.isArray(rules) ? rules : [];

	for (const rule of ruleList) {
		if (
			!rule ||
			rule.type !== 'replace' ||
			!ruleMatchesScope(activeSheet, col, rule)
		) {
			continue;
		}
		const threshold = Number(rule.threshold);
		const thresholdMax = Number(rule.thresholdMax);
		if (
			evaluateReplaceOperator(
				num,
				rule.operator || 'lt',
				threshold,
				thresholdMax
			)
		) {
			return String(rule.replacement ?? '');
		}
	}

	let working = num;
	let outputDecimals = null;
	let transformApplied = false;

	for (const rule of ruleList) {
		if (!rule || !ruleMatchesScope(activeSheet, col, rule)) {
			continue;
		}
		if (rule.type === 'round') {
			const nearest = Number(rule.nearest);
			if (nearest > 0) {
				working = Math.round(working / nearest) * nearest;
				outputDecimals = 0;
				transformApplied = true;
			}
		} else if (rule.type === 'precision') {
			const decimals = Number(rule.decimals);
			if (Number.isFinite(decimals) && decimals >= 0) {
				working = Number.parseFloat(working.toFixed(decimals));
				outputDecimals = decimals;
				transformApplied = true;
			}
		} else if (rule.type === 'commas') {
			transformApplied = true;
		}
	}

	if (!transformApplied) {
		return formatCellValue(raw, prefix, suffix);
	}

	const decimalsForFormat =
		outputDecimals === null ? decimalPlacesFromRaw(raw) : outputDecimals;

	const formatted = formatTransformedNumber(working, decimalsForFormat);

	return `${prefix}${formatted}${suffix}`;
}

/**
 * Format a cell value for table display.
 *
 * @param {unknown} raw     Raw cell value.
 * @param {string}  col     Column key.
 * @param {Object}  options Formatting options (valueFormatExcluded, valueFormatRules, activeSheetName, valuePrefix, valueSuffix, valueFormatSheets).
 * @return {string} Display text.
 */
function formatDisplayCell(raw, col, options) {
	const { valueFormatExcluded, valueFormatRules, activeSheetName } = options;
	const { prefix, suffix } = resolvePrefixSuffix(options);
	if (valueFormatExcluded.has(col)) {
		return raw === null || raw === undefined ? '' : String(raw);
	}

	const replaceDisplay = getReplaceRuleDisplay(
		raw,
		col,
		activeSheetName,
		valueFormatRules
	);
	if (replaceDisplay !== null) {
		return replaceDisplay;
	}

	if (options.enableDesktopAbbreviation) {
		const abbrevDisplay = getAbbreviationDisplay(raw, col, options);
		if (abbrevDisplay !== null) {
			return abbrevDisplay;
		}
	}

	return formatDisplayCellWithoutReplace(raw, col, options);
}

/**
 * Desktop display formatting without conditional replacement rules (mobile fallback).
 *
 * @param {unknown} raw     Raw cell value.
 * @param {string}  col     Column key.
 * @param {Object}  options Formatting options.
 * @return {string} Display text.
 */
function formatDisplayCellWithoutReplace(raw, col, options) {
	const { valueFormatExcluded, valueFormatRules, activeSheetName } = options;
	const { prefix, suffix } = resolvePrefixSuffix(options);
	if (valueFormatExcluded.has(col)) {
		return raw === null || raw === undefined ? '' : String(raw);
	}
	const transformRules = (
		Array.isArray(valueFormatRules) ? valueFormatRules : []
	).filter((rule) => rule && rule.type !== 'replace');
	if (transformRules.length > 0) {
		return applyValueFormatRules(
			raw,
			col,
			activeSheetName,
			transformRules,
			prefix,
			suffix
		);
	}
	return formatCellValue(raw, prefix, suffix);
}

/**
 * Mobile-only display string (mobile replace overrides desktop replace).
 *
 * @param {unknown} raw     Raw cell value.
 * @param {string}  col     Column key.
 * @param {Object}  options Formatting options.
 * @return {string} Mobile display text.
 */
function formatMobileDisplayCell(raw, col, options) {
	const {
		valueFormatExcluded,
		mobileValueFormatRules = [],
		activeSheetName,
	} = options;

	if (valueFormatExcluded.has(col)) {
		return raw === null || raw === undefined ? '' : String(raw);
	}

	const mobileReplacement = getReplaceRuleDisplay(
		raw,
		col,
		activeSheetName,
		mobileValueFormatRules
	);
	if (mobileReplacement !== null) {
		return mobileReplacement;
	}

	const abbrevDisplay = getAbbreviationDisplay(raw, col, options);
	if (abbrevDisplay !== null) {
		return abbrevDisplay;
	}

	return formatDisplayCellWithoutReplace(raw, col, options);
}

/**
 * Desktop and mobile display strings for a cell (mobile may use k/M/B/T rules).
 *
 * @param {unknown} raw     Raw cell value.
 * @param {string}  col     Column key.
 * @param {Object}  options Formatting options.
 * @return {{ desktop: string, mobile: string }} Display strings.
 */
export function formatDisplayCellPair(raw, col, options) {
	return {
		desktop: formatDisplayCell(raw, col, options),
		mobile: formatMobileDisplayCell(raw, col, options),
	};
}
