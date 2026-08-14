/* eslint-disable no-unused-expressions -- d3 selections */
/* global CSS, requestAnimationFrame, cancelAnimationFrame */
/**
 * Data table — Interactivity API + d3.
 */
import {
	store,
	getContext,
	getElement,
	getServerState,
} from '@wordpress/interactivity';
import { select } from '@prc/d3';
import {
	appendDisplayRows,
	getDropdownColumnConfig,
	resolveMobileHeaderColumn,
} from './row-dropdown-utils';
import { formatDisplayCellPair } from './cell-display-format';
import {
	MOBILE_BREAKPOINT,
	isMobileViewport,
	resolveDisplayColumns,
	resolveMobileCellTrackCount,
} from './mobile-columns';

const DATA_TABLE_STORE = 'prc-block/data-table';

/**
 * Instance ids whose syncOnNavigation watch has already run its initial pass.
 *
 * @type {Set<string>}
 */
const navSeededIds = new Set();

/**
 * Ensure a persistent polite live region exists as a sibling of the table
 * mount. It must live outside the mount node because d3 tears down and
 * rebuilds the mount's contents on every redraw; a live region that is
 * destroyed and recreated will not be announced by assistive tech.
 *
 * @param {HTMLElement} mount Mount node.
 * @return {HTMLElement|null} The live region element, or null.
 */
function ensureLiveRegion(mount) {
	const wrapper = mount.parentNode;
	if (!wrapper) {
		return null;
	}
	let region = wrapper.querySelector('.prc-data-table-status');
	if (!region) {
		region = mount.ownerDocument.createElement('div');
		region.className = 'prc-data-table-status prc-data-table__sr-only';
		region.setAttribute('role', 'status');
		region.setAttribute('aria-live', 'polite');
		wrapper.appendChild(region);
	}
	return region;
}

/**
 * Announce a message to screen readers via the table's live region.
 *
 * @param {HTMLElement} mount   Mount node.
 * @param {string}      message Message to announce.
 */
function announce(mount, message) {
	const region = ensureLiveRegion(mount);
	if (region) {
		region.textContent = message;
	}
}

/**
 * @param {string|null} sortedDirection Active sort direction for column, or null.
 * @return {'ascending'|'descending'|'none'} aria-sort value.
 */
function ariaSortValue(sortedDirection) {
	if (sortedDirection === 'asc') {
		return 'ascending';
	}
	if (sortedDirection === 'desc') {
		return 'descending';
	}
	return 'none';
}

/**
 * @param {unknown}      a         Cell a.
 * @param {unknown}      b         Cell b.
 * @param {'asc'|'desc'} direction Sort direction.
 * @return {number}                Compare result (-1, R, or 1 style via localeCompare path).
 */
function compareForSort(a, b, direction) {
	const mul = direction === 'asc' ? 1 : -1;
	const sa = a === null || a === undefined ? '' : String(a);
	const sb = b === null || b === undefined ? '' : String(b);
	const na = Number(sa.replace(/,/g, ''));
	const nb = Number(sb.replace(/,/g, ''));
	if (sa !== '' && sb !== '' && !Number.isNaN(na) && !Number.isNaN(nb)) {
		if (na === nb) {
			return 0;
		}
		return na < nb ? -mul : mul;
	}
	return (
		sa.localeCompare(sb, undefined, {
			numeric: true,
			sensitivity: 'base',
		}) * mul
	);
}

/**
 * @param {Object} tableState State slice for one table.
 * @return {Record<string, unknown>[]} Sorted or original row copies.
 */
