/**
 * Data Table Filter Select — Interactivity API module.
 *
 * Extends the shared prc-block/data-table store with Semantic UI-style
 * dropdown filter selection.
 */
import {
	store,
	getContext,
	getElement,
	getServerState,
} from '@wordpress/interactivity';

const DATA_TABLE_STORE = 'prc-block/data-table';

const COLUMN_FILTER_TYPES = new Set([
	'column',
	'column-include',
	'column-include-only',
	'column-exclude',
	'column-exclude-begins-with',
]);

/**
 * @param {Object} option Filter option descriptor from block context.
 * @param {Object} table  Table state slice.
 * @return {boolean} Whether this option matches the active table filter.
 */
function optionMatchesTableState(option, table) {
	const { value, filterType, filterColumn } = option;

	if (filterType === 'sheet') {
		return table.activeSheet === value;
	}

	if (filterType === 'column-include') {
		return !table.columnFilters?.[filterColumn];
	}

	const cf = table.columnFilters?.[filterColumn];
	if (!cf) {
		return false;
	}

	if (filterType === 'column-exclude-begins-with') {
		return (
			String(cf.value) === String(value) &&
			!!cf.exclude &&
			cf.match === 'beginsWith'
		);
	}

	if (filterType === 'column-exclude') {
		return (
			String(cf.value) === String(value) &&
			!!cf.exclude &&
			(!cf.match || cf.match === 'exact')
		);
	}

	return String(cf.value) === String(value) && !cf.exclude;
}

/**
 * @param {Object} table  Table state slice.
 * @param {Object} option Filter option descriptor.
 */
function applyOptionToTable(table, option) {
	const { value, filterType, filterColumn } = option;

	if (filterType === 'sheet') {
		table.activeSheet = value;
	} else {
		const next = { ...(table.columnFilters || {}) };
		if (filterType === 'column-include') {
			delete next[filterColumn];
		} else if (filterType === 'column-exclude-begins-with') {
			next[filterColumn] = {
				value,
				exclude: true,
				match: 'beginsWith',
			};
		} else {
			next[filterColumn] = {
				value,
				exclude: filterType === 'column-exclude',
			};
		}
		// Reassign the map so shallow watchers (void table.columnFilters) notify.
		table.columnFilters = next;
	}

	table.sortColumn = null;
	table.sortDirection = 'asc';
}

/**
 * Resolve the currently selected dropdown value from table state.
 *
 * @param {Object} blockContext Block interactive context.
 * @param {Object} tables       Shared table state map.
 * @return {string} Selected value (`__reset__`, option index, or empty).
 */
function resolveDropdownValue(blockContext, tables) {
	const { dataTableInstanceId, options, includeReset } = blockContext;
	const table = tables[dataTableInstanceId];

	if (!table || !Array.isArray(options)) {
		return includeReset ? '__reset__' : '';
	}

	for (let index = 0; index < options.length; index += 1) {
		if (optionMatchesTableState(options[index], table)) {
			return String(index);
		}
	}

	return includeReset ? '__reset__' : '';
}

/**
 * Resolve the activeSheet value for Clear / All / reset.
 *
 * Prefer a sheet not listed in the select options so Clear/All can appear
 * selected (same as clearing columnFilters). Otherwise restore the
 * page-load server sheet, then isDefault, then the first sheet.
 *
 * @param {Object}   table        Table state slice.
 * @param {Object}   blockContext Block interactive context.
 * @param {Object[]} sheetOptions Sheet filter options from the select.
 * @return {string|null} Sheet name to restore, or null if none.
 */
function resolveResetActiveSheet(table, blockContext, sheetOptions) {
	const { dataTableInstanceId } = blockContext;
	const sheetNames = Object.keys(table.sheets || {});
	const optionValues = new Set(
		sheetOptions.map((option) => String(option.value))
	);

	const unboundSheet = sheetNames.find(
		(name) => !optionValues.has(String(name))
	);
	if (unboundSheet !== undefined) {
		return unboundSheet;
	}

	try {
		const serverSheet =
			getServerState(DATA_TABLE_STORE)?.tables?.[dataTableInstanceId]
				?.activeSheet;
		if (
			serverSheet !== null &&
			serverSheet !== undefined &&
			serverSheet !== '' &&
			table.sheets?.[serverSheet]
		) {
			return serverSheet;
		}
	} catch {
		// getServerState can throw outside an interactive scope.
	}

	const defaultOption = sheetOptions.find((option) => option.isDefault);
	if (defaultOption) {
		return defaultOption.value;
	}

	return sheetNames[0] ?? null;
}

/**
 * Apply a dropdown selection value to the table state.
 *
 * @param {string} selected     Selection value.
 * @param {Object} blockContext Block interactive context.
 * @param {Object} table        Table state slice.
 */
function applySelection(selected, blockContext, table) {
	const { options, includeReset } = blockContext;

	if (selected === '__reset__' || (selected === '' && includeReset)) {
		const next = { ...(table.columnFilters || {}) };
		const columnsToClear = new Set();
		const sheetOptions = [];
		if (Array.isArray(options)) {
			for (const option of options) {
				if (option.filterType === 'sheet') {
					sheetOptions.push(option);
				}
				if (
					COLUMN_FILTER_TYPES.has(option.filterType) &&
					option.filterColumn &&
					option.filterType !== 'column-include'
				) {
					columnsToClear.add(option.filterColumn);
				}
			}
		}

		for (const col of columnsToClear) {
			delete next[col];
		}

		table.columnFilters = next;

		if (sheetOptions.length > 0) {
			const resetSheet = resolveResetActiveSheet(
				table,
				blockContext,
				sheetOptions
			);
			if (resetSheet !== null && resetSheet !== undefined) {
				table.activeSheet = resetSheet;
			}
		}

		table.sortColumn = null;
		table.sortDirection = 'asc';
		return;
	}

	const index = Number.parseInt(selected, 10);
	if (Number.isNaN(index) || !Array.isArray(options) || !options[index]) {
		return;
	}

	applyOptionToTable(table, options[index]);
}

