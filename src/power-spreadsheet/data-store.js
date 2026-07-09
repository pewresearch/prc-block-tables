/**
 * WordPress Dependencies
 */
import {
	createReduxStore,
	register,
	createRegistrySelector,
} from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';

export const DATA_STORE_NAME = 'prc-block/power-spreadsheet';

const TABLE_BLOCK_NAME = 'prc-block/table';

/**
 * Map a prc-block/table inner block to structured sheet data.
 *
 * @param {import('@wordpress/blocks').BlockInstance} block Inner table block.
 * @param {number}                                    index Zero-based sheet index (for default name).
 * @return {{ id: string, name: string, head: unknown[], body: unknown[], foot: unknown[], columnMeta: unknown[] }} Sheet data.
 */
function mapSheet(block, index) {
	const metadataName = block.attributes?.metadata?.name;
	const name =
		typeof metadataName === 'string' && metadataName.trim()
			? metadataName.trim()
			: `Sheet ${index + 1}`;

	return {
		id: block.clientId,
		name,
		head: block.attributes?.head ?? [],
		body: block.attributes?.body ?? [],
		foot: block.attributes?.foot ?? [],
		columnMeta: block.attributes?.columnMeta ?? [],
	};
}

const selectors = {
	/**
	 * Nested array of every sheet's structured data for a given spreadsheet clientId.
	 *
	 * @param {Object} state    Store state (unused; data is derived from block editor).
	 * @param {string} clientId Spreadsheet block clientId.
	 * @return {Array<{ id: string, name: string, head: unknown[], body: unknown[], foot: unknown[], columnMeta: unknown[] }>} Sheet data.
	 */
	getSheetData: createRegistrySelector(
		(select) => (state, clientId) =>
			select(blockEditorStore)
				.getBlocks(clientId)
				.filter((block) => block.name === TABLE_BLOCK_NAME)
				.map((block, index) => mapSheet(block, index))
	),

	/**
	 * Convenience wrapper: { sheets: [...] }.
	 *
	 * @param {Object} state    Store state (unused).
	 * @param {string} clientId Spreadsheet block clientId.
	 * @return {{ sheets: ReturnType<typeof mapSheet>[] }} Spreadsheet data.
	 */
	getSpreadsheetData: createRegistrySelector(
		(select) => (state, clientId) => ({
			sheets: select(DATA_STORE_NAME).getSheetData(clientId),
		})
	),
};

const store = createReduxStore(DATA_STORE_NAME, {
	reducer: (state = {}) => state,
	selectors,
});

register(store);