function getSortedRows(tableState) {
	const { sortColumn, sortDirection, activeSheet, sheets, columnFilters } =
		tableState;
	const activeSheetData = sheets[activeSheet];
	const { columns, rows } = activeSheetData;

	let filtered = rows;
	if (columnFilters) {
		for (const [col, filter] of Object.entries(columnFilters)) {
			if (
				!filter ||
				filter.value === null ||
				filter.value === undefined
			) {
				continue;
			}
			const matchVal = String(filter.value);
			filtered = filtered.filter((r) => {
				const cell = String(r[col] ?? '');
				const matches =
					filter.match === 'beginsWith'
						? cell.startsWith(matchVal)
						: cell === matchVal;
				return filter.exclude ? !matches : matches;
			});
		}
	}

	if (!sortColumn || !columns?.length) {
		return filtered.slice();
	}
	const copy = filtered.map((r) => ({ ...r }));
	copy.sort((r1, r2) =>
		compareForSort(r1[sortColumn], r2[sortColumn], sortDirection)
	);
	return copy;
}

/**
 * @param {HTMLElement}       mount       Mount node.
 * @param {string}            tableId     Instance id.
 * @param {Object<string, *>} tablesState Shared tables state object.
 */
function drawTable(mount, tableId, tablesState) {
	const tableState = tablesState[tableId];
	if (!tableState?.sheets) {
		const rootEmpty = select(mount);
		rootEmpty.selectAll('*').remove();
		rootEmpty
			.append('p')
			.attr('class', 'prc-data-table-empty')
			.text('No table data.');
		return;
	}
	const activeSheetName = tableState.activeSheet;
	const activeSheetData = tableState.sheets[activeSheetName];
	if (!activeSheetData) {
		const rootEmpty = select(mount);
		rootEmpty.selectAll('*').remove();
		rootEmpty
			.append('p')
			.attr('class', 'prc-data-table-empty')
			.text('No table data.');
		return;
	}

	const {
		valuePrefix = '',
		valueSuffix = '',
		valueFormatSheets = [],
		valueFormatExcludedColumns = [],
		valueFormatRules = [],
		mobileValueFormatRules = [],
		enableHeaderSpecialBorders = false,
		headerSpecialBorderColors = {},
		mobileColumnColors = {},
		mobileColumnHeaders = {},
		mobileHeaderColumn = '',
		mobileHiddenColumns = [],
		enableColumnSorting = true,
		hiddenColumnHeaders = [],
		tableTextAlign = 'center',
	} = tableState;
	const valueFormatExcluded = new Set(valueFormatExcludedColumns);
	const hiddenHeaderSet = new Set(
		Array.isArray(hiddenColumnHeaders) ? hiddenColumnHeaders : []
	);
	const keyMap = tableState.keyMap;
	const showRowKey =
		keyMap &&
		typeof keyMap.column === 'string' &&
		keyMap.column &&
		keyMap.colors &&
		typeof keyMap.colors === 'object';

	const orderedCols = resolveDisplayColumns(tableState, activeSheetData);
	if (!orderedCols.length) {
		const rootEmpty = select(mount);
		rootEmpty.selectAll('*').remove();
		rootEmpty
			.append('p')
			.attr('class', 'prc-data-table-empty')
			.text('No table data.');
		return;
	}

	const mobileHeaderCol = resolveMobileHeaderColumn(
		orderedCols,
		mobileHeaderColumn
	);
	const mobileHiddenSet = new Set(
		Array.isArray(mobileHiddenColumns) ? mobileHiddenColumns : []
	);
	const cols = isMobileViewport()
		? orderedCols.filter((col) => !mobileHiddenSet.has(col))
		: orderedCols;

	const displayRows = getSortedRows(tableState);
	const root = select(mount);

	const rowDropdown = tableState.rowDropdown;
	const dropdownEnabled = rowDropdown?.enabled && rowDropdown?.identityColumn;
	const identityColumn = dropdownEnabled ? rowDropdown.identityColumn : '';
	const { filterCols, dropdownCols } = dropdownEnabled
		? getDropdownColumnConfig(tableState, identityColumn)
		: { filterCols: [], dropdownCols: [] };
	const formatOptions = {
		valueFormatExcluded,
		valueFormatRules,
		mobileValueFormatRules,
		activeSheetName,
		valuePrefix,
		valueSuffix,
		valueFormatSheets,
	};

	// Preserve keyboard focus across the full teardown/rebuild below by
	// remembering which sort control (keyed by column) is focused, then
	// restoring it once the new table is built.
	const activeEl = mount.ownerDocument.activeElement;
	const focusedCol =
		activeEl && mount.contains(activeEl)
			? activeEl.getAttribute('data-col')
			: null;

	root.selectAll('*').remove();

	// Native <table> semantics are exactly right for a static data table, so
	// no ARIA grid/row/cell roles are applied — they would override the
	// table semantics without delivering the grid keyboard model.
	const table = root
		.append('table')
		.attr('class', 'prc-data-table')
		.classed('prc-data-table--row-dropdowns', dropdownEnabled)
		.style(
			'--prc-data-table-cell-text-align',
			['left', 'center', 'right'].includes(tableTextAlign)
				? tableTextAlign
				: 'center'
		)
		.style(
			'--prc-data-table-mobile-track-count',
			String(resolveMobileCellTrackCount(tableState))
		);

	const captionText =
		activeSheetName && activeSheetName !== 'default'
			? activeSheetName
			: 'Data table';
	table
		.append('caption')
		.attr('class', 'prc-data-table__caption')
		.text(captionText);

	const thead = table.append('thead');
	const thr = thead.append('tr');

	if (showRowKey) {
		const keyHeader = thr
			.append('th')
			.attr('scope', 'col')
			.attr('class', 'prc-data-table__key-header');
		keyHeader
			.append('span')
			.attr('class', 'prc-data-table__sr-only')
			.text('Category');
	}

	cols.forEach((col) => {
		const sorted =
			tableState.sortColumn === col ? tableState.sortDirection : null;
		const th = thr
			.append('th')
			.attr('scope', 'col')
			.classed('prc-data-table__first-col', col === cols[0]);

		if (enableHeaderSpecialBorders) {
			const borderColor = headerSpecialBorderColors?.[col];
			if (borderColor) {
				th.classed('prc-data-table__header-special-border', true).style(
					'--prc-data-table-header-border-color',
					borderColor
				);
			}
		}

		// With sorting disabled, headers are plain, non-interactive labels
		// (no button, no aria-sort; th has no pointer cursor — only the sort button does).
		if (!enableColumnSorting) {
			if (hiddenHeaderSet.has(col)) {
				th.append('span')
					.attr('class', 'prc-data-table__sr-only')
					.text(col);
			} else {
				th.append('span').text(col);
			}
			return;
		}

		th.attr('aria-sort', ariaSortValue(sorted));

		// A real <button> gives native keyboard operability (Enter/Space),
		// a focus ring, and a "button" role announcement for the sort control.
		const sortButton = th
			.append('button')
			.attr('type', 'button')
			.attr('class', 'prc-data-table__sort-button')
			.attr('data-col', col)
			.classed('prc-data-table__sort-asc', sorted === 'asc')
			.classed('prc-data-table__sort-desc', sorted === 'desc');
		if (hiddenHeaderSet.has(col)) {
			sortButton.attr('aria-label', `Sort by ${col}`);
			sortButton
				.append('span')
				.attr('class', 'prc-data-table__sr-only')
				.text(col);
		} else {
			sortButton.append('span').text(col);
		}

		sortButton.on('click', () => {
			if (!tableState) {
				return;
			}
			if (tableState.sortColumn === col) {
				tableState.sortDirection =
					tableState.sortDirection === 'asc' ? 'desc' : 'asc';
			} else {
				tableState.sortColumn = col;
				tableState.sortDirection = 'asc';
			}
			announce(
				mount,
				`Table sorted by ${col}, ${
					tableState.sortDirection === 'asc'
						? 'ascending'
						: 'descending'
				}`
			);
			drawTable(mount, tableId, tablesState);
		});
	});

	const tbody = table.append('tbody');
	appendDisplayRows({
		tbody,
		displayRows,
		cols,
		dropdownCols,
		filterCols,
		dropdownEnabled,
		identityColumn,
		activeSheetRows: activeSheetData.rows,
		showRowKey,
		keyMap,
		formatOptions,
		formatDisplayCellPair,
		compareForSort,
		mount,
		tableId,
		mobileColumnColors,
		mobileColumnHeaders,
		mobileHeaderColumn,
		resolvedMobileHeaderCol: mobileHeaderCol,
		hiddenColumnHeaders,
	});

	if (focusedCol) {
		const restore = mount.querySelector(
			`button[data-col="${CSS.escape(focusedCol)}"]`
		);
		if (restore) {
			restore.focus();
		}
	}
}

