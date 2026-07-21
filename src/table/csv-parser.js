/**
 * External Dependencies
 */
import CSV from 'comma-separated-values';

/**
 * WordPress Dependencies
 */
import { __, sprintf } from '@wordpress/i18n';

/**
 * Internal Dependencies
 */
import { MAX_TABLE_CELLS, MAX_TABLE_ROWS } from './constants';
import { isTableWithinLimits } from './utils/table-limits';

/**
 * Utilities for managing core/table data
 */

function convertToRow(d, tag = 'td') {
	return d.map((content) => ({
		content:
			content === null || content === undefined ? '' : String(content),
		tag,
	}));
}

function convertJSONToAttributes(d, tag = 'td') {
	if ('th' === tag) {
		return convertToRow(d, tag);
	}
	return d.map((row) => ({ cells: convertToRow(row, tag) }));
}

export function parseCSV(csvInput, attributes, setAttributes) {
	const opts = {
		header: false,
	};
	const csv = new CSV(csvInput, opts);
	const parsed = csv.parse();
	const footerRows = attributes.foot ?? [];
	const rowCount = parsed.length + footerRows.length;
	const columnCount = [
		...parsed,
		...footerRows.map((row) => row.cells),
	].reduce(
		(maximum, row) =>
			Math.max(
				maximum,
				row.reduce(
					(count, cell) =>
						count +
						Number(
							typeof cell === 'object' && cell !== null
								? cell.colSpan || 1
								: 1
						),
					0
				)
			),
		0
	);

	if (!isTableWithinLimits(rowCount, columnCount)) {
		throw new Error(
			sprintf(
				/* translators: 1: maximum rows, 2: maximum cells */
				__(
					'Power Tables support up to %1$d total rows and %2$s total cells. Reduce the CSV size and try again.',
					'prc-block'
				),
				MAX_TABLE_ROWS,
				MAX_TABLE_CELLS.toLocaleString()
			)
		);
	}

	const headerData = convertJSONToAttributes(parsed.shift(), 'th');
	const bodyData = convertJSONToAttributes(parsed);
	setAttributes({ body: bodyData });
	setAttributes({ head: [{ cells: headerData }] });

	return parsed;
}

export function exportCSV(attributes) {
	const { body, head, footer } = attributes;
	// Restructure body, head, and footer to reduce their body.cells to just each cell's content
	const bodyData = body.map((row) => row.cells.map((cell) => cell.content));
	const headData = head
		? head.map((row) => row.cells.map((cell) => cell.content))
		: [];
	const footerData = footer
		? footer.map((row) => row.cells.map((cell) => cell.content))
		: [];
	const data = [...headData, ...bodyData, ...footerData];
	const csv = new CSV(data);
	return csv.encode();
}

export function handleCSV(
	files,
	attributes,
	setAttributes,
	onError = () => {}
) {
	// eslint-disable-next-line no-undef
	const reader = new FileReader();
	reader.onload = () => {
		try {
			parseCSV(reader.result, attributes, setAttributes);
		} catch (error) {
			onError(
				error instanceof Error
					? error.message
					: __('Unable to import this CSV.', 'prc-block')
			);
		}
	};
	reader.onerror = () =>
		onError(__('Unable to read this CSV file.', 'prc-block'));
	Array.from(files).forEach((file) => reader.readAsBinaryString(file));
}
