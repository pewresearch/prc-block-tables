/**
 * Internal dependencies
 */
import {
	HOVER_BACKGROUND_COLOR_PROPERTY,
	recastHoverBackgroundColor,
} from '../hover-background-color';

describe('hover-background-color', () => {
	describe('recastHoverBackgroundColor', () => {
		it('should recast the legacy hoverBackgroundColor key to the custom property', () => {
			expect(
				recastHoverBackgroundColor({
					hoverBackgroundColor: 'red',
					backgroundColor: 'blue',
				})
			).toStrictEqual({
				[HOVER_BACKGROUND_COLOR_PROPERTY]: 'red',
				backgroundColor: 'blue',
			});
		});

		it('should prefer an explicit custom property over the legacy key', () => {
			expect(
				recastHoverBackgroundColor({
					hoverBackgroundColor: 'red',
					[HOVER_BACKGROUND_COLOR_PROPERTY]: 'green',
				})
			).toStrictEqual({
				[HOVER_BACKGROUND_COLOR_PROPERTY]: 'green',
			});
		});

		it('should return styles unchanged when no hover color is present', () => {
			const styles = { backgroundColor: 'blue' };
			expect(recastHoverBackgroundColor(styles)).toBe(styles);
		});

		it('should pass an existing custom property through unchanged', () => {
			const styles = {
				[HOVER_BACKGROUND_COLOR_PROPERTY]: 'green',
				color: 'black',
			};
			expect(recastHoverBackgroundColor(styles)).toBe(styles);
		});
	});
});
