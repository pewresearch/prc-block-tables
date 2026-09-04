/**
 * Row dropdown table helpers for data-table-render.
 */
import { applyCellBackground } from './contrasting-ink';

/** @type {WeakMap<HTMLElement, Object>} Lazy dropdown build specs keyed by toggle. */
const dropdownToggleSpecs = new WeakMap();

/**
 * @param {*}      parent      d3 selection for container.
 * @param {string} desktopText Desktop display text.
 * @param {string} mobileText  Mobile display text.
 */
function appendResponsiveValueSpans(parent, desktopText, mobileText) {
	parent
		.append('span')
		.attr('class', 'prc-data-table__value prc-data-table__value--desktop')
		.text(desktopText);
	parent
		.append('span')
		.attr('class', 'prc-data-table__value prc-data-table__value--mobile')
		.text(mobileText);
}

/**
 * @param {HTMLElement} parent      DOM container.
 * @param {string}      desktopText Desktop display text.
 * @param {string}      mobileText  Mobile display text.
 */
function appendResponsiveValueSpansDom(parent, desktopText, mobileText) {
	const desktop = parent.ownerDocument.createElement('span');
	desktop.className = 'prc-data-table__value prc-data-table__value--desktop';
	desktop.textContent = desktopText;
	parent.appendChild(desktop);

	const mobile = parent.ownerDocument.createElement('span');
	mobile.className = 'prc-data-table__value prc-data-table__value--mobile';
	mobile.textContent = mobileText;
	parent.appendChild(mobile);
}

/**
 * Column used as the mobile card title. Falls back to the first display column.
 *
 * @param {string[]} cols               Visible display column keys.
 * @param {string}   mobileHeaderColumn Configured mobile header column key.
 * @return {string} Column key for the mobile card title.
 */
export function resolveMobileHeaderColumn(cols, mobileHeaderColumn) {
	if (mobileHeaderColumn && cols.includes(mobileHeaderColumn)) {
		return mobileHeaderColumn;
	}
	return cols[0] ?? '';
}

/**
 * Compose a mobile card title from configured name/year columns.
 *
 * @param {Record<string, unknown>} row                Row data.
 * @param {Object}                  mobileHeaderFormat Context-provided format.
 * @return {string} Card title such as "Singapore (2010)".
 */
export function formatMobileCardHeader(row, mobileHeaderFormat) {
	if (
		!mobileHeaderFormat ||
		typeof mobileHeaderFormat !== 'object' ||
		typeof mobileHeaderFormat.nameColumn !== 'string' ||
		typeof mobileHeaderFormat.yearColumn !== 'string' ||
		!mobileHeaderFormat.nameColumn ||
		!mobileHeaderFormat.yearColumn
	) {
		return '';
	}

	const name = row[mobileHeaderFormat.nameColumn];
	const year = row[mobileHeaderFormat.yearColumn];
	const nameText =
		name === null || name === undefined ? '' : String(name).trim();
	const yearText =
		year === null || year === undefined ? '' : String(year).trim();

	if (nameText && yearText) {
		return `${nameText} (${yearText})`;
	}

	return nameText || yearText;
}

/**
 * Column keys consumed by the composed mobile card title.
 *
 * @param {Object} mobileHeaderFormat Context-provided format.
 * @return {string[]} Column keys to hide from the mobile card body.
 */
export function getMobileHeaderFormatExcludedColumns(mobileHeaderFormat) {
	if (
		!mobileHeaderFormat ||
		typeof mobileHeaderFormat !== 'object' ||
		typeof mobileHeaderFormat.nameColumn !== 'string' ||
		typeof mobileHeaderFormat.yearColumn !== 'string' ||
		!mobileHeaderFormat.nameColumn ||
		!mobileHeaderFormat.yearColumn
	) {
		return [];
	}

	return [mobileHeaderFormat.nameColumn, mobileHeaderFormat.yearColumn];
}

