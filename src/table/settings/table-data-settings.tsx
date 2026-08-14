/**
 * External Dependencies
 */

/**
 * WordPress Dependencies
 */
import { __, sprintf } from '@wordpress/i18n';
import {
	PanelRow,
	Button,
	DropZone,
	TextControl,
	Flex,
	FlexItem,
	Notice,
} from '@wordpress/components';
import { useDispatch } from '@wordpress/data';
import { useEffect, useRef, useState } from '@wordpress/element';
import { store as noticesStore } from '@wordpress/notices';
/**
 * Internal Dependencies
 */
import { handleCSV, exportCSV } from '../csv-parser';
import {
	getColumnCount,
	insertRows,
	toTableAttributes,
	type VTable,
	type VSelectedCells,
} from '../utils/table-state';
import {
	getMaximumTableRows,
	getRemainingTableRows,
} from '../utils/table-limits';
import { MAX_TABLE_CELLS } from '../constants';
import type { BlockAttributes } from '../block-attributes';
import type { ValidationSchema } from '../utils/validation';

declare global {
	interface Window {
		prcTableValidationSchemas?: ValidationSchema[];
	}
}

// Guidance for the active validation schema, shown alongside the import/export
// controls. Schemas (e.g. chart-builder's geo maps) carry an optional
// description and reference links so the data-shape requirements live right
// where producers import their CSV.
function SchemaGuidance({ schemaSlug }: { schemaSlug?: string }) {
	if (!schemaSlug) {
		return null;
	}
	const schema = (window.prcTableValidationSchemas ?? []).find(
		(s) => s.slug === schemaSlug
	);
	if (!schema?.description) {
		return null;
	}
	return (
		<Notice status="info" isDismissible={false}>
			<p style={{ margin: 0 }}>{schema.description}</p>
			{schema.references && schema.references.length > 0 && (
				<ul style={{ margin: '8px 0 0' }}>
					{schema.references.map((ref) => (
						<li key={ref.url}>
							<a href={ref.url} target="_blank" rel="noreferrer">
								{ref.label}
							</a>
						</li>
					))}
				</ul>
			)}
		</Notice>
	);
}

type TableDataSettingsProps = {
	attributes: BlockAttributes;
	setAttributes: (attrs: Partial<BlockAttributes>) => void;
	vTable: VTable;
	selectedCells: VSelectedCells;
};

type DropzoneProps = {
	attributes: BlockAttributes;
	setAttributes: (attrs: Partial<BlockAttributes>) => void;
};

export function TableDataDropzone({
	attributes,
	setAttributes,
}: DropzoneProps) {
	const { createErrorNotice } = useDispatch(noticesStore);

	return (
		<DropZone
			label="Drop a CSV file here to replace this table's data."
			onFilesDrop={(droppedFiles) =>
				handleCSV(
					droppedFiles,
					attributes,
					setAttributes,
					(message: string) => {
						// @ts-ignore
						createErrorNotice(message, { type: 'snackbar' });
					}
				)
			}
		/>
	);
}

