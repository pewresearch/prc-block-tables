/**
 * WordPress Dependencies
 */
import { defineBindingSource } from '@prc/functions';
import { __ } from '@wordpress/i18n';

/**
 * Register the client-side block bindings for remote pivot table sum functionality.
 *
 * This provides a client-side binding source that mirrors the server-side functionality,
 * allowing blocks in the editor to display live previews of column sums from remote
 * pivot table data.
 */
export default function registerBlockBindings() {
	defineBindingSource({
		name: 'prc-block/remote-pivot-table-sum',
		label: __('Remote Pivot Table Sum', 'prc-block-tables'),
		usesContext: ['remote-data-blocks/remoteData'],
		fields: [
			{
				label: __('Column Sum', 'prc-block-tables'),
				type: 'string',
				args: { column: '' },
			},
		],
		getValues({ context, bindings }) {
			const values = {};

			for (const [attributeName, binding] of Object.entries(
				bindings ?? {}
			)) {
				const column = binding?.args?.column;

				if (!column) {
					values[attributeName] = '0';
					continue;
				}

				const remoteDataContext =
					context?.['remote-data-blocks/remoteData'] || {};
				const { results } = remoteDataContext;

				if (!results || !Array.isArray(results)) {
					values[attributeName] = '0';
					continue;
				}

				values[attributeName] = calculateColumnSum(
					results,
					column
				).toString();
			}

			return values;
		},
		canUserEditValue() {
			return false;
		},
	});
}

/**
 * Calculate the sum of raw values for a specified column.
 * Mirrors the server-side calculation logic.
 *
 * @param {Array}  results     The remote data results array.
 * @param {string} columnName  The column name to sum.
 * @return {number}            The sum of raw values for the column.
 */
function calculateColumnSum(results, columnName) {
	let sum = 0;

	for (const result of results) {
		if (!result?.result || typeof result.result !== 'object') {
			continue;
		}

		const rowData = result.result;
		if (!(columnName in rowData)) {
			continue;
		}

		const rawValue = rowData[columnName];

		// Extract the numeric value from the raw_value structure
		const value =
			Array.isArray(rawValue) ||
			(typeof rawValue === 'object' &&
				rawValue !== null &&
				'value' in rawValue)
				? rawValue.value
				: rawValue;

		// Only sum numeric values
		if (
			typeof value === 'number' ||
			(typeof value === 'string' && !isNaN(parseFloat(value)))
		) {
			sum += parseFloat(value);
		}
	}

	return sum;
}
