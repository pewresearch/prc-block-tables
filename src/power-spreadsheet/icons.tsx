/**
 * WordPress Dependencies
 */
import { Path, SVG } from '@wordpress/components';

export const blockIcon = (
	<SVG
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		style={{ fill: 'none' }}
		stroke="currentColor"
		strokeWidth={1.5}
	>
		<Path
			d="M8.5 6.5h9a1.5 1.5 0 0 1 1.5 1.5v9"
			vectorEffect="non-scaling-stroke"
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
		<Path
			d="M6 8.5h9a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5V10A1.5 1.5 0 0 1 6 8.5Z"
			vectorEffect="non-scaling-stroke"
			strokeLinejoin="round"
		/>
		<Path
			d="M4.5 12.5h12M10 8.5v11"
			vectorEffect="non-scaling-stroke"
			strokeLinecap="round"
		/>
		<Path
			d="M6 8.5h4V12.5H4.5V10A1.5 1.5 0 0 1 6 8.5Z"
			fill="currentColor"
			stroke="none"
		/>
	</SVG>
);