/**
 * Resolve the mobile cell label shown above each value on small screens.
 *
 * @param {string} col                 Column key.
 * @param {Object} mobileColumnHeaders Optional column-to-label map.
 * @param {Set}    hiddenHeaderSet     Columns with hidden header labels.
 * @return {string} Label for data-label attribute.
 */
export function resolveMobileColumnHeader(
	col,
	mobileColumnHeaders,
	hiddenHeaderSet
) {
	if (hiddenHeaderSet.has(col)) {
		return '';
	}
	const substitute = mobileColumnHeaders?.[col];
	return typeof substitute === 'string' && substitute.trim()
		? substitute.trim()
		: col;
}

/**
 * @param {Object} tableState     Table interactivity state slice.
 * @param {string} identityColumn Row identity column key.
 * @return {{ filterCols: string[], dropdownCols: string[] }} Filter and dropdown column keys.
 */
export function getDropdownColumnConfig(tableState, identityColumn) {
	const activeSheet =
		typeof tableState.activeSheet === 'string'
			? tableState.activeSheet
			: '';
	const columnsBySheet =
		tableState.rowDropdown?.columnsBySheet &&
		typeof tableState.rowDropdown.columnsBySheet === 'object' &&
		!Array.isArray(tableState.rowDropdown.columnsBySheet)
			? tableState.rowDropdown.columnsBySheet
			: {};
	const globalColumns = Array.isArray(tableState.rowDropdown?.columns)
		? tableState.rowDropdown.columns.map(String)
		: [];

	let configured = globalColumns;
	if (
		activeSheet &&
		Object.prototype.hasOwnProperty.call(columnsBySheet, activeSheet) &&
		Array.isArray(columnsBySheet[activeSheet])
	) {
		configured = columnsBySheet[activeSheet].map(String);
	}

	const dropdownCols = configured.filter((col) => col !== identityColumn);
	const activeFilters = new Set(Object.keys(tableState.columnFilters || {}));
	const filterCols = dropdownCols.filter((col) => activeFilters.has(col));
	return {
		filterCols,
		dropdownCols,
	};
}

/**
 * Group sheet rows by identity value, optionally sorting each group.
 *
 * @param {Record<string, unknown>[]} rows           Full sheet rows.
 * @param {string}                    identityColumn Identity column key.
 * @param {string[]}                  filterCols     Sortable filter columns.
 * @param {Function}                  compareForSort Sort comparator.
 * @return {Map<string, Record<string, unknown>[]>} Identity value to sibling rows.
 */
export function buildIdentitySiblingsIndex(
	rows,
	identityColumn,
	filterCols,
	compareForSort
) {
	const index = new Map();
	for (const sheetRow of rows) {
		const identityVal = String(sheetRow[identityColumn] ?? '');
		if (!index.has(identityVal)) {
			index.set(identityVal, []);
		}
		index.get(identityVal).push(sheetRow);
	}

	if (filterCols.length > 0) {
		const sortCol = filterCols[0];
		for (const siblings of index.values()) {
			siblings.sort((a, b) =>
				compareForSort(a[sortCol], b[sortCol], 'asc')
			);
		}
	}

	return index;
}

/**
 * @param {Record<string, unknown>[]} rows           Full sheet rows.
 * @param {Record<string, unknown>}   row            Current display row.
 * @param {string}                    identityColumn Identity column key.
 * @param {string[]}                  filterCols     Sortable filter columns.
 * @param {Function}                  compareForSort Sort comparator.
 * @return {Record<string, unknown>[]} Matching sibling rows.
 */
export function getIdentitySiblings(
	rows,
	row,
	identityColumn,
	filterCols,
	compareForSort
) {
	const index = buildIdentitySiblingsIndex(
		rows,
		identityColumn,
		filterCols,
		compareForSort
	);
	const identityVal = String(row[identityColumn] ?? '');
	return index.get(identityVal) ?? [];
}

