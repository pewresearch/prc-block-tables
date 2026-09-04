/**
 * Keep user sort when the active sheet still has the sorted column.
 * Clear sort only when that column is missing on the new sheet.
 *
 * @param {Object|null|undefined} table Table state slice.
 */
export function syncSortColumnToActiveSheet(table) {
	if (!table?.sortColumn) {
		return;
	}

	const columns = table.sheets?.[table.activeSheet]?.columns;
	if (Array.isArray(columns) && columns.includes(table.sortColumn)) {
		return;
	}

	table.sortColumn = null;
	table.sortDirection = 'asc';
}
