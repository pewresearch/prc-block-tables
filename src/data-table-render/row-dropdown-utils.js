/**
 * Row dropdown table helpers for data-table-render.
 */
/* global CSS */

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
 * Column used as the mobile card title. Falls back to the first display column.
 *
 * @param {string[]} cols                Visible display column keys.
 * @param {string}   mobileHeaderColumn  Configured mobile header column key.
 * @return {string} Column key for the mobile card title.
 */
export function resolveMobileHeaderColumn(cols, mobileHeaderColumn) {
	if (mobileHeaderColumn && cols.includes(mobileHeaderColumn)) {
		return mobileHeaderColumn;
	}
	return cols[0] ?? '';
}

/**
 * Resolve the mobile cell label shown above each value on small screens.
 *
 * @param {string}   col                 Column key.
 * @param {Object}   mobileColumnHeaders Optional column-to-label map.
 * @param {Set}      hiddenHeaderSet     Columns with hidden header labels.
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
	const configured = Array.isArray(tableState.rowDropdown?.columns)
		? tableState.rowDropdown.columns.map(String)
		: [];
	const dropdownCols = configured.filter((col) => col !== identityColumn);
	const activeFilters = new Set(Object.keys(tableState.columnFilters || {}));
	const filterCols = dropdownCols.filter((col) => activeFilters.has(col));
	return {
		filterCols,
		dropdownCols,
	};
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
	const identityVal = String(row[identityColumn] ?? '');
	let siblings = rows.filter(
		(r) => String(r[identityColumn] ?? '') === identityVal
	);
	if (filterCols.length > 0) {
		const sortCol = filterCols[0];
		siblings = siblings
			.slice()
			.sort((a, b) => compareForSort(a[sortCol], b[sortCol], 'asc'));
	}
	return siblings;
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
		tbl.classList.remove('dropdown-table-visible');
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
	const controlsId = button.getAttribute('aria-controls');
	if (!controlsId) {
		return;
	}
	const nested = mount.querySelector(`#${CSS.escape(controlsId)}`);
	if (!nested) {
		return;
	}
	button.setAttribute('aria-expanded', 'true');
	button.classList.add('prc-data-table__dropdown-toggle--expanded');
	nested.classList.add('dropdown-table-visible');
}

/**
 * Append tbody rows, optionally with expandable nested dropdown tables.
 *
 * Nested dropdown markup mirrors the GRF table: a `.dropdown-table` is a direct
 * child of the body `<tr>`, not a sibling row.
 *
 * @param {Object}      params                       Render parameters.
 * @param {*}           params.tbody                 d3 tbody selection.
 * @param {Array}       params.displayRows           Rows to render.
 * @param {string[]}    params.cols                  Main table columns.
 * @param {string[]}    params.dropdownCols          Dropdown-only columns.
 * @param {string[]}    params.filterCols            Active filter columns.
 * @param {boolean}     params.dropdownEnabled       Whether dropdowns are on.
 * @param {string}      params.identityColumn        Identity column key.
 * @param {Array}       params.activeSheetRows       Unfiltered sheet rows.
 * @param {boolean}     params.showRowKey            Whether key swatch column shows.
 * @param {Object}      params.keyMap                Key map config.
 * @param {Object}      params.formatOptions         Cell format options.
 * @param {Function}    params.formatDisplayCellPair Desktop/mobile formatters.
 * @param {Function}    params.compareForSort        Sort comparator.
 * @param {HTMLElement} params.mount                 Table mount node.
 * @param {string}      params.tableId               Table instance id.
 * @param {Object}      params.mobileColumnColors    Column-to-mobile-background map.
 * @param {Object}      [params.mobileColumnHeaders] Column-to-mobile-header map.
 * @param {string}      [params.mobileHeaderColumn]        Configured mobile header column key.
 * @param {string}      [params.resolvedMobileHeaderCol]   Pre-resolved card title column key.
 * @param {string[]}    [params.hiddenColumnHeaders] Column keys with hidden header labels.
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
	mobileColumnHeaders = {},
	mobileHeaderColumn = '',
	resolvedMobileHeaderCol = '',
	hiddenColumnHeaders = [],
}) {
	const hiddenHeaderSet = new Set(
		Array.isArray(hiddenColumnHeaders) ? hiddenColumnHeaders : []
	);
	const mobileHeaderCol =
		resolvedMobileHeaderCol ||
		resolveMobileHeaderColumn(cols, mobileHeaderColumn);

	displayRows.forEach((row, rowIndex) => {
		const tr = tbody.append('tr');

		const siblings = dropdownEnabled
			? getIdentitySiblings(
					activeSheetRows,
					row,
					identityColumn,
					filterCols,
					compareForSort
				)
			: [];
		const hasDropdown =
			dropdownEnabled && siblings.length > 1 && dropdownCols.length > 0;
		const dropdownId = `prc-dropdown-${tableId}-${rowIndex}`;
		const mobileHeaderDisplay = formatDisplayCellPair(
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
				.classed('prc-data-table__first-col', col === cols[0]);

			const cellColor = mobileColumnColors?.[col];
			if (cellColor) {
				td.style('--prc-data-table-cell-bg', cellColor);
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
			} else {
				appendResponsiveValueSpans(td, display.desktop, display.mobile);
			}
		});

		if (!hasDropdown) {
			return;
		}

		const nestedTable = tr
			.append('table')
			.attr('class', 'dropdown-table')
			.attr('id', dropdownId)
			.attr('role', 'region')
			.attr('aria-label', 'Additional data rows');

		siblings.forEach((sibRow) => {
			const sibTr = nestedTable
				.append('tr')
				.attr('class', 'dropdown-table__row');
			dropdownCols.forEach((col) => {
				const display = formatDisplayCellPair(
					sibRow[col],
					col,
					formatOptions
				);
				const cellTd = sibTr
					.append('td')
					.attr('class', 'dropdown-table__row__cell');
				appendResponsiveValueSpans(
					cellTd,
					display.desktop,
					display.mobile
				);
			});
		});
	});
}