/**
 * Whether a dropdown sibling row matches the active parent-table filter row.
 *
 * @param {Record<string, unknown>} sibRow     Sibling row from the dropdown.
 * @param {Record<string, unknown>} displayRow Filtered parent table row.
 * @param {string[]}                filterCols Dropdown columns with active filters.
 * @return {boolean} True when all filter columns match the parent row.
 */
export function isActiveFilterDropdownRow(sibRow, displayRow, filterCols) {
	if (!Array.isArray(filterCols) || filterCols.length === 0) {
		return false;
	}
	return filterCols.every(
		(col) => String(sibRow[col] ?? '') === String(displayRow[col] ?? '')
	);
}

/**
 * Append nested dropdown rows into a parent body row.
 *
 * @param {HTMLElement} parentTr                   Parent body row element.
 * @param {Object}      spec                       Lazy dropdown build spec.
 * @param {string}      spec.dropdownId            Nested table element id.
 * @param {Object}      spec.parentRow             Parent display row.
 * @param {Array}       spec.siblings              Identity sibling rows.
 * @param {string[]}    spec.dropdownCols          Dropdown column keys.
 * @param {string[]}    spec.filterCols            Active filter column keys.
 * @param {Object}      spec.formatOptions         Cell format options.
 * @param {Set}         spec.boldColumnSet         Bold body column keys.
 * @param {Function}    spec.formatDisplayCellPair Formatter.
 */
function appendNestedDropdownTable(parentTr, spec) {
	const {
		dropdownId,
		parentRow,
		siblings,
		dropdownCols,
		filterCols,
		formatOptions,
		boldColumnSet,
		formatDisplayCellPair,
	} = spec;

	const nestedTable = parentTr.ownerDocument.createElement('table');
	nestedTable.className = 'dropdown-table dropdown-table-visible';
	nestedTable.id = dropdownId;
	nestedTable.setAttribute('role', 'region');
	nestedTable.setAttribute('aria-label', 'Additional data rows');

	siblings.forEach((sibRow) => {
		const isActiveFilter = isActiveFilterDropdownRow(
			sibRow,
			parentRow,
			filterCols
		);
		const sibTr = parentTr.ownerDocument.createElement('tr');
		sibTr.className = isActiveFilter
			? 'dropdown-table__row dropdown-table__row--active-filter'
			: 'dropdown-table__row';
		if (isActiveFilter) {
			sibTr.setAttribute('aria-current', 'true');
		}
		dropdownCols.forEach((col) => {
			const display = formatDisplayCellPair(
				sibRow[col],
				col,
				formatOptions
			);
			const cellTd = parentTr.ownerDocument.createElement('td');
			cellTd.className = 'dropdown-table__row__cell';
			if (boldColumnSet.has(col)) {
				cellTd.classList.add('prc-data-table__bold-cell');
			}
			appendResponsiveValueSpansDom(
				cellTd,
				display.desktop,
				display.mobile
			);
			sibTr.appendChild(cellTd);
		});
		nestedTable.appendChild(sibTr);
	});

	parentTr.appendChild(nestedTable);
}

/**
 * Close all open row dropdown tables within a mount node.
 *
 * @param {HTMLElement} mount Mount node.
 */
export function closeAllRowDropdowns(mount) {
	mount
		.querySelectorAll('.prc-data-table__dropdown-toggle')
		.forEach((btn) => {
			btn.setAttribute('aria-expanded', 'false');
			btn.classList.remove('prc-data-table__dropdown-toggle--expanded');
		});
	mount.querySelectorAll('.dropdown-table').forEach((tbl) => {
		tbl.remove();
	});
}

/**
 * Toggle a row dropdown open or closed; only one dropdown open at a time.
 *
 * @param {HTMLElement} mount  Mount node.
 * @param {HTMLElement} button Toggle button.
 */
