import { registerBlockType } from '@wordpress/blocks';

import './style.scss';
import './editor.scss';
import edit from './edit';
import icon from './icon';
import metadata from './block.json';

registerBlockType(metadata.name, {
	...metadata,
	edit,
	save: () => null,
	icon,
});