/** @type {WeakMap<HTMLElement, number>} */
const pendingDrawFrames = new WeakMap();

/**
 * Deep-clone a plain table slice so live proxies never mutate getServerState().
 *
 * @param {Object} slice Server or live table slice.
 * @return {Object} Plain clone.
 */
function cloneTableSlice(slice) {
	return JSON.parse(JSON.stringify(slice));
}

/**
 * Read the current transition's server snapshot for one instance.
 *
 * Server-owned fields (sheets, formats, defaults) always come from here after
 * navigation. Client UI fields (columnFilters, sort, activeSheet) are reset to
 * that snapshot on every reconcile — they are not preserved across entity routes.
 *
 * @param {string} instanceId Table instance id.
 * @return {{ kind: 'found', slice: Object } | { kind: 'missing' }} Snapshot result.
 */
function readFreshServerTableSlice(instanceId) {
	let serverState;
	try {
		// Always pass the namespace. syncOnNavigation can run outside an
		// interactive scope, where getNamespace() is empty and getServerState()
		// would return the wrong store.
		serverState = getServerState(DATA_TABLE_STORE);
	} catch {
		return { kind: 'missing' };
	}
	const slice = serverState?.tables?.[instanceId];
	if (!slice || typeof slice !== 'object' || !slice.sheets) {
		return { kind: 'missing' };
	}
	return { kind: 'found', slice: cloneTableSlice(slice) };
}