export function handleRowDropdownToggle(mount, button) {
	const isExpanded = button.getAttribute('aria-expanded') === 'true';
	closeAllRowDropdowns(mount);
	if (isExpanded) {
		return;
	}

	const spec = dropdownToggleSpecs.get(button);
	if (!spec) {
		return;
	}

	const parentTr = button.closest('tr');
	if (!parentTr) {
		return;
	}

	appendNestedDropdownTable(parentTr, spec);
	button.setAttribute('aria-expanded', 'true');
	button.classList.add('prc-data-table__dropdown-toggle--expanded');
}

/**
 * Append tbody rows, optionally with expandable nested dropdown tables.
 *
 * Nested dropdown markup mirrors the GRF table: a `.dropdown-table` is a direct
 * child of the body `<tr>`, not a sibling row. Dropdown bodies are lazy-rendered
 * on first toggle to avoid building thousands of hidden nested rows on draw.
 *
 * @param {Object}      params                             Render parameters.
 * @param {*}           params.tbody                       d3 tbody selection.
 * @param {Array}       params.displayRows                 Rows to render.
 * @param {string[]}    params.cols                        Main table columns.
 * @param {string[]}    params.dropdownCols                Dropdown-only columns.
 * @param {string[]}    params.filterCols                  Active filter columns.
 * @param {boolean}     params.dropdownEnabled             Whether dropdowns are on.
 * @param {string}      params.identityColumn              Identity column key.
 * @param {Array}       params.activeSheetRows             Unfiltered sheet rows.
 * @param {boolean}     params.showRowKey                  Whether key swatch column shows.
 * @param {Object}      params.keyMap                      Key map config.
 * @param {Object}      params.formatOptions               Cell format options.
 * @param {Function}    params.formatDisplayCellPair       Desktop/mobile formatters.
 * @param {Function}    params.compareForSort              Sort comparator.
 * @param {HTMLElement} params.mount                       Table mount node.
 * @param {string}      params.tableId                     Table instance id.
 * @param {Object}      params.mobileColumnColors          Column-to-mobile-background map.
 * @param {string}      [params.mobileWorldCellBackground] Context World-column mobile background.
 * @param {Object}      [params.mobileColumnHeaders]       Column-to-mobile-header map.
 * @param {Object}      [params.mobileHeaderColumn]        Configured mobile header column key.
 * @param {Object}      [params.mobileHeaderFormat]        Context-provided composed card title format.
 * @param {string}      [params.resolvedMobileHeaderCol]   Pre-resolved card title column key.
 * @param {string[]}    [params.hiddenColumnHeaders]       Column keys with hidden header labels.
 * @param {string[]}    [params.boldColumns]               Column keys with bold body cells.
 */
