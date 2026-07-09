<?php
/**
 * Plugin class.
 *
 * @package    PRC\Platform\XXX
 */

namespace PRC\Platform\XXX;

/**
 * Register and enqueue assets.
 *
 * @package    PRC\Platform\XXX
 */
class Assets {

	/**
	 * Constructor.
	 *
	 * @param Loader $loader The loader instance.
	 */
	public function __construct( $loader = null ) {
		$loader->add_action( 'enqueue_block_editor_assets', $this, 'enqueue_editor_ui', 1 );
		$loader->add_action( 'enqueue_block_editor_assets', $this, 'register_exports', 1 );
	}

	/**
	 * Enqueue the XXX block editor ui script.
	 *
	 * @hook enqueue_block_editor_assets
	 */
	public function enqueue_editor_ui() {
		$plugin_asset_file = include plugin_dir_path( __DIR__ ) . 'build/editor-ui/index.asset.php';
		wp_enqueue_script(
			'prc-xxx',
			plugins_url( 'build/editor-ui/index.js', __DIR__ ),
			$plugin_asset_file['dependencies'],
			$plugin_asset_file['version'],
			true
		);
	}

	/**
	 * Register @prc/XXX exports.
	 *
	 * @hook wp_enqueue_scripts
	 */
	public function register_exports() {
		// $export_asset_file = include plugin_dir_path( __DIR__ ) . 'build/exports/exports.asset.php';
		// wp_register_script(
		// 'prc-schema-seo',
		// plugins_url( 'build/exports/exports.js', __DIR__ ),
		// $export_asset_file['dependencies'],
		// $export_asset_file['version'],
		// true
		// );
	}
}
