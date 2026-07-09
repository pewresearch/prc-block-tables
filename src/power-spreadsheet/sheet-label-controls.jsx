/**
 * WordPress Dependencies
 */
import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import {
	InspectorControls,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { __, sprintf } from '@wordpress/i18n';

const TABLE_BLOCK_NAME = 'prc-block/table';
const SPREADSHEET_BLOCK_NAME = 'prc-block/power-spreadsheet';

function SheetLabelControls({ attributes, setAttributes, clientId }) {
	const sheetIndex = useSelect(
		(select) => select(blockEditorStore).getBlockIndex(clientId),
		[clientId]
	);

	const sheetLabel = attributes.metadata?.name ?? '';

	return (
		<InspectorControls>
			<PanelBody
				title={__('Spreadsheet', 'prc-block-tables')}
				initialOpen
			>
				<TextControl
					label={__('Sheet label', 'prc-block-tables')}
					value={sheetLabel}
					placeholder={sprintf(
						// translators: %d is the 1-based sheet number.
						__('Sheet %d', 'prc-block-tables'),
						sheetIndex + 1
					)}
					onChange={(name) =>
						setAttributes({
							metadata: {
								...(attributes.metadata || {}),
								name,
							},
						})
					}
				/>
			</PanelBody>
		</InspectorControls>
	);
}

/**
 * Registers an editor.BlockEdit filter that surfaces a Sheet label control on
 * prc-block/table blocks nested inside prc-block/power-spreadsheet.
 */
export default function registerSpreadsheetSheetLabelControls() {
	addFilter(
		'editor.BlockEdit',
		'prc-block-tables/spreadsheet-sheet-label-controls',
		createHigherOrderComponent(
			(BlockEdit) =>
				function SpreadsheetSheetLabelControls(props) {
					const isInsideSpreadsheet = useSelect(
						(select) => {
							if (TABLE_BLOCK_NAME !== props.name) {
								return false;
							}
							const { getBlockParentsByBlockName } =
								select(blockEditorStore);
							return (
								getBlockParentsByBlockName(
									props.clientId,
									SPREADSHEET_BLOCK_NAME
								).length > 0
							);
						},
						[props.clientId, props.name]
					);

					if (
						TABLE_BLOCK_NAME !== props.name ||
						!isInsideSpreadsheet
					) {
						return <BlockEdit {...props} />;
					}

					return (
						<>
							<SheetLabelControls {...props} />
							<BlockEdit {...props} />
						</>
					);
				},
			'withSpreadsheetSheetLabelControls'
		)
	);
}
