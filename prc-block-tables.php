<?php
/**
 * PRC Block Tables
 *
 * @package           PRC_Block_Tables
 * @author            Seth Rubenstein
 * @copyright         2024 Pew Research Center
 * @license           GPL-2.0-or-later
 *
 * @wordpress-plugin
 * Plugin Name:       PRC Block Tables
 * Plugin URI:        https://github.com/pewresearch/prc-block-tables
 * Description:       Table blocks for PRC Platform (Power Table, and future Spreadsheet).
 * Version:           1.0.0
 * Requires at least: 6.8
 * Requires PHP:      8.2
 * Author:            Seth Rubenstein
 * Author URI:        https://[REDACTED]
 * License:           GPL-2.0+
 * License URI:       http://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain:       prc-block-tables
 * Requires Plugins:  prc-scripts
 */

namespace PRC\Platform\Block_Tables;

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! defined( 'DEFAULT_TECHNICAL_CONTACT' ) ) {
	define( 'DEFAULT_TECHNICAL_CONTACT', 'webdev@[REDACTED]' );
}

define( 'PRC_BLOCK_TABLES_FILE', __FILE__ );
define( 'PRC_BLOCK_TABLES_DIR', __DIR__ );
define( 'PRC_BLOCK_TABLES_VERSION', '1.0.0' );

/**
 * The code that runs during plugin activation.
 */
function activate() {
	require_once plugin_dir_path( __FILE__ ) . 'includes/class-plugin-activator.php';
	Plugin_Activator::activate();
}

/**
 * The code that runs during plugin deactivation.
 */
function deactivate() {
	require_once plugin_dir_path( __FILE__ ) . 'includes/class-plugin-deactivator.php';
	Plugin_Deactivator::deactivate();
}

register_activation_hook( __FILE__, '\PRC\Platform\Block_Tables\activate' );
register_deactivation_hook( __FILE__, '\PRC\Platform\Block_Tables\deactivate' );

/**
 * Helper utilities
 */
require plugin_dir_path( __FILE__ ) . 'includes/utils.php';

/**
 * The core plugin class that is used to define the hooks that initialize the various components.
 */
require plugin_dir_path( __FILE__ ) . 'includes/class-plugin.php';

/**
 * Begins execution of the plugin.
 *
 * @since 1.0.0
 */
function run_prc_block_tables() {
	$plugin = new Plugin();
	$plugin->run();
}
run_prc_block_tables();
