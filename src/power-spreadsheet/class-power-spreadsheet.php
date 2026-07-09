<?php
/**
 * Block Name:        Power Spreadsheet
 * Description:       An Excel-like tabbed container for Power Tables.
 * Version:           1.0.0
 * Requires at least: 6.7
 * Requires PHP:      8.2
 * Author:            Pew Research Center
 *
 * @package           prc-block
 */

namespace PRC\Platform\Blocks;

/**
 * Power Spreadsheet Block
 *
 * @package           prc-block
 */
class Power_Spreadsheet {
	/**
	 * Constructor
	 *
	 * @param mixed $loader Loader.
	 */
	public function __construct( $loader ) {
		$this->init( $loader );
	}

	/**
	 * Initialize the block
	 *
	 * @param mixed $loader Loader.
	 */
	public function init( $loader = null ) {
		if ( null !== $loader ) {
			$loader->add_action( 'init', $this, 'block_init' );
		}
	}

	/**
	 * Resolve a sheet's tab label from its inner table block attributes.
	 *
	 * Mirrors the editor fallback in edit.jsx (block metadata name, else "Sheet N").
	 *
	 * @param array $attrs Inner block attributes.
	 * @param int   $index Zero-based sheet index.
	 * @return string
	 */
	private static function resolve_sheet_label( array $attrs, int $index ): string {
		$name  = $attrs['metadata']['name'] ?? '';
		$label = is_string( $name ) ? trim( $name ) : '';
		if ( '' === $label ) {
			return sprintf( 'Sheet %d', $index + 1 );
		}
		return $label;
	}

	/**
	 * Block render callback.
	 *
	 * Rebuilds the Excel-like UI server-side from the parsed inner blocks: a tab row
	 * (one tab per inner Power Table) and one panel per sheet. Visibility is driven by
	 * the Interactivity API via `activeSheetIndex` in block context.
	 *
	 * @param array     $attributes Block attributes.
	 * @param string    $content    Saved inner block HTML (unused; re-rendered per sheet).
	 * @param \WP_Block $block      Block instance.
	 * @return string
	 */
	public static function render_block( $attributes, $content, $block ) {
		$inner_blocks = $block->parsed_block['innerBlocks'] ?? array();
		if ( empty( $inner_blocks ) ) {
			return '';
		}

		$active_index = isset( $attributes['activeSheetIndex'] ) ? (int) $attributes['activeSheetIndex'] : 0;
		if ( $active_index < 0 || $active_index >= count( $inner_blocks ) ) {
			$active_index = 0;
		}

		$tabs   = '';
		$panels = '';
		foreach ( $inner_blocks as $index => $inner_block ) {
			$attrs = $inner_block['attrs'] ?? array();
			$label = self::resolve_sheet_label( $attrs, (int) $index );

			$tabs .= sprintf(
				'<button type="button" role="tab" class="wp-block-prc-block-power-spreadsheet__tab" data-sheet-index="%1$d" data-wp-on--click="actions.setActiveSheet" data-wp-class--is-active="state.isActiveTab" data-wp-bind--aria-selected="state.isActiveTab"><span>%2$s</span></button>',
				(int) $index,
				esc_html( $label )
			);

			$rendered = render_block( $inner_block );
			$panels  .= sprintf(
				'<div class="wp-block-prc-block-power-spreadsheet__panel" role="tabpanel" data-wp-context=\'%1$s\' data-wp-bind--hidden="!state.isActiveSheet">%2$s</div>',
				wp_json_encode( array( 'sheetIndex' => (int) $index ) ),
				$rendered
			);
		}

		$wrapper_attributes = get_block_wrapper_attributes(
			array(
				'data-wp-interactive' => 'prc-block/power-spreadsheet',
				'data-wp-context'     => wp_json_encode( array( 'activeSheetIndex' => $active_index ) ),
			)
		);

		return sprintf(
			'<div %1$s><div class="wp-block-prc-block-power-spreadsheet__panels">%3$s</div><div class="wp-block-prc-block-power-spreadsheet__tabs" role="tablist">%2$s</div></div>',
			$wrapper_attributes,
			$tabs,
			$panels
		);
	}

	/**
	 * Register the block.
	 *
	 * @hook init
	 */
	public function block_init() {
		register_block_type_from_metadata(
			PRC_BLOCK_TABLES_DIR . '/build/power-spreadsheet',
			array(
				'render_callback' => array( self::class, 'render_block' ),
			)
		);
	}
}
