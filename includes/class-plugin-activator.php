<?php
/**
 * Fired during plugin activation.
 *
 * @package    PRC\Platform\Block_Tables
 */

namespace PRC\Platform\Block_Tables;

/**
 * The plugin activator class.
 *
 * @package    PRC\Platform\Block_Tables
 */
class Plugin_Activator {

	/**
	 * Activate the plugin.
	 *
	 * @since    1.0.0
	 */
	public static function activate() {
		flush_rewrite_rules();

		wp_mail(
			DEFAULT_TECHNICAL_CONTACT,
			'PRC Block Tables Activated',
			'The PRC Block Tables plugin has been activated on ' . get_site_url()
		);
	}
}
