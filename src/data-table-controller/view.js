/**
 * Data Table Controller — Interactivity API module.
 *
 * Extends the shared prc-block/data-table store with CSV download.
 */
import { store, getContext } from '@wordpress/interactivity';

import {
	downloadCsv,
	mergeSheetsForCsv,
	sanitizeCsvFilename,
	tableToCsv,
} from './lib/csv-download';

const { state } = store('prc-block/data-table', {
	actions: {
		/**
		 * Download the current table as a merged CSV file.
		 *
		 * @param {Event} event Click or keydown event.
		 */
		downloadCsv(event) {
			if (
				event.type === 'keydown' &&
				event.key !== 'Enter' &&
				event.key !== ' '
			) {
				return;
			}

			const { dataTableInstanceId } = getContext();
			const table = state.tables[dataTableInstanceId];
			if (!table?.sheets) {
				return;
			}

			const { columns, rows } = mergeSheetsForCsv(table.sheets, {
				columnFilters: table.columnFilters,
			});
			if (!columns.length) {
				return;
			}

			const csv = tableToCsv(columns, rows);
			const filenameStem =
				typeof table.csvFilename === 'string' && table.csvFilename
					? table.csvFilename
					: sanitizeCsvFilename('');
			downloadCsv(`${filenameStem}_data_table.csv`, csv);
		},
	},
});
