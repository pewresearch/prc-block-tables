/**
 * Data Table Key — Interactivity API module.
 *
 * Extends the shared prc-block/data-table store with toggleable
 * column-filter actions for legend items when enableFilter is on.
 */
import { store, getContext } from '@wordpress/interactivity';

const { state } = store('prc-block/data-table', {
	state: {
		get isKeyFilterActive() {
			const { dataTableInstanceId, filterColumn, filterValue } =
				getContext();
			const table = state.tables[dataTableInstanceId];
			if (!table) {
				return false;
			}

			const cf = table.columnFilters?.[filterColumn];
			if (!cf) {
				return false;
			}

			return String(cf.value) === String(filterValue) && !cf.exclude;
		},
	},
	actions: {
		toggleKeyFilter() {
			const { dataTableInstanceId, filterColumn, filterValue } =
				getContext();
			const table = state.tables[dataTableInstanceId];
			if (!table) {
				return;
			}
			const cf = table.columnFilters?.[filterColumn];
			const isActive =
				cf && String(cf.value) === String(filterValue) && !cf.exclude;
			const next = { ...(table.columnFilters || {}) };

			if (isActive) {
				delete next[filterColumn];
			} else {
				next[filterColumn] = {
					value: filterValue,
					exclude: false,
				};
			}

			// Reassign the map so shallow watchers (void table.columnFilters) notify.
			table.columnFilters = next;
			table.sortColumn = null;
			table.sortDirection = 'asc';
		},
	},
});
