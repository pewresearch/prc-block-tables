/**
 * WordPress Dependencies
 */
import { store, getContext, getElement } from '@wordpress/interactivity';

/**
 * Interactivity store for the Power Spreadsheet block.
 *
 * The block wrapper provides the authoritative `activeSheetIndex` in context.
 * Tab buttons sit directly under the wrapper (no nested context) so writing
 * `context.activeSheetIndex` mutates the shared value. Each sheet panel adds a
 * nested `{ sheetIndex }` context and only reads `activeSheetIndex`.
 */
store('prc-block/power-spreadsheet', {
	state: {
		get isActiveSheet() {
			const context = getContext();
			return context.sheetIndex === context.activeSheetIndex;
		},
		get isActiveTab() {
			const { ref } = getElement();
			const context = getContext();
			const tabIndex = parseInt(ref.getAttribute('data-sheet-index'), 10);
			return tabIndex === context.activeSheetIndex;
		},
	},
	actions: {
		setActiveSheet: () => {
			const { ref } = getElement();
			const context = getContext();
			const index = parseInt(ref.getAttribute('data-sheet-index'), 10);
			if (!Number.isNaN(index)) {
				context.activeSheetIndex = index;
			}
		},
	},
});
