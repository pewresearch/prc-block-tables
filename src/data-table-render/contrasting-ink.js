export const DARK_INK = '#2a2a2a';
export const LIGHT_INK = '#d9d9d9';

const LUMINANCE_THRESHOLD = 0.179;

/**
 * Pick ink that meets WCAG AA against a CSS background.
 *
 * Theme tokens (`var(--wp--preset--color--*)`) return an empty string so CSS
 * can fall back to `ui-text-color`.
 *
 * @param {string} background Hex, rgb()/rgba(), or light-dark(light, dark).
 * @return {string} Contrasting ink, a light-dark() pair, or an empty string.
 */
export function contrastingInk(background) {
	if (typeof background !== 'string') {
		return '';
	}
	const value = background.trim();
	if (!value) {
		return '';
	}

	const pair = splitLightDark(value);
	if (pair) {
		const lightInk = inkForColor(pair[0]);
		const darkInk = inkForColor(pair[1]);
		if (!lightInk || !darkInk) {
			return '';
		}
		return `light-dark(${lightInk}, ${darkInk})`;
	}

	return inkForColor(value);
}

/**
 * Set `--prc-data-table-cell-bg` and matching `--prc-data-table-cell-fg`.
 *
 * @param {Object} selection  d3 selection with a `.style()` setter.
 * @param {string} background CSS background color.
 */
export function applyCellBackground(selection, background) {
	if (typeof background !== 'string') {
		return;
	}
	const bg = background.trim();
	if (!bg || typeof selection?.style !== 'function') {
		return;
	}
	selection.style('--prc-data-table-cell-bg', bg);
	const ink = contrastingInk(bg);
	if (ink) {
		selection.style('--prc-data-table-cell-fg', ink);
	}
}

function splitLightDark(value) {
	const lower = value.toLowerCase();
	if (!lower.startsWith('light-dark(') || !value.endsWith(')')) {
		return null;
	}
	const body = value.slice('light-dark('.length, -1);
	let depth = 0;
	for (let i = 0; i < body.length; i++) {
		const ch = body[i];
		if (ch === '(') {
			depth += 1;
		} else if (ch === ')') {
			depth -= 1;
		} else if (ch === ',' && depth === 0) {
			const light = body.slice(0, i).trim();
			const dark = body.slice(i + 1).trim();
			if (light && dark) {
				return [light, dark];
			}
			return null;
		}
	}
	return null;
}

function inkForColor(color) {
	const rgb = parseCssColor(color);
	if (!rgb) {
		return '';
	}
	return relativeLuminance(rgb) > LUMINANCE_THRESHOLD ? DARK_INK : LIGHT_INK;
}

function parseCssColor(color) {
	const trimmed = color.trim();
	if (trimmed.startsWith('#')) {
		return parseHex(trimmed);
	}
	const rgb = trimmed.match(
		/^rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)/i
	);
	if (rgb) {
		return {
			r: Number(rgb[1]),
			g: Number(rgb[2]),
			b: Number(rgb[3]),
		};
	}
	return null;
}

function parseHex(hex) {
	let digits = hex.slice(1);
	if (digits.length === 3 || digits.length === 4) {
		digits = digits
			.slice(0, 3)
			.split('')
			.map((d) => d + d)
			.join('');
	} else if (digits.length === 8) {
		digits = digits.slice(0, 6);
	}
	if (digits.length !== 6 || /[^a-fA-F0-9]/.test(digits)) {
		return null;
	}
	return {
		r: parseInt(digits.slice(0, 2), 16),
		g: parseInt(digits.slice(2, 4), 16),
		b: parseInt(digits.slice(4, 6), 16),
	};
}

function relativeLuminance({ r, g, b }) {
	return (
		0.2126 * srgbToLinear(r) +
		0.7152 * srgbToLinear(g) +
		0.0722 * srgbToLinear(b)
	);
}

function srgbToLinear(channel) {
	const s = channel / 255;
	return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}
