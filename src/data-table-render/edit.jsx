/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps } from '@wordpress/block-editor';
import { useMemo } from '@wordpress/element';

/**
 * @param {Object} props         Props.
 * @param {Object} props.context Block context from parent controller.
 */
export default function Edit({ context }) {
	const blockProps = useBlockProps();
	const rawColumns = context['prc-block/dataTableColumns'];
	const rawColumnOrder = context['prc-block/dataTableColumnOrder'];
	const hiddenColumns = context['prc-block/dataTableHiddenColumns'];
	const enableHeaderSpecialBorders =
		context['prc-block/dataTableEnableHeaderSpecialBorders'] ?? false;
	const headerSpecialBorderColors =
		context['prc-block/dataTableHeaderSpecialBorderColors'] ?? {};

	const effectiveOrder = useMemo(() => {
		const cols = Array.isArray(rawColumns) ? rawColumns : [];
		const hidden = Array.isArray(hiddenColumns) ? hiddenColumns : [];
		const visible = cols.filter((c) => !hidden.includes(c));
		const saved = Array.isArray(rawColumnOrder) ? rawColumnOrder : [];
		const ordered = saved.filter((c) => visible.includes(c));
		const tail = visible.filter((c) => !ordered.includes(c));
		return [...ordered, ...tail];
	}, [rawColumns, rawColumnOrder, hiddenColumns]);

	const showDynamicHeaders = effectiveOrder.length > 0;

	const getHeaderClassName = (col) => {
		if (!enableHeaderSpecialBorders) {
			return undefined;
		}
		const color = headerSpecialBorderColors?.[col];
		return color ? 'prc-data-table__header-special-border' : undefined;
	};

	const getHeaderStyle = (col) => {
		if (!enableHeaderSpecialBorders) {
			return undefined;
		}
		const color = headerSpecialBorderColors?.[col];
		return color
			? { '--prc-data-table-header-border-color': color }
			: undefined;
	};

	return (
		<div {...blockProps}>
			<div
				className="prc-data-table-render-placeholder"
				aria-hidden="true"
			>
				<table className="prc-data-table prc-data-table--editor-preview">
					<thead>
						<tr>
							{showDynamicHeaders ? (
								effectiveOrder.map((col) => (
									<th
										scope="col"
										key={col}
										className={getHeaderClassName(col)}
										style={getHeaderStyle(col)}
									>
										{col}
									</th>
								))
							) : (
								<>
									<th scope="col">
										{__('Column A', 'data-table-render')}
									</th>
									<th scope="col">
										{__('Column B', 'data-table-render')}
									</th>
								</>
							)}
						</tr>
					</thead>
					<tbody>
						<tr>
							{showDynamicHeaders ? (
								effectiveOrder.map((col) => (
									<td key={col}>…</td>
								))
							) : (
								<>
									<td>…</td>
									<td>…</td>
								</>
							)}
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	);
}
