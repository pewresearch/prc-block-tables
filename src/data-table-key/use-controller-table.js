/**
 * WordPress Dependencies
 */
import { store as blockEditorStore } from '@wordpress/block-editor';
import { useSelect } from '@wordpress/data';
import { useEffect, useMemo, useState } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';

/**
 * Internal Dependencies
 */
import { resolveTableData } from './edit-utils';

const EMPTY_PARENT = {
	jsonTable: null,
	csvTable: null,
	defaultJsonSheet: '',
	firebasePath: '',
	pivotEnabled: false,
	pivotIndexColumn: '',
	pivotColumnField: '',
	pivotColumns: [],
	pivotValueFields: [],
	pivotExtraColumns: [],
};

/**
 * Read data-table-controller attributes from an ancestor block.
 *
 * @param {string} clientId Key block client id.
 * @return {typeof EMPTY_PARENT} Parent controller table attributes.
 */
function useParentControllerTable(clientId) {
	return useSelect(
		(select) => {
			const { getBlockParents, getBlock } = select(blockEditorStore);
			const parents = getBlockParents(clientId);
			for (const parentId of parents) {
				const parentBlock = getBlock(parentId);
				if (parentBlock?.name === 'prc-block/data-table-controller') {
					const attrs = parentBlock.attributes || {};
					return {
						jsonTable: attrs.jsonTable,
						csvTable: attrs.csvTable,
						defaultJsonSheet: attrs.defaultJsonSheet || '',
						firebasePath: attrs.firebasePath || '',
						pivotEnabled: !!attrs.pivotEnabled,
						pivotIndexColumn: attrs.pivotIndexColumn || '',
						pivotColumnField: attrs.pivotColumnField || '',
						pivotColumns: attrs.pivotColumns || [],
						pivotValueFields: attrs.pivotValueFields || [],
						pivotExtraColumns: attrs.pivotExtraColumns || [],
					};
				}
			}
			return EMPTY_PARENT;
		},
		[clientId]
	);
}

/**
 * Resolve the controller’s effective columns/rows for the key block editor.
 *
 * @param {Object}  params
 * @param {string}  params.clientId        Key block client id.
 * @param {string}  params.dataSource      Active data source from context.
 * @param {unknown} params.providerContext Provider block context data.
 * @return {{ columns: string[], rows: Record<string, unknown>[], parentTable: typeof EMPTY_PARENT }} Effective table and parent controller attrs.
 */
export function useControllerTableData({
	clientId,
	dataSource,
	providerContext,
}) {
	const parentTable = useParentControllerTable(clientId);
	const [firebaseData, setFirebaseData] = useState(null);

	useEffect(() => {
		if (dataSource !== 'firebase') {
			setFirebaseData(null);
			return undefined;
		}

		const path =
			typeof parentTable.firebasePath === 'string'
				? parentTable.firebasePath.trim()
				: '';
		if (!path) {
			setFirebaseData(null);
			return undefined;
		}

		let cancelled = false;
		const timer = setTimeout(() => {
			apiFetch({
				path: `/prc-api/v3/data-table/firebase-data?path=${encodeURIComponent(path)}`,
			})
				.then((data) => {
					if (!cancelled) {
						setFirebaseData(data);
					}
				})
				.catch(() => {
					if (!cancelled) {
						setFirebaseData(null);
					}
				});
		}, 400);

		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	}, [dataSource, parentTable.firebasePath]);

	const contextData =
		dataSource === 'firebase' ? firebaseData : providerContext;

	const tableData = useMemo(
		() =>
			resolveTableData({
				dataSource,
				jsonTable: parentTable.jsonTable,
				csvTable: parentTable.csvTable,
				defaultJsonSheet: parentTable.defaultJsonSheet,
				contextData,
				pivotEnabled: parentTable.pivotEnabled,
				pivotIndexColumn: parentTable.pivotIndexColumn,
				pivotColumnField: parentTable.pivotColumnField,
				pivotColumns: parentTable.pivotColumns,
				pivotValueFields: parentTable.pivotValueFields,
				pivotExtraColumns: parentTable.pivotExtraColumns,
			}),
		[dataSource, parentTable, contextData]
	);

	return {
		...tableData,
		parentTable,
	};
}