/**
 * Move keyboard focus among dropdown menu items.
 *
 * @param {HTMLElement} dropdown  Dropdown root element.
 * @param {number}      direction -1 for up, 1 for down.
 */
function focusDropdownItem(dropdown, direction) {
	const items = Array.from(
		dropdown.querySelectorAll('.menu .item[role="option"]')
	);
	if (!items.length) {
		return;
	}

	const activeIndex = items.findIndex((item) =>
		item.classList.contains('active')
	);
	let nextIndex = activeIndex + direction;

	if (nextIndex < 0) {
		nextIndex = items.length - 1;
	} else if (nextIndex >= items.length) {
		nextIndex = 0;
	}

	items.forEach((item) => {
		item.classList.remove('active', 'selected');
		item.setAttribute('aria-selected', 'false');
	});

	const nextItem = items[nextIndex];
	nextItem.classList.add('active', 'selected');
	nextItem.setAttribute('aria-selected', 'true');
	nextItem.focus();
}

const { state } = store('prc-block/data-table', {
	state: {
		get dropdownValue() {
			const blockContext = getContext();
			return resolveDropdownValue(blockContext, state.tables);
		},
		get selectedLabel() {
			const blockContext = getContext();
			const { options, includeReset, resetLabel, placeholder } =
				blockContext;
			const selected = resolveDropdownValue(blockContext, state.tables);

			if (selected === '__reset__') {
				return placeholder || resetLabel || '';
			}

			const index = Number.parseInt(selected, 10);
			if (
				!Number.isNaN(index) &&
				Array.isArray(options) &&
				options[index]
			) {
				return options[index].label || '';
			}

			if (includeReset) {
				return placeholder || resetLabel || '';
			}

			return placeholder || '';
		},
		get isPlaceholder() {
			const blockContext = getContext();
			const { placeholder } = blockContext;
			if (!placeholder) {
				return false;
			}
			const selected = resolveDropdownValue(blockContext, state.tables);
			if (selected === '__reset__' || selected === '') {
				return true;
			}
			return Number.isNaN(Number.parseInt(selected, 10));
		},
		get isItemActive() {
			const context = getContext();
			const selected = resolveDropdownValue(context, state.tables);
			return String(context.optionValue) === String(selected);
		},
		get hasClearIcon() {
			const blockContext = getContext();

			if (!blockContext.hasClearIcon) {
				return false;
			}

			const selected = resolveDropdownValue(blockContext, state.tables);

			if (selected === '__reset__' || selected === '') {
				return false;
			}

			const index = Number.parseInt(selected, 10);
			return (
				!Number.isNaN(index) &&
				Array.isArray(blockContext.options) &&
				!!blockContext.options[index]
			);
		},
	},
	actions: {
		toggleDropdown() {
			const context = getContext();
			context.isOpen = !context.isOpen;
		},
		closeDropdown() {
			const context = getContext();
			context.isOpen = false;
		},
		stopPropagation(event) {
			event.stopPropagation();
		},
		clearSelection(event) {
			event.stopPropagation();

			const blockContext = getContext();
			const table = state.tables[blockContext.dataTableInstanceId];

			if (!table) {
				return;
			}

			applySelection('__reset__', blockContext, table);
			blockContext.isOpen = false;
		},
		selectItem(event) {
			event.stopPropagation();

			const context = getContext();
			const { dataTableInstanceId, optionValue } = context;
			const table = state.tables[dataTableInstanceId];

			if (!table || optionValue === undefined) {
				return;
			}

			applySelection(String(optionValue), context, table);
			context.isOpen = false;
		},
		selectColumnFilter(event) {
			const blockContext = getContext();
			const table = state.tables[blockContext.dataTableInstanceId];
			if (!table) {
				return;
			}

			const selected =
				event?.target?.value ?? event?.currentTarget?.value ?? '';

			applySelection(selected, blockContext, table);
		},
		onDropdownKeydown(event) {
			const context = getContext();

			if (event.key === 'Escape') {
				context.isOpen = false;
				event.preventDefault();
				return;
			}

			const { ref } = getElement();
			if (!ref) {
				return;
			}

			switch (event.key) {
				case 'Enter':
				case ' ':
					event.preventDefault();
					if (!context.isOpen) {
						context.isOpen = true;
					} else {
						const activeItem =
							ref.querySelector('.menu .item.active') ||
							ref.querySelector('.menu .item[role="option"]');
						activeItem?.click();
					}
					break;
				case 'ArrowDown':
					event.preventDefault();
					if (!context.isOpen) {
						context.isOpen = true;
					} else {
						focusDropdownItem(ref, 1);
					}
					break;
				case 'ArrowUp':
					event.preventDefault();
					if (!context.isOpen) {
						context.isOpen = true;
					} else {
						focusDropdownItem(ref, -1);
					}
					break;
				default:
					break;
			}
		},
	},
	callbacks: {
		onDocumentClick(event) {
			const context = getContext();
			if (!context.isOpen) {
				return;
			}

			const { ref } = getElement();
			if (ref && !ref.contains(event.target)) {
				context.isOpen = false;
			}
		},
	},
});
