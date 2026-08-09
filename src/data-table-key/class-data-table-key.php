<?php
/**
 * Data Table Key Block
 *
 * @package PRC\Platform\Blocks
 */

namespace PRC\Platform\Blocks;

/**
 * Block Name: Data Table Key
 */
class Data_Table_Key {

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
	 * Register block type.
	 */
	public function block_init(): void {
		register_block_type_from_metadata(
			PRC_BLOCK_TABLES_DIR . '/build/data-table-key'
		);
	}
}
