/**
 * Strip HTML tags from a label string for search matching.
 *
 * @param {string} label Label text, possibly containing HTML.
 * @return {string} Plain text label.
 */
export function stripLabelHtml(label) {
	if (typeof label !== 'string') {
		return '';
	}

	return label.replace(/<[^>]*>/g, '').trim();
}

/**
 * Whether a dropdown option label matches a search query.
 *
 * @param {string} label Option label (may contain HTML).
 * @param {string} query User search query.
 * @return {boolean} True when the option should remain visible.
 */
export function optionMatchesSearch(label, query) {
	const normalizedQuery = stripLabelHtml(String(query ?? '')).toLowerCase();

	if (!normalizedQuery) {
		return true;
	}

	const normalizedLabel = stripLabelHtml(String(label ?? '')).toLowerCase();

	return normalizedLabel.includes(normalizedQuery);
}

/**
 * Whether any dropdown option matches the search query.
 *
 * @param {Object}   context Block interactive context.
 * @param {Object[]} options Option descriptors with label fields.
 * @return {boolean} True when at least one option matches.
 */
export function hasMatchingSearchOptions(context, options) {
	const query = String(context?.searchQuery ?? '').trim();

	if (!query) {
		return true;
	}

	if (
		context?.includeReset &&
		optionMatchesSearch(context.resetLabel || '', query)
	) {
		return true;
	}

	if (!Array.isArray(options)) {
		return false;
	}

	return options.some((option) =>
		optionMatchesSearch(option?.label || '', query)
	);
}
