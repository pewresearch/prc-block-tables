/**
 * Resolve data-table header special border colors from religion icon fills.
 */

/**
 * @param {string}                      label   Column header label.
 * @param {Record<string, string>|null} [fills] Optional icon fills map for validation.
 * @return {string|null} Kebab-case religion slug or null.
 */
export function slugFromHeader(label, fills = null) {
	if (typeof label !== 'string' || !label.trim()) {
		return null;
	}

	const slug = label.trim().toLowerCase().replace(/\s+/g, '-');
	if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
		return null;
	}

	if (fills && !fills[slug]) {
		return null;
	}

	return slug;
}

/**
 * @return {Record<string, string>|null} Icon fills from the editor global, or null.
 */
export function getReligionIconFills() {
	if (
		typeof window === 'undefined' ||
		!window.prcRpIconFills ||
		typeof window.prcRpIconFills !== 'object'
	) {
		return null;
	}

	return window.prcRpIconFills;
}

/**
 * @param {string}                      column Column header label.
 * @param {Record<string, string>|null} fills  Religion icon fills map.
 * @return {string|null} Hex color or null.
 */
export function hexForHeader(column, fills) {
	if (!fills) {
		return null;
	}

	const slug = slugFromHeader(column, fills);
	if (!slug || !fills[slug]) {
		return null;
	}

	return fills[slug];
}

/**
 * Build a column-to-hex map for visible religion headers.
 *
 * @param {string[]}                    columns       Column header labels.
 * @param {Record<string, string>|null} fills         Religion icon fills map.
 * @param {string[]|Set<string>}        hiddenHeaders Columns with visually hidden header text.
 * @return {Record<string, string>} Column-to-hex map for religion headers.
 */
export function resolveHeaderSpecialBorderColors(
	columns,
	fills,
	hiddenHeaders = []
) {
	const hiddenSet =
		hiddenHeaders instanceof Set
			? hiddenHeaders
			: new Set(
					Array.isArray(hiddenHeaders)
						? hiddenHeaders.map(String)
						: []
				);

	const resolved = {};
	if (!Array.isArray(columns) || !fills) {
		return resolved;
	}

	for (const column of columns) {
		if (hiddenSet.has(column)) {
			continue;
		}

		const hex = hexForHeader(column, fills);
		if (hex) {
			resolved[column] = hex;
		}
	}

	return resolved;
}

/**
 * Resolve border color for one column: religion fills first, then legacy map.
 *
 * @param {string}                      column       Column header label.
 * @param {Record<string, string>}      legacyColors Stored attribute color map.
 * @param {Record<string, string>|null} fills        Religion icon fills map.
 * @return {string|null} Resolved hex color or null.
 */
export function resolveHeaderBorderColor(column, legacyColors, fills) {
	if (fills) {
		return hexForHeader(column, fills);
	}

	if (
		legacyColors &&
		typeof legacyColors === 'object' &&
		legacyColors[column]
	) {
		return legacyColors[column];
	}

	return null;
}