/**
 * Replace the live slice with a fresh server snapshot (full reset policy).
 *
 * @param {string} instanceId Table instance id.
 * @param {Object} freshSlice Cloned server slice.
 */
function applyServerTableSlice(instanceId, freshSlice) {
	state.tables[instanceId] = freshSlice;
}

/**
 * Coalesce redraws by current wrapper element identity.
 *
 * @param {HTMLElement} wrapper    Render block wrapper.
 * @param {string}      instanceId Table instance id.
 */
function scheduleTableDraw(wrapper, instanceId) {
	const prior = pendingDrawFrames.get(wrapper);
	if (prior) {
		cancelAnimationFrame(prior);
	}
	const frame = requestAnimationFrame(() => {
		pendingDrawFrames.delete(wrapper);
		if (!wrapper.isConnected) {
			return;
		}
		const mount = wrapper.querySelector('.prc-data-table-mount');
		if (!mount) {
			return;
		}
		drawTable(mount, instanceId, state.tables);
	});
	pendingDrawFrames.set(wrapper, frame);
}

/**
 * Cancel a queued draw for a disconnected wrapper.
 *
 * @param {HTMLElement} wrapper Render block wrapper.
 */
function cancelScheduledDraw(wrapper) {
	const prior = pendingDrawFrames.get(wrapper);
	if (prior) {
		cancelAnimationFrame(prior);
		pendingDrawFrames.delete(wrapper);
	}
}

