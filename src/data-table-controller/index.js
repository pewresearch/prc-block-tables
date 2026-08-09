/**
 * Data Table Controller — editor registration.
 */
import { registerBlockType } from '@wordpress/blocks';

import './style.scss';
import './editor.scss';
import edit from './edit';
import save from './save';
import icon from './icon';
import metadata from './block.json';

registerBlockType(metadata.name, {
	...metadata,
	edit,
	save,
	icon,
});
