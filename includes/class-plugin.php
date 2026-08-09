<?php
/**
 * Plugin class.
 *
 * @package PRC\Platform\Block_Tables
 */

namespace PRC\Platform\Block_Tables;

use PRC\Platform\Blocks\Table;
use PRC\Platform\Blocks\Power_Spreadsheet;
use PRC\Platform\Blocks\Data_Table_Controller;
use PRC\Platform\Blocks\Data_Table_Render;
use PRC\Platform\Blocks\Data_Table_Filter;
use PRC\Platform\Blocks\Data_Table_Filter_Select;
use PRC\Platform\Blocks\Data_Table_Key;
use PRC\Platform\Blocks\Remote_Pivot_Table;

/**
 * Plugin class.
 */
class Plugin {
	/**
	 * The loader that's responsible for maintaining and registering all hooks that power
	 * the plugin.
	 *
	 * @var Loader
	 */
	protected $loader;

	/**
	 * The unique identifier of this plugin.
	 *
	 * @var string
	 */
	protected $plugin_name;

	/**
	 * The current version of the plugin.
	 *
	 * @var string
	 */
	protected $version;

	/**
	 * Define the core functionality of the platform as initialized by hooks.
	 */
	public function __construct() {
		$this->version     = '1.0.0';
		$this->plugin_name = 'prc-block-tables';

		$this->load_dependencies();
		$this->init_dependencies();
	}

	/**
	 * Load the required dependencies for this plugin.
	 */
	private function load_dependencies() {
		require_once plugin_dir_path( __DIR__ ) . '/includes/class-loader.php';
		require_once plugin_dir_path( __DIR__ ) . '/includes/ai-features/class-ai-features.php';
		require_once plugin_dir_path( __DIR__ ) . '/build/table/class-table.php';
		require_once plugin_dir_path( __DIR__ ) . '/build/power-spreadsheet/class-power-spreadsheet.php';
		require_once plugin_dir_path( __DIR__ ) . '/build/data-table-controller/class-data-table-controller.php';
		require_once plugin_dir_path( __DIR__ ) . '/build/data-table-render/class-data-table-render.php';
		require_once plugin_dir_path( __DIR__ ) . '/build/data-table-filter/class-data-table-filter.php';
		require_once plugin_dir_path( __DIR__ ) . '/build/data-table-filter-select/class-data-table-filter-select.php';
		require_once plugin_dir_path( __DIR__ ) . '/build/data-table-key/class-data-table-key.php';
		require_once plugin_dir_path( __DIR__ ) . '/build/remote-pivot-table/class-remote-pivot-table.php';

		$this->loader = new Loader();
	}

	/**
	 * Initialize the dependencies.
	 */
	private function init_dependencies() {
		\wp_register_block_metadata_collection(
			plugin_dir_path( __DIR__ ) . '/build',
			plugin_dir_path( __DIR__ ) . '/build/blocks-manifest.php'
		);

		new AI_Features( $this->get_loader() );
		new Table( $this->get_loader() );
		new Power_Spreadsheet( $this->get_loader() );
		new Data_Table_Controller( $this->get_loader() );
		new Data_Table_Render( $this->get_loader() );
		new Data_Table_Filter( $this->get_loader() );
		new Data_Table_Filter_Select( $this->get_loader() );
		new Data_Table_Key( $this->get_loader() );
		new Remote_Pivot_Table( $this->get_loader() );
	}

	/**
	 * Run the loader to execute all of the hooks with WordPress.
	 */
	public function run() {
		$this->loader->run();
	}

	/**
	 * The name of the plugin used to uniquely identify it within the context of
	 * WordPress and to define internationalization functionality.
	 *
	 * @return string
	 */
	public function get_plugin_name() {
		return $this->plugin_name;
	}

	/**
	 * The reference to the class that orchestrates the hooks with the plugin.
	 *
	 * @return Loader
	 */
	public function get_loader() {
		return $this->loader;
	}

	/**
	 * Retrieve the version number of the plugin.
	 *
	 * @return string
	 */
	public function get_version() {
		return $this->version;
	}
}