/**
 * Reconcile the live store against getServerState and schedule a draw.
 *
 * On parent-region remounts the live store may still hold the previous entity
 * (populateServerData merges with override=false). Always prefer the server
 * snapshot when present. Fall back to the live SSR seed only on initial mount
 * when the snapshot is not available yet.
 *
 * @param {HTMLElement}                           wrapper    Render wrapper.
 * @param {string}                                instanceId Table id.
 * @param {'initial-mount' | 'router-navigation'} reason     Why we reconcile.
 * @return {'replaced' | 'kept-initial-state' | 'cleared'} Reconcile outcome.
 */
function reconcileTable(wrapper, instanceId, reason) {
	const result = readFreshServerTableSlice(instanceId);
	if (result.kind === 'found') {
		applyServerTableSlice(instanceId, result.slice);
		scheduleTableDraw(wrapper, instanceId);
		return 'replaced';
	}
	if (reason === 'initial-mount' && state.tables[instanceId]?.sheets) {
		scheduleTableDraw(wrapper, instanceId);
		return 'kept-initial-state';
	}
	delete state.tables[instanceId];
	scheduleTableDraw(wrapper, instanceId);
	return 'cleared';
}

/**
 * Own every imperative resource attached to one render wrapper.
 *
 * @param {HTMLElement} wrapper    Render block wrapper.
 * @param {string}      instanceId Table instance id.
 * @return {() => void} Dispose function for data-wp-init cleanup.
 */
function connectTable(wrapper, instanceId) {
	reconcileTable(wrapper, instanceId, 'initial-mount');

	const mql = window.matchMedia(MOBILE_BREAKPOINT);
	const onViewportChange = () => {
		scheduleTableDraw(wrapper, instanceId);
	};
	mql.addEventListener('change', onViewportChange);

	return () => {
		mql.removeEventListener('change', onViewportChange);
		cancelScheduledDraw(wrapper);
	};
}

const { state } = store(DATA_TABLE_STORE, {
	state: {
		tables: {},
	},
	callbacks: {
		/**
		 * Connect this render wrapper: reconcile server slice, draw, and
		 * attach viewport listener. Returns a dispose fn.
		 *
		 * @return {(() => void)|undefined} Cleanup for data-wp-init.
		 */
		onTableMount() {
			const context = getContext();
			const id = context.dataTableInstanceId;
			const { ref } = getElement();
			if (!id || !ref) {
				return;
			}
			return connectTable(ref, id);
		},
		/**
		 * Re-seed the live table slice from server state after router navigation.
		 *
		 * getServerState() reads the interactivity-router navigation signal, so
		 * this watch re-runs after every client-side navigation. Skip the first
		 * pass because onTableMount already reconciled on mount.
		 */
		syncOnNavigation() {
			const context = getContext();
			const id = context.dataTableInstanceId;
			const { ref } = getElement();
			if (!id || !ref) {
				return;
			}

			void getServerState(DATA_TABLE_STORE);

			if (!navSeededIds.has(id)) {
				navSeededIds.add(id);
				return;
			}

			reconcileTable(ref, id, 'router-navigation');
		},
		/**
		 * Redraw when same-route table state changes (sheet, filters, key, sheets).
		 * Does not read getServerState — syncOnNavigation owns that path.
		 */
		watchTableState() {
			const context = getContext();
			const id = context.dataTableInstanceId;
			const { ref } = getElement();
			if (!id || !ref) {
				return;
			}
			const table = state.tables[id];
			if (!table) {
				return;
			}
			void table.sheets;
			void table.activeSheet;
			void table.keyMap;
			// Shallow `void table.columnFilters` only tracks map reassignment.
			// Filter actions often mutate nested entries in place; subscribe to
			// keys + entry fields so those clicks still redraw the table.
			const filters = table.columnFilters;
			if (filters) {
				for (const key of Object.keys(filters)) {
					const entry = filters[key];
					void entry?.value;
					void entry?.exclude;
					void entry?.match;
				}
			}
			scheduleTableDraw(ref, id);
		},
	},
});