/* eslint-disable max-lines-per-function */
export default function TableDataSettings({
	attributes,
	setAttributes,
	vTable,
}: TableDataSettingsProps) {
	// Create a hidden file input element.
	const hiddenFileInput = useRef<HTMLInputElement>(null);
	const { createErrorNotice } = useDispatch(noticesStore);
	const [appendRowCount, setAppendRowCount] = useState<number | undefined>(
		10
	);
	const columnCount = getColumnCount(vTable);
	const totalRowCount =
		vTable.head.length + vTable.body.length + vTable.foot.length;
	const maximumTableRows = getMaximumTableRows(columnCount);
	const remainingTableRows = getRemainingTableRows(
		totalRowCount,
		columnCount
	);

	useEffect(() => {
		setAppendRowCount((current) => {
			if (remainingTableRows < 1) {
				return undefined;
			}
			if (current === undefined) {
				return current;
			}
			return Math.min(current, remainingTableRows);
		});
	}, [remainingTableRows]);

	const canAppendRows =
		!!vTable.body?.[0]?.cells?.length &&
		typeof appendRowCount === 'number' &&
		appendRowCount >= 1 &&
		appendRowCount <= remainingTableRows;

	const onAppendRows = () => {
		if (!canAppendRows || typeof appendRowCount !== 'number') {
			return;
		}

		const count = Math.min(Math.floor(appendRowCount), remainingTableRows);

		if (count < 1) {
			return;
		}

		const newVTable = insertRows(vTable, {
			sectionName: 'body',
			rowIndex: vTable.body.length,
			count,
		});

		setAttributes(toTableAttributes(newVTable));
		const nextRemainingRows = remainingTableRows - count;
		setAppendRowCount(
			nextRemainingRows > 0 ? Math.min(10, nextRemainingRows) : undefined
		);
	};

	const onChangeAppendRowCount = (value: string) => {
		const parsedValue = parseInt(value, 10);
		if (isNaN(parsedValue)) {
			setAppendRowCount(undefined);
		} else {
			setAppendRowCount(
				Math.max(1, Math.min(remainingTableRows, parsedValue))
			);
		}
	};

	return (
		<>
			<SchemaGuidance schemaSlug={attributes.validationSchema} />
			<PanelRow>
				<Flex direction="column" gap={2} expanded>
					<FlexItem>
						<TextControl
							label={__('Rows to add', 'prc-block')}
							type="number"
							min="1"
							max={remainingTableRows}
							value={appendRowCount ?? ''}
							onChange={onChangeAppendRowCount}
							help={sprintf(
								/* translators: 1: remaining rows, 2: maximum total rows, 3: maximum total cells */
								__(
									'Append empty body rows. %1$d of %2$d total rows remain (%3$s-cell limit).',
									'prc-block'
								),
								remainingTableRows,
								maximumTableRows,
								MAX_TABLE_CELLS.toLocaleString()
							)}
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						/>
					</FlexItem>
					<FlexItem>
						<Button
							variant="secondary"
							onClick={onAppendRows}
							disabled={!canAppendRows}
							__next40pxDefaultSize
							style={{
								width: '100%',
								justifyContent: 'center',
							}}
						>
							{__('Add rows', 'prc-block')}
						</Button>
					</FlexItem>
				</Flex>
			</PanelRow>
			<PanelRow>
				<Button
					variant="secondary"
					__next40pxDefaultSize
					style={{
						width: '100%',
						justifyContent: 'center',
					}}
					onClick={() => {
						if (hiddenFileInput.current) {
							hiddenFileInput.current.click();
						}
					}}
					help={__(
						"Import a CSV file to replace this table's data.",
						'prc-block-library'
					)}
				>
					{__(`Import CSV`, 'prc-block-library')}
				</Button>
				<input
					ref={hiddenFileInput}
					type="file"
					accept="text/csv"
					onChange={(e) =>
						handleCSV(
							e.target.files,
							attributes,
							setAttributes,
							(message: string) => {
								// @ts-ignore
								createErrorNotice(message, {
									type: 'snackbar',
								});
							}
						)
					}
					style={{ display: 'none' }}
				/>
				<TableDataDropzone
					attributes={attributes}
					setAttributes={setAttributes}
				/>
			</PanelRow>
			<PanelRow>
				<Button
					variant="secondary"
					__next40pxDefaultSize
					style={{
						width: '100%',
						justifyContent: 'center',
					}}
					onClick={() => {
						const csv = exportCSV(attributes);
						const blob = new Blob([csv], {
							type: 'text/csv',
						});
						const url = URL.createObjectURL(blob);
						const a = document.createElement('a');
						a.href = url;
						a.download = 'table.csv';
						a.click();
					}}
				>
					{__('Export CSV', 'prc-block-library')}
				</Button>
			</PanelRow>
		</>
	);
}
