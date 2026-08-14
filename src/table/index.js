/**
 * WordPress Dependencies
 */
import { registerBlockType } from '@wordpress/blocks';

/**
 * Internal dependencies
 */
import './store';
import './style.scss';
import metadata from './block.json';
import { blockIcon as icon } from './icons';
import edit from './edit';
import save from './save';
import transforms from './transforms';
import deprecated from './deprecated';

const { name } = metadata;

const settings = {
	icon,
	edit,
	save,
	transforms,
	deprecated,
	// styles: [
	// 	{
	// 		name: 'stripes',
	// 		label: __('Stripes', 'prc-block'),
	// 	},
	// ],
};

// Register block.
registerBlockType(name, { ...metadata, ...settings });
