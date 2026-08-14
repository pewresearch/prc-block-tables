/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps } from '@wordpress/block-editor';
import { useMemo } from '@wordpress/element';

const VALID_TEXT_ALIGNS = new Set(['left', 'center', 'right']);

/**
 * @param {Object} props         Props.
 * @param {Object} props.context Block context from parent controller.
 */
export default function Edit({ context }) {
	const blockProps = useBlockProps();
	const rawColumns = context['prc-block/dataTableColumns'];
	const rawColumnOrder = context['prc-block/dataTableColumnOrder'];
	const hiddenColumns = context['prc-block/dataTableHiddenColumns'];
	const hiddenColumnHeaders =
		context['prc-block/dataTableHiddenColumnHeaders'];
	const tableTextAlign = context['prc-block/dataTableTextAlign'];
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

	const hiddenHeaderSet = useMemo(
		() =>
			new Set(
				Array.isArray(hiddenColumnHeaders) ? hiddenColumnHeaders : []
			),
		[hiddenColumnHeaders]
	);

	const resolvedTextAlign = VALID_TEXT_ALIGNS.has(tableTextAlign)
		? tableTextAlign
		: 'center';

	const tableStyle = useMemo(
		() => ({
			'--prc-data-table-cell-text-align': resolvedTextAlign,
		}),
		[resolvedTextAlign]
	);

	const showDynamicHeaders = effectiveOrder.length > 0;

	const getHeaderClassName = (col, index) => {
		const classes = [];
		if (index === 0) {
			classes.push('prc-data-table__first-col');
		}
		if (enableHeaderSpecialBorders) {
			const color = headerSpecialBorderColors?.[col];
			if (color) {
				classes.push('prc-data-table__header-special-border');
			}
		}
		return classes.length > 0 ? classes.join(' ') : undefined;
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

	const getCellClassName = (index) =>
		index === 0 ? 'prc-data-table__first-col' : undefined;

	const renderHeaderLabel = (col) => {
		if (hiddenHeaderSet.has(col)) {
			return <span className="prc-data-table__sr-only">{col}</span>;
		}
		return col;
	};

	return (
		<div {...blockProps}>
			<div
				className="prc-data-table-render-placeholder"
				aria-hidden="true"
			>
				<table
					className="prc-data-table prc-data-table--editor-preview"
					style={tableStyle}
				>
					<thead>
						<tr>
							{showDynamicHeaders ? (
								effectiveOrder.map((col, index) => (
									<th
										scope="col"
										key={col}
										className={getHeaderClassName(
											col,
											index
										)}
										style={getHeaderStyle(col)}
									>
										{renderHeaderLabel(col)}
									</th>
								))
							) : (
								<>
									<th
										scope="col"
										className="prc-data-table__first-col"
									>
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
								effectiveOrder.map((col, index) => (
									<td
										key={col}
										className={getCellClassName(index)}
									>
										…
									</td>
								))
							) : (
								<>
									<td className="prc-data-table__first-col">
										…
									</td>
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
