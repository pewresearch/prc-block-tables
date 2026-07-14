/**
 * External Dependencies
 */
import type { Properties } from 'csstype';

export const HOVER_BACKGROUND_COLOR_PROPERTY = '--hover-background-color';

/**
 * Cell styles may carry the `--hover-background-color` custom property
 * consumed by `th, td:hover { background-color: var(--hover-background-color) }`.
 */
export type CellStyles = Properties & {
	[HOVER_BACKGROUND_COLOR_PROPERTY]?: string;
	hoverBackgroundColor?: string;
};

/**
 * Normalize the hover background color onto the `--hover-background-color`
 * custom property.
 *
 * Older content stored the value as a literal `hover-background-color`
 * property (parsed back as `hoverBackgroundColor`), which browsers ignore and
 * KSES strips. The custom property is what the block stylesheet consumes on
 * both the editor and the front end. When both forms are present the explicit
 * custom property wins.
 *
 * @param styles Parsed cell styles object.
 * @return New styles object with the hover color recast, or the same object
 *         when there is nothing to normalize.
 */
export function recastHoverBackgroundColor(styles: CellStyles): CellStyles {
	const { hoverBackgroundColor, ...rest } = styles;

	if (hoverBackgroundColor === undefined) {
		return styles;
	}

	const newStyles: CellStyles = { ...rest };
	if (newStyles[HOVER_BACKGROUND_COLOR_PROPERTY] === undefined) {
		newStyles[HOVER_BACKGROUND_COLOR_PROPERTY] = hoverBackgroundColor;
	}
	return newStyles;
}
