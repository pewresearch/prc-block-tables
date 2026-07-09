/**
 * External Dependencies
 */

/**
 * WordPress Dependencies
 */
import { __ } from '@wordpress/i18n';
import { useMemo, useState } from '@wordpress/element';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
} from '@wordpress/block-editor';
import {
	PanelBody,
	PanelRow,
	SelectControl,
	Button,
	Modal,
} from '@wordpress/components';
import { useDispatch } from '@wordpress/data';
import { createBlock } from '@wordpress/blocks';

/**
 * Internal Dependencies
 */

export default function Edit({ attributes, setAttributes, context, clientId }) {
	const { dataSource, primaryKey, selectedColumns } = attributes;
	const remoteDataContext = context?.['remote-data-blocks/remoteData'] || {};

	// State for column sum binding modal
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [selectedColumn, setSelectedColumn] = useState('');

	// Block editor dispatch for inserting blocks
	const { insertBlock } = useDispatch('core/block-editor');

	const blockProps = useBlockProps({});
	const innerBlocksProps = useInnerBlocksProps(
		{
			className: 'prc-block-remote-pivot-table__template',
		},
		{}
	);

	const columns = useMemo(() => {
		const { results } = remoteDataContext;
		if (!Array.isArray(results) || !results.length) {
			return [];
		}
		const firstResult = results[0].result;
		if (!firstResult) {
			return [];
		}
		return Object.keys(firstResult);
	}, [remoteDataContext]);

	/**
	 * Handle inserting a block with column sum binding
	 */
	const handleInsertColumnSumBlock = () => {
		if (!selectedColumn) {
			return;
		}

		// Create a new paragraph block with the binding metadata
		const newBlock = createBlock('core/paragraph', {
			content: __('Column Sum', 'prc-block-tables'),
			metadata: {
				bindings: {
					content: {
						source: 'prc-block/remote-pivot-table-sum',
						args: {
							column: selectedColumn,
						},
					},
				},
			},
		});

		// Insert the block after the current block
		insertBlock(newBlock, undefined, clientId);

		// Close modal and reset selection
		setIsModalOpen(false);
		setSelectedColumn('');
	};

	return (
		<div {...blockProps}>
			<InspectorControls>
				<PanelBody
					title={__('Remote Data: Pivot Table', 'prc-block-tables')}
				>
					<div>
						<SelectControl
							label={__('Selected Columns', 'prc-block-tables')}
							multiple={true}
							value={selectedColumns}
							onChange={(value) =>
								setAttributes({ selectedColumns: value })
							}
							options={columns.map((column) => ({
								value: column,
								label: column,
							}))}
						/>
						<SelectControl
							label={__('Data Source', 'prc-block-tables')}
							value={dataSource}
							onChange={(value) =>
								setAttributes({ dataSource: value })
							}
							options={[
								{
									value: 'column',
									label: __('Column', 'prc-block-tables'),
								},
								{
									value: 'row',
									label: __('Row', 'prc-block-tables'),
								},
							]}
						/>
						<SelectControl
							label={__('Primary Key', 'prc-block-tables')}
							value={primaryKey}
							onChange={(value) =>
								setAttributes({ primaryKey: value })
							}
							options={columns.map((column) => ({
								value: column,
								label: column,
							}))}
						/>
					</div>
				</PanelBody>
				<PanelBody
					title={__('Column Sum Block Binding', 'prc-block-tables')}
					initialOpen={false}
				>
					<PanelRow>
						<p style={{ margin: 0 }}>
							{__(
								'Create a block that displays the sum of values for a selected column.',
								'prc-block-tables'
							)}
						</p>
					</PanelRow>
					<PanelRow>
						<Button
							variant="secondary"
							onClick={() => setIsModalOpen(true)}
							disabled={columns.length === 0}
						>
							{__('Add Column Sum Block', 'prc-block-tables')}
						</Button>
					</PanelRow>
				</PanelBody>
			</InspectorControls>
			{isModalOpen && (
				<Modal
					title={__(
						'Select Column for Sum Block',
						'prc-block-tables'
					)}
					onRequestClose={() => setIsModalOpen(false)}
					className="prc-block-remote-pivot-table-column-modal"
				>
					<div style={{ padding: '16px' }}>
						<SelectControl
							label={__('Column to Sum', 'prc-block-tables')}
							value={selectedColumn}
							onChange={setSelectedColumn}
							options={[
								{
									value: '',
									label: __(
										'Select a column…',
										'prc-block-tables'
									),
								},
								...columns.map((column) => ({
									value: column,
									label: column,
								})),
							]}
						/>
						<div
							style={{
								display: 'flex',
								gap: '8px',
								marginTop: '16px',
							}}
						>
							<Button
								variant="primary"
								onClick={handleInsertColumnSumBlock}
								disabled={!selectedColumn}
							>
								{__('Insert Block', 'prc-block-tables')}
							</Button>
							<Button
								variant="secondary"
								onClick={() => setIsModalOpen(false)}
							>
								{__('Cancel', 'prc-block-tables')}
							</Button>
						</div>
					</div>
				</Modal>
			)}
			<div {...innerBlocksProps} />
		</div>
	);
}
