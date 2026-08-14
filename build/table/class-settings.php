<?php
/**
 * Settings class for Table block
 *
 * @package PRC\Platform\Blocks\Table;
 * @author Aki Hamano, Seth Rubenstein
 * @license GPL-2.0+
 */

namespace PRC\Platform\Blocks\Table;

/**
 * Settings class for Table block
 *
 * @package PRC\Platform\Blocks\Table;
 * @author Aki Hamano, Seth Rubenstein
 * @license GPL-2.0+
 */
class Settings {

	/**
	 * Allowed units for table width / max-width.
	 *
	 * @var string[]
	 */
	const TABLE_WIDTH_UNITS = array( 'px', 'em', 'rem', '%' );

	/**
	 * Allowed units for cell border width.
	 *
	 * @var string[]
	 */
	const BORDER_WIDTH_UNITS = array( 'px', 'em', 'rem' );

	/**
	 * Allowed units for cell padding.
	 *
	 * @var string[]
	 */
	const PADDING_UNITS = array( 'px', '%', 'em', 'rem', 'vw', 'vh' );

	/**
	 * Allowed border-collapse values.
	 *
	 * @var string[]
	 */
	const BORDER_COLLAPSE_VALUES = array( 'collapse', 'separate' );

	/**
	 * Allowed border-style values.
	 *
	 * @var string[]
	 */
	const BORDER_STYLE_VALUES = array( 'solid', 'dotted', 'dashed', 'double' );

	/**
	 * Allowed text-align values.
	 *
	 * @var string[]
	 */
	const TEXT_ALIGN_VALUES = array( 'left', 'center', 'right' );

	/**
	 * Allowed vertical-align values.
	 *
	 * @var string[]
	 */
	const VERTICAL_ALIGN_VALUES = array( 'top', 'middle', 'bottom' );

	// Default options.
	const OPTIONS = array(

		// Show section labels on table in the editor.
		'show_label_on_section' => array(
			'type'    => 'boolean',
			'default' => true,
		),
		// Show insert row/column buttons.
		'show_control_button'   => array(
			'type'    => 'boolean',
			'default' => true,
		),
		// Focus insert/select buttons, select row/column buttons, section label from being focused when moving with the crosshairs.
		'focus_control_button'  => array(
			'type'    => 'boolean',
			'default' => false,
		),
		// Show dot on th tag in the editor.
		'show_dot_on_th'        => array(
			'type'    => 'boolean',
			'default' => true,
		),
		// Use the TAB key to move cells.
		'tab_move'              => array(
			'type'    => 'boolean',
			'default' => false,
		),
		// Keep the contents of all cells when merging cells.
		'merge_content'         => array(
			'type'    => 'boolean',
			'default' => false,
		),
		// Legacy: previously delegated Global setting UI to non-admins. Kept for GET compatibility; no longer used for auth.
		'show_global_setting'   => array(
			'type'    => 'boolean',
			'default' => false,
		),
		// Set the screen width (breakpoint) as the basis for switching between desktop and mobile devices.
		'breakpoint'            => array(
			'type'    => 'number',
			'default' => 768,
			'range'   => array(
				'min' => 200,
				'max' => 1200,
			),
		),
		// Default table styles.
		'block_style'           => array(
			'type'    => 'array',
			'default' => array(
				'table_width'              => '100%',
				'table_max_width'          => '100%',
				'table_border_collapse'    => 'collapse',
				'table_font_family'        => 'var(--wp--preset--font-family--sans-serif)',
				'row_odd_color'            => 'var(--wp--preset--color--ui-beige-light)',
				'row_even_color'           => 'var(--wp--preset--color--ui-white)',
				'cell_text_color_th'       => null,
				'cell_text_color_td'       => null,
				'cell_background_color_th' => 'var(--wp--preset--color--ui-beige-very-light)',
				'cell_background_color_td' => 'var(--wp--preset--color--ui-white)',
				// 'cell_hover_background_color' => 'light-dark(#f0f0f1,#2a2a2a)',
				'cell_padding'             => array(
					'top'    => '0.5em',
					'right'  => '0.5em',
					'bottom' => '0.5em',
					'left'   => '0.5em',
				),
				'cell_border_width'        => '1px',
				'cell_border_style'        => 'solid',
				'cell_border_color'        => 'var(--wp--preset--color--ui-black)',
				'cell_text_align'          => 'left',
				'cell_vertical_align'      => 'middle',
			),
		),
	);

