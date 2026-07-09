/**
 * WordPress Dependencies
 */
import { registerBlockType } from '@wordpress/blocks';

/**
 * Internal Dependencies
 */
import './style.scss';
import './data-store';
import metadata from './block.json';
import { blockIcon as icon } from './icons';
import edit from './edit';
import save from './save';
import registerSpreadsheetSheetLabelControls from './sheet-label-controls';

registerSpreadsheetSheetLabelControls();

const { name } = metadata;

registerBlockType(name, {
	...metadata,
	icon,
	edit,
	save,
});
