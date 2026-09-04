/**
 * Data Table Filter — Interactivity API module.
 *
 * Extends the shared prc-block/data-table store with sheet-switching
 * and column-value filtering actions, plus derived active-state getters
 * used by data-wp-class--is-active.
 *
 * Filters are stored as a map keyed by column name so multiple columns
 * can be filtered simultaneously:
 *   state.tables[id].columnFilters = { year: { value: '2010', exclude: false } }
 *   state.tables[id].columnFilters = { region: { value: 'All', exclude: true, match: 'beginsWith' } }
 */
import { store, getContext } from '@wordpress/interactivity';
import { syncSortColumnToActiveSheet } from '../data-table-controller/lib/sync-sort-to-sheet';

function isColumnFilterActiveForContext(table, context) {
	const { filterValue, filterColumn, filterType } = context;

	if (!table) {
		return false;
	}

	const cf = table.columnFilters?.[filterColumn];

	if (filterType === 'column-include') {
		return !cf;
	}

	if (!cf) {
		return false;
	}

	if (filterType === 'column-exclude-begins-with') {
		return (
			String(cf.value) === String(filterValue) &&
			!!cf.exclude &&
			cf.match === 'beginsWith'
		);
	}

	if (filterType === 'column-exclude') {
		return (
			String(cf.value) === String(filterValue) &&
			!!cf.exclude &&
			(!cf.match || cf.match === 'exact')
		);
	}

	return String(cf.value) === String(filterValue) && !cf.exclude;
}

function applyColumnFilter(table, context) {
	const { filterValue, filterColumn, filterType } = context;
	const next = { ...(table.columnFilters || {}) };

	if (filterType === 'column-include') {
		delete next[filterColumn];
	} else if (filterType === 'column-exclude-begins-with') {
		next[filterColumn] = {
			value: filterValue,
			exclude: true,
			match: 'beginsWith',
		};
	} else {
		next[filterColumn] = {
			value: filterValue,
			exclude: filterType === 'column-exclude',
		};
	}

	// Reassign the map so shallow watchers (void table.columnFilters) notify.
	table.columnFilters = next;
}

const { state } = store('prc-block/data-table', {
	state: {
		get isFilterActive() {
			const { dataTableInstanceId, filterValue } = getContext();
			const table = state.tables[dataTableInstanceId];
			return table ? table.activeSheet === filterValue : false;
		},
		get isColumnFilterActive() {
			const { dataTableInstanceId } = getContext();
			const table = state.tables[dataTableInstanceId];
			return isColumnFilterActiveForContext(table, getContext());
		},
		get isCheckboxChecked() {
			const { dataTableInstanceId, invertCheckbox } = getContext();
			const table = state.tables[dataTableInstanceId];
			const isActive = isColumnFilterActiveForContext(
				table,
				getContext()
			);
			return invertCheckbox ? !isActive : isActive;
		},
	},
	actions: {
		setActiveSheet() {
			const { dataTableInstanceId, filterValue } = getContext();
			const table = state.tables[dataTableInstanceId];
			if (table) {
				table.activeSheet = filterValue;
				syncSortColumnToActiveSheet(table);
			}
		},
		setColumnFilter() {
			const { dataTableInstanceId } = getContext();
			const table = state.tables[dataTableInstanceId];
			if (!table) {
				return;
			}
			applyColumnFilter(table, getContext());
		},
		toggleColumnFilterCheckbox() {
			const { dataTableInstanceId } = getContext();
			const table = state.tables[dataTableInstanceId];
			if (!table) {
				return;
			}

			const context = getContext();
			const isActive = isColumnFilterActiveForContext(table, context);

			if (isActive) {
				const next = { ...(table.columnFilters || {}) };
				delete next[context.filterColumn];
				table.columnFilters = next;
			} else {
				applyColumnFilter(table, context);
			}
		},
	},
});