	/**
	 * Constructor
	 */
	public function __construct() {
	}

	/**
	 * Get options
	 *
	 * @return array
	 */
	public static function get_options() {
		$options = array();

		foreach ( self::OPTIONS as $key => $value ) {
			$options[ $key ] = get_option( FTB_OPTION_PREFIX . '_' . $key, self::OPTIONS[ $key ]['default'] );

			if ( 'boolean' === self::OPTIONS[ $key ]['type'] ) {
				$options[ $key ] = $options[ $key ] ? true : false;
			}
		}

		// Convert cell padding of string values to array.
		if ( isset( $options['block_style']['cell_padding'] ) && 'string' === gettype( $options['block_style']['cell_padding'] ) ) {
			$padding_value = $options['block_style']['cell_padding'];

			$options['block_style']['cell_padding'] = array(
				'top'    => $padding_value,
				'right'  => $padding_value,
				'bottom' => $padding_value,
				'left'   => $padding_value,
			);
		}

		return $options;
	}

	/**
	 * Sanitize a single option value for persistence.
	 *
	 * Invalid values are skipped (return null) so partial updates continue.
	 *
	 * @param string $key   Option key from Settings::OPTIONS.
	 * @param mixed  $value Raw request value.
	 * @return mixed|null Sanitized value, or null to skip updating this key.
	 */
	public static function sanitize_option_value( $key, $value ) {
		if ( ! array_key_exists( $key, self::OPTIONS ) ) {
			return null;
		}

		$type = self::OPTIONS[ $key ]['type'];

		if ( 'boolean' === $type ) {
			return $value ? 1 : 0;
		}

		if ( 'number' === $type ) {
			if ( ! is_numeric( $value ) ) {
				return null;
			}
			$value = (float) $value;
			if ( isset( self::OPTIONS[ $key ]['range'] ) ) {
				$min   = self::OPTIONS[ $key ]['range']['min'];
				$max   = self::OPTIONS[ $key ]['range']['max'];
				$value = min( max( $value, $min ), $max );
			}
			return (int) round( $value );
		}

		if ( 'array' === $type ) {
			if ( ! is_array( $value ) ) {
				return null;
			}
			if ( 'block_style' === $key ) {
				return self::sanitize_block_style( $value );
			}
			return null;
		}

		return null;
	}

	/**
	 * Sanitize the block_style option array.
	 *
	 * @param array $value Raw block_style payload.
	 * @return array Filtered and validated block_style.
	 */
	public static function sanitize_block_style( array $value ) {
		$defaults  = self::OPTIONS['block_style']['default'];
		$sanitized = array();

		foreach ( $value as $array_key => $array_value ) {
			if ( ! array_key_exists( $array_key, $defaults ) ) {
				continue;
			}

			$clean = self::sanitize_block_style_field( $array_key, $array_value );
			if ( null !== $clean ) {
				$sanitized[ $array_key ] = $clean;
			}
		}

		return $sanitized;
	}

	/**
	 * Sanitize one block_style field. Returns null to omit the field.
	 *
	 * @param string $key   Field name.
	 * @param mixed  $value Field value.
	 * @return mixed|null
	 */
	public static function sanitize_block_style_field( $key, $value ) {
		if ( null === $value || '' === $value ) {
			// Preserve explicit null/empty for optional color fields.
			if ( in_array( $key, array( 'cell_text_color_th', 'cell_text_color_td' ), true ) ) {
				return null;
			}
			return null;
		}

		switch ( $key ) {
			case 'table_width':
			case 'table_max_width':
				return self::sanitize_dimension( $value, self::TABLE_WIDTH_UNITS );

			case 'cell_border_width':
				return self::sanitize_dimension( $value, self::BORDER_WIDTH_UNITS );

			case 'cell_padding':
				return self::sanitize_padding( $value );

			case 'table_border_collapse':
				return self::sanitize_enum( $value, self::BORDER_COLLAPSE_VALUES );

			case 'cell_border_style':
				return self::sanitize_enum( $value, self::BORDER_STYLE_VALUES );

			case 'cell_text_align':
				return self::sanitize_enum( $value, self::TEXT_ALIGN_VALUES );

			case 'cell_vertical_align':
				return self::sanitize_enum( $value, self::VERTICAL_ALIGN_VALUES );

			case 'row_odd_color':
			case 'row_even_color':
			case 'cell_text_color_th':
			case 'cell_text_color_td':
			case 'cell_background_color_th':
			case 'cell_background_color_td':
			case 'cell_hover_background_color':
			case 'cell_border_color':
				return self::sanitize_color( $value );

			case 'table_font_family':
				return self::sanitize_font_family( $value );

			default:
				return null;
		}
	}