export function appendDisplayRows({
	tbody,
	displayRows,
	cols,
	dropdownCols,
	filterCols,
	dropdownEnabled,
	identityColumn,
	activeSheetRows,
	showRowKey,
	keyMap,
	formatOptions,
	formatDisplayCellPair,
	compareForSort,
	mount,
	tableId,
	mobileColumnColors = {},
	mobileWorldCellBackground = '',
	mobileColumnHeaders = {},
	mobileHeaderColumn = '',
	mobileHeaderFormat = null,
	resolvedMobileHeaderCol = '',
	hiddenColumnHeaders = [],
	boldColumns = [],
}) {
	const hiddenHeaderSet = new Set(
		Array.isArray(hiddenColumnHeaders) ? hiddenColumnHeaders : []
	);
	const boldColumnSet = new Set(
		Array.isArray(boldColumns) ? boldColumns : []
	);
	const mobileHeaderCol =
		resolvedMobileHeaderCol ||
		resolveMobileHeaderColumn(cols, mobileHeaderColumn);

	const identityIndex = dropdownEnabled
		? buildIdentitySiblingsIndex(
				activeSheetRows,
				identityColumn,
				filterCols,
				compareForSort
			)
		: null;

	displayRows.forEach((row, rowIndex) => {
		const tr = tbody.append('tr');

		const identityVal = String(row[identityColumn] ?? '');
		const siblings = identityIndex?.get(identityVal) ?? [];
		const hasDropdown =
			dropdownEnabled && siblings.length > 1 && dropdownCols.length > 0;
		const dropdownId = `prc-dropdown-${tableId}-${rowIndex}`;
		const composedMobileHeader = formatMobileCardHeader(
			row,
			mobileHeaderFormat
		);
		const mobileHeaderDisplay = composedMobileHeader
			? { desktop: composedMobileHeader, mobile: composedMobileHeader }
			: formatDisplayCellPair(
					row[mobileHeaderCol],
					mobileHeaderCol,
					formatOptions
				);
		let cellKey = '';
		let fill = 'transparent';

		if (showRowKey) {
			cellKey =
				row[keyMap.column] === null || row[keyMap.column] === undefined
					? ''
					: String(row[keyMap.column]);
			fill = keyMap.colors[cellKey] || 'transparent';
		}

		if (hasDropdown) {
			tr.classed('prc-data-table__body-row--dropdown', true);
		}

		const mobileRowHead = tr
			.append('div')
			.attr('class', 'prc-data-table__mobile-row-head');

		if (showRowKey) {
			mobileRowHead
				.append('span')
				.attr('class', 'prc-data-table__row-swatch')
				.attr('aria-hidden', 'true')
				.style('background-color', fill);
			mobileRowHead
				.append('span')
				.attr('class', 'prc-data-table__sr-only')
				.text(cellKey || 'Uncategorized');
		}

		const mobileRowHeadLabel = mobileRowHead
			.append('span')
			.attr('class', 'prc-data-table__mobile-row-head__label');
		appendResponsiveValueSpans(
			mobileRowHeadLabel,
			mobileHeaderDisplay.desktop,
			mobileHeaderDisplay.mobile
		);

		if (showRowKey) {
			const keyTd = tr
				.append('td')
				.attr('class', 'prc-data-table__key-cell');
			keyTd
				.append('span')
				.attr('class', 'prc-data-table__row-swatch')
				.attr('aria-hidden', 'true')
				.style('background-color', fill);
			keyTd
				.append('span')
				.attr('class', 'prc-data-table__sr-only')
				.text(cellKey || 'Uncategorized');
		}

		cols.forEach((col) => {
			const display = formatDisplayCellPair(row[col], col, formatOptions);
			const td = tr
				.append('td')
				.attr(
					'data-label',
					resolveMobileColumnHeader(
						col,
						mobileColumnHeaders,
						hiddenHeaderSet
					)
				)
				.classed('prc-data-table__first-col', col === cols[0])
				.classed('prc-data-table__bold-cell', boldColumnSet.has(col));

			const cellColor = mobileColumnColors?.[col];
			if (cellColor) {
				applyCellBackground(td, cellColor);
			} else if (col === 'World') {
				applyCellBackground(td, mobileWorldCellBackground);
			}

			if (hasDropdown && col === cols[0]) {
				const toggle = td
					.append('button')
					.attr('type', 'button')
					.attr('class', 'prc-data-table__dropdown-toggle')
					.attr('aria-expanded', 'false')
					.attr('aria-controls', dropdownId)
					.on('click', function handleDropdownClick() {
						handleRowDropdownToggle(mount, this);
					});
				appendResponsiveValueSpans(
					toggle,
					display.desktop,
					display.mobile
				);

				const toggleNode = toggle.node();
				if (toggleNode) {
					dropdownToggleSpecs.set(toggleNode, {
						dropdownId,
						parentRow: row,
						siblings,
						dropdownCols,
						filterCols,
						formatOptions,
						boldColumnSet,
						formatDisplayCellPair,
					});
				}
			} else {
				appendResponsiveValueSpans(td, display.desktop, display.mobile);
			}
		});
	});
}
