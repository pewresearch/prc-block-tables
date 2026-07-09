/**
 * External Dependencies
 */
import clsx from 'clsx';

/**
 * WordPress Dependencies
 */
import { useCallback, useEffect, useRef } from '@wordpress/element';
import {
	useBlockProps,
	InnerBlocks,
	useInnerBlocksProps,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { useSelect, useDispatch } from '@wordpress/data';
import { __, sprintf } from '@wordpress/i18n';

/**
 * Internal Dependencies
 */
import './editor.scss';

const TEMPLATE = [['prc-block/table', { className: 'spreadsheet-sheet' }]];
const DEFAULT_BLOCK = { name: 'prc-block/table', attributes: {} };

function resolveSheetLabel(sheet, index) {
	const name = sheet?.attributes?.metadata?.name;
	if (typeof name === 'string' && name.trim()) {
		return name.trim();
	}
	return sprintf(
		// translators: %d is the 1-based sheet number.
		__('Sheet %d', 'prc-block-tables'),
		index + 1
	);
}

export default function Edit({ attributes, setAttributes, clientId }) {
	const { activeSheetIndex = 0 } = attributes;
	const { selectBlock, __unstableMarkNextChangeAsNotPersistent } =
		useDispatch(blockEditorStore);

	const sheets = useSelect(
		(select) => select(blockEditorStore).getBlocks(clientId),
		[clientId]
	);

	const selectedSheetIndex = useSelect(
		(select) => {
			const { getSelectedBlockClientId, getBlockParents } =
				select(blockEditorStore);
			const selectedId = getSelectedBlockClientId();
			if (!selectedId) {
				return null;
			}

			const sheetIds = new Set(sheets.map((sheet) => sheet.clientId));
			if (sheetIds.has(selectedId)) {
				return sheets.findIndex(
					(sheet) => sheet.clientId === selectedId
				);
			}

			const sheetParent = getBlockParents(selectedId).find((parentId) =>
				sheetIds.has(parentId)
			);
			if (sheetParent) {
				return sheets.findIndex(
					(sheet) => sheet.clientId === sheetParent
				);
			}

			return null;
		},
		[sheets]
	);

	const prevSelectedSheetIndexRef = useRef(selectedSheetIndex);

	const sheetCount = sheets.length;
	const activeIndex = Math.min(
		Math.max(activeSheetIndex ?? 0, 0),
		Math.max(sheetCount - 1, 0)
	);

	const setActiveSheet = useCallback(
		(index) => {
			setAttributes({ activeSheetIndex: index });
			if (sheets[index]) {
				selectBlock(sheets[index].clientId);
			}
		},
		[setAttributes, selectBlock, sheets]
	);

	// Follow list-view / canvas selection so the visible sheet matches the
	// selected inner table. Ref guard avoids reverting during tab clicks.
	useEffect(() => {
		const prevSelected = prevSelectedSheetIndexRef.current;
		prevSelectedSheetIndexRef.current = selectedSheetIndex;

		if (selectedSheetIndex === null || selectedSheetIndex < 0) {
			return;
		}
		if (selectedSheetIndex === prevSelected) {
			return;
		}
		if (selectedSheetIndex !== activeIndex) {
			__unstableMarkNextChangeAsNotPersistent();
			setAttributes({ activeSheetIndex: selectedSheetIndex });
		}
	}, [
		selectedSheetIndex,
		activeIndex,
		setAttributes,
		__unstableMarkNextChangeAsNotPersistent,
	]);

	const blockProps = useBlockProps();

	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'wp-block-prc-block-power-spreadsheet__panels' },
		{
			template: TEMPLATE,
			templateLock: false,
			renderAppender: false,
			orientation: 'vertical',
			directInsert: true,
			defaultBlock: DEFAULT_BLOCK,
		}
	);

	// Scoped editor visibility: show only the active sheet panel. Avoids adding a
	// wrapper child block (PRC-18 requires prc-block/table as the only inner block).
	const visibilityStyle = `#block-${clientId} .wp-block-prc-block-power-spreadsheet__panels > * { display: none; } #block-${clientId} .wp-block-prc-block-power-spreadsheet__panels > *:nth-child(${
		activeIndex + 1
	}) { display: block; }`;

	return (
		<div {...blockProps}>
			{/* eslint-disable-next-line react/no-danger */}
			<style>{visibilityStyle}</style>
			<div {...innerBlocksProps} />
			<div className="wp-block-prc-block-power-spreadsheet__tabs">
				<div
					className="wp-block-prc-block-power-spreadsheet__tab-list"
					role="tablist"
				>
					{sheets.map((sheet, index) => (
						<div
							key={sheet.clientId}
							role="tab"
							tabIndex={0}
							aria-selected={index === activeIndex}
							className={clsx(
								'wp-block-prc-block-power-spreadsheet__tab',
								{ 'is-active': index === activeIndex }
							)}
							onMouseDown={(event) => {
								event.preventDefault();
								setActiveSheet(index);
							}}
							onKeyDown={(event) => {
								if (
									event.key === 'Enter' ||
									event.key === ' '
								) {
									event.preventDefault();
									setActiveSheet(index);
								}
							}}
						>
							<span>{resolveSheetLabel(sheet, index)}</span>
						</div>
					))}
				</div>
				<div className="wp-block-prc-block-power-spreadsheet__appender">
					<InnerBlocks.ButtonBlockAppender rootClientId={clientId} />
				</div>
			</div>
		</div>
	);
}
