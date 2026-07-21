/**
 * External Dependencies
 */
import clsx from 'clsx';
import type { FormEvent } from 'react';

/**
 * WordPress Dependencies
 */
import { __, sprintf } from '@wordpress/i18n';
import { useState, createInterpolateElement, useRef } from '@wordpress/element';
import { BlockIcon } from '@wordpress/block-editor';
import { useDispatch } from '@wordpress/data';
import { store as noticesStore } from '@wordpress/notices';
import {
	Button,
	DropZone,
	Placeholder,
	TextControl,
	ToggleControl,
	__experimentalHStack as HStack,
	__experimentalVStack as VStack,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalSpacer as Spacer,
	__experimentalText as Text,
} from '@wordpress/components';
import { isAppleOS } from '@wordpress/keycodes';

/**
 * Internal Dependencies
 */
import {
	DEFAULT_PREVIEW_ROWS,
	DEFAULT_PREVIEW_COLUMNS,
	MIN_PREVIEW_TABLE_HEIGHT,
	MAX_PREVIEW_TABLE_COL,
	MAX_TABLE_CELLS,
	THRESHOLD_PREVIEW_TABLE_COL,
	THRESHOLD_PREVIEW_TABLE_ROW,
} from '../constants';
import {
	createTable,
	toTableAttributes,
	type VTable,
} from '../utils/table-state';
import { getMaximumTableRows } from '../utils/table-limits';
import { handleCSV } from '../csv-parser';
import { blockIcon as icon } from '../icons';
import type { BlockAttributes } from '../block-attributes';

type Props = {
	setAttributes: (attrs: Partial<BlockAttributes>) => void;
};