	/**
	 * Sanitize a CSS dimension (number + unit).
	 *
	 * @param mixed    $value Raw value.
	 * @param string[] $units Allowed units.
	 * @return string|null
	 */
	public static function sanitize_dimension( $value, array $units ) {
		if ( ! is_string( $value ) && ! is_numeric( $value ) ) {
			return null;
		}

		$value = trim( (string) $value );
		if ( '' === $value ) {
			return null;
		}

		if ( '0' === $value ) {
			return '0';
		}

		if ( ! preg_match( '/^(\d+(?:\.\d+)?)([a-z%]+)$/i', $value, $matches ) ) {
			return null;
		}

		$number = $matches[1];
		$unit   = strtolower( $matches[2] );

		if ( ! in_array( $unit, $units, true ) ) {
			return null;
		}

		if ( (float) $number < 0 ) {
			return null;
		}

		return $number . $unit;
	}

	/**
	 * Sanitize cell padding (string or four-side array).
	 *
	 * @param mixed $value Raw padding.
	 * @return array|string|null
	 */
	public static function sanitize_padding( $value ) {
		if ( is_string( $value ) ) {
			return self::sanitize_dimension( $value, self::PADDING_UNITS );
		}

		if ( ! is_array( $value ) ) {
			return null;
		}

		$sides     = array( 'top', 'right', 'bottom', 'left' );
		$sanitized = array();

		foreach ( $sides as $side ) {
			if ( ! array_key_exists( $side, $value ) ) {
				continue;
			}
			if ( '' === $value[ $side ] || null === $value[ $side ] ) {
				$sanitized[ $side ] = '';
				continue;
			}
			$clean = self::sanitize_dimension( $value[ $side ], self::PADDING_UNITS );
			if ( null === $clean ) {
				return null;
			}
			$sanitized[ $side ] = $clean;
		}

		return empty( $sanitized ) ? null : $sanitized;
	}

	/**
	 * Sanitize a color value for CSS.
	 *
	 * @param mixed $value Raw color.
	 * @return string|null
	 */
	public static function sanitize_color( $value ) {
		if ( ! is_string( $value ) ) {
			return null;
		}

		$value = trim( $value );
		if ( '' === $value ) {
			return null;
		}

		if ( 'transparent' === strtolower( $value ) ) {
			return 'transparent';
		}

		// Hex: #rgb, #rrggbb, #rrggbbaa.
		if ( preg_match( '/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i', $value ) ) {
			return strtolower( $value );
		}

		// CSS custom property: var(--token) or var(--token, fallback).
		// Fallback limited to safe CSS token chars (blocks </style> breakout).
		if ( preg_match( '/^var\(\s*--[a-zA-Z0-9_-]+(?:\s*,\s*[#a-zA-Z0-9%._\-\s]+)?\s*\)$/', $value ) ) {
			return $value;
		}

		return null;
	}

	/**
	 * Sanitize font-family for CSS (CSS vars only to avoid injection).
	 *
	 * @param mixed $value Raw font-family.
	 * @return string|null
	 */
	public static function sanitize_font_family( $value ) {
		if ( ! is_string( $value ) ) {
			return null;
		}

		$value = trim( $value );
		if ( '' === $value ) {
			return null;
		}

		// Same var() allowlist as sanitize_color.
		if ( preg_match( '/^var\(\s*--[a-zA-Z0-9_-]+(?:\s*,\s*[#a-zA-Z0-9%._\-\s]+)?\s*\)$/', $value ) ) {
			return $value;
		}

		return null;
	}

	/**
	 * Sanitize an enum string value.
	 *
	 * @param mixed    $value   Raw value.
	 * @param string[] $allowed Allowed values.
	 * @return string|null
	 */
	public static function sanitize_enum( $value, array $allowed ) {
		if ( ! is_string( $value ) ) {
			return null;
		}
		$value = trim( $value );
		if ( ! in_array( $value, $allowed, true ) ) {
			return null;
		}
		return $value;
	}
}
