/**
 * Data Table Controller — Interactivity API module.
 *
 * Extends the shared prc-block/data-table store with CSV download.
 */
import { store, getContext } from '@wordpress/interactivity';

import { downloadCsv, resolveCsvDownload } from './lib/csv-download';

const { state } = store('prc-block/data-table', {
	actions: {
		/**
		 * Download the table CSV.
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
			const file = resolveCsvDownload(state.tables[dataTableInstanceId]);
			if (!file) {
				return;
			}

			downloadCsv(file.filename, file.csv);
		},
	},
});