/* eslint-disable max-lines-per-function */
export default function TablePlaceholder({ setAttributes }: Props) {
	const [rowCount, setRowCount] = useState<number | undefined>(
		DEFAULT_PREVIEW_ROWS
	);
	const [colCount, setColCount] = useState<number | undefined>(
		DEFAULT_PREVIEW_COLUMNS
	);
	const [headerSection, setHeaderSection] = useState<boolean>(false);
	const [footerSection, setFooterSection] = useState<boolean>(false);

	const csvFileInputRef = useRef<HTMLInputElement>(null);
	const { createErrorNotice } = useDispatch(noticesStore);
	const maximumBodyRows = colCount
		? Math.max(
				1,
				getMaximumTableRows(colCount) -
					Number(headerSection) -
					Number(footerSection)
			)
		: 1;

	const totalRowCount: number | undefined = rowCount
		? rowCount + Number(headerSection) + Number(footerSection)
		: undefined;
	const cellHeight: number | undefined = totalRowCount
		? Number(
				MIN_PREVIEW_TABLE_HEIGHT /
					Math.min(THRESHOLD_PREVIEW_TABLE_ROW, totalRowCount)
			)
		: undefined;

	const onCreateTable = (event: FormEvent) => {
		event.preventDefault();

		if (!rowCount || !colCount) {
			return;
		}

		const vTable: VTable = createTable({
			rowCount: Math.min(rowCount, maximumBodyRows),
			colCount: Math.min(colCount, MAX_PREVIEW_TABLE_COL),
			headerSection,
			footerSection,
		});

		setAttributes(toTableAttributes(vTable));
	};

	const onChangeColumnCount = (value: string) => {
		const parsedValue = parseInt(value, 10);
		if (isNaN(parsedValue)) {
			setColCount(undefined);
		} else {
			const nextColumnCount = Math.max(
				1,
				Math.min(MAX_PREVIEW_TABLE_COL, parsedValue)
			);
			const nextMaximumBodyRows = Math.max(
				1,
				getMaximumTableRows(nextColumnCount) -
					Number(headerSection) -
					Number(footerSection)
			);
			setColCount(nextColumnCount);
			setRowCount((current) =>
				current ? Math.min(current, nextMaximumBodyRows) : current
			);
		}
	};

	const onChangeRowCount = (value: string) => {
		const parsedValue = parseInt(value);
		if (isNaN(parsedValue)) {
			setRowCount(undefined);
		} else {
			setRowCount(Math.max(1, Math.min(maximumBodyRows, parsedValue)));
		}
	};

	const onToggleHeaderSection = (section: boolean) => {
		setHeaderSection(section);
		const nextMaximumBodyRows = colCount
			? getMaximumTableRows(colCount) -
				Number(section) -
				Number(footerSection)
			: 1;
		setRowCount((current) =>
			current ? Math.min(current, nextMaximumBodyRows) : current
		);
	};

	const onToggleFooterSection = (section: boolean) => {
		setFooterSection(section);
		const nextMaximumBodyRows = colCount
			? getMaximumTableRows(colCount) -
				Number(headerSection) -
				Number(section)
			: 1;
		setRowCount((current) =>
			current ? Math.min(current, nextMaximumBodyRows) : current
		);
	};

	const tableClasses: string = clsx('ftb-placeholder__table', {
		'is-overflow-row':
			totalRowCount && totalRowCount > THRESHOLD_PREVIEW_TABLE_ROW,
		'is-overflow-col': colCount && colCount > THRESHOLD_PREVIEW_TABLE_COL,
	});

	return (
		<Placeholder
			label={__('Power Table', 'prc-block')}
			className="ftb-placeholder"
			icon={<BlockIcon icon={icon} showColors />}
			style={{ position: 'relative' }}
		>
			<DropZone
				label={__('Drop CSV to import', 'prc-block')}
				onFilesDrop={(files) =>
					handleCSV(
						files,
						{} as BlockAttributes,
						setAttributes,
						(message: string) => {
							// @ts-ignore
							createErrorNotice(message, {
								type: 'snackbar',
							});
						}
					)
				}
			/>
			<div className="components-placeholder__instructions">
				{createInterpolateElement(
					isAppleOS()
						? __(
								'Hint: Hold <code>Command</code> key to select multiple cells. Hold <code>Shift</code> key to select the range.',
								'prc-block'
							)
						: __(
								'Hint: Hold <code>Ctrl</code> key to select multiple cells. Hold <code>Shift</code> key to select the range.',
								'prc-block'
							),
					{ code: <code /> }
				)}
			</div>
			<Spacer
				as={VStack}
				className="ftb-placeholder__table-wrap"
				style={{ minHeight: MIN_PREVIEW_TABLE_HEIGHT }}
				alignment="center"
				padding={4}
				marginBottom={0}
			>
				<Text align="center" isBlock weight="500">
					{__('Preview', 'prc-block')}
				</Text>
				{rowCount && colCount && (
					<table className={tableClasses}>
						{headerSection && (
							<thead>
								<tr>
									{Array.from({
										length: Math.min(
											colCount,
											THRESHOLD_PREVIEW_TABLE_COL
										),
									}).map((_col, colIndex) => (
										<th
											key={colIndex}
											style={{ height: cellHeight }}
										/>
									))}
								</tr>
							</thead>
						)}
						<tbody>
							{Array.from({
								length: Math.min(
									rowCount,
									THRESHOLD_PREVIEW_TABLE_ROW
								),
							}).map((_row, rowIndex) => (
								<tr key={rowIndex}>
									{Array.from({
										length: Math.min(
											colCount,
											THRESHOLD_PREVIEW_TABLE_COL
										),
									}).map((_col, colIndex) => (
										<td
											key={colIndex}
											style={{ height: cellHeight }}
										/>
									))}
								</tr>
							))}
						</tbody>
						{footerSection && (
							<tfoot>
								<tr>
									{Array.from({
										length: Math.min(
											colCount,
											THRESHOLD_PREVIEW_TABLE_COL
										),
									}).map((_col, colIndex) => (
										<td
											key={colIndex}
											style={{ height: cellHeight }}
										/>
									))}
								</tr>
							</tfoot>
						)}
					</table>
				)}
			</Spacer>
			<VStack as="form" onSubmit={onCreateTable}>
				<HStack wrap justify="start">
					<ToggleControl
						label={__('Header section', 'prc-block')}
						checked={!!headerSection}
						onChange={onToggleHeaderSection}
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={__('Footer section', 'prc-block')}
						checked={!!footerSection}
						onChange={onToggleFooterSection}
						__nextHasNoMarginBottom
					/>
				</HStack>
				<HStack
					alignment="end"
					justify="start"
					className="ftb-placeholder__controls"
				>
					<TextControl
						label={__('Column count', 'prc-block')}
						className="ftb-placeholder__input"
						type="number"
						min="1"
						max={MAX_PREVIEW_TABLE_COL}
						value={colCount || ''}
						onChange={onChangeColumnCount}
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={__('Row count', 'prc-block')}
						className="ftb-placeholder__input"
						type="number"
						min="1"
						max={maximumBodyRows}
						value={rowCount || ''}
						onChange={onChangeRowCount}
						__nextHasNoMarginBottom
					/>
					<Button
						variant="primary"
						type="submit"
						disabled={!rowCount || !colCount}
					>
						{__('Create Table', 'prc-block')}
					</Button>
					<Button
						variant="secondary"
						type="button"
						onClick={() => csvFileInputRef.current?.click()}
					>
						{__('Import CSV', 'prc-block')}
					</Button>
					<input
						ref={csvFileInputRef}
						type="file"
						accept="text/csv"
						onChange={(e) => {
							if (e.target.files) {
								handleCSV(
									e.target.files,
									{} as BlockAttributes,
									setAttributes,
									(message: string) => {
										// @ts-ignore
										createErrorNotice(message, {
											type: 'snackbar',
										});
									}
								);
							}
						}}
						style={{ display: 'none' }}
					/>
				</HStack>
				<Text variant="muted" size="12px">
					{sprintf(
						/* translators: 1: maximum body rows, 2: maximum total cells */
						__(
							'Up to %1$d body rows for this configuration (%2$s-cell limit).',
							'prc-block'
						),
						maximumBodyRows,
						MAX_TABLE_CELLS.toLocaleString()
					)}
				</Text>
			</VStack>
		</Placeholder>
	);
}
