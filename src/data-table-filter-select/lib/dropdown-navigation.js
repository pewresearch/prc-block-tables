/**
 * Dropdown root lookup, visible-item queries, and keyboard highlight helpers.
 */
import { optionMatchesSearch } from './search-options';

/**
 * Option value that should appear highlighted in the menu.
 *
 * Keyboard highlight wins while `context.highlightedValue` is set so search
 * re-renders do not snap the highlight back to the table selection.
 *
 * @param {Object|null|undefined} context       Block interactive context.
 * @param {string}                selectedValue Table-resolved dropdown value.
 * @return {string} Value to mark active in the menu.
 */
export function resolveMenuHighlightValue(context, selectedValue) {
	if (
		context?.highlightedValue !== null &&
		context?.highlightedValue !== undefined
	) {
		return String(context.highlightedValue);
	}

	return selectedValue;
}

/**
 * Whether the stored keyboard highlight still matches the current search.
 *
 * @param {Object|null|undefined} context Block interactive context.
 * @return {boolean} False when the highlighted option is filtered out.
 */
export function highlightedValueMatchesSearch(context) {
	const highlighted = context?.highlightedValue;

	if (highlighted === null || highlighted === undefined) {
		return true;
	}

	const query = context?.searchQuery ?? '';

	if (String(highlighted) === '__reset__') {
		return optionMatchesSearch(context?.resetLabel || '', query);
	}

	const index = Number.parseInt(highlighted, 10);

	if (Number.isNaN(index) || !Array.isArray(context?.options)) {
		return false;
	}

	return optionMatchesSearch(context.options[index]?.label || '', query);
}

/**
 * Resolve the Semantic UI dropdown root from any descendant.
 *
 * Search keydown handlers bind to the input, which is a sibling of `.menu`.
 * Callers must walk up to this root before querying option items.
 *
 * @param {Element|null|undefined} element Element inside the dropdown.
 * @return {Element|null} The `.ui.selection.dropdown` root, or null.
 */
export function getDropdownRoot(element) {
	if (!element || typeof element.closest !== 'function') {
		return null;
	}

	return element.closest('.ui.selection.dropdown');
}

/**
 * Return visible dropdown menu items, skipping hidden options.
 *
 * Accepts the dropdown root or any descendant (search input, menu, item).
 *
 * @param {Element|null|undefined} element Dropdown root or a descendant.
 * @return {HTMLElement[]} Visible option elements.
 */
export function getVisibleDropdownItems(element) {
	const dropdown = getDropdownRoot(element);

	if (!dropdown) {
		return [];
	}

	return Array.from(
		dropdown.querySelectorAll('.menu .item[role="option"]')
	).filter((item) => !item.hidden);
}
