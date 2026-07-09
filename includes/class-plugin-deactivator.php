<?php
/**
 * Fired during plugin deactivation.
 *
 * @package    PRC\Platform\Block_Tables
 */

namespace PRC\Platform\Block_Tables;

/**
 * The plugin deactivator class.
 *
 * @package    PRC\Platform\Block_Tables
 */
class Plugin_Deactivator {

	/**
	 * Deactivate the plugin.
	 *
	 * @since    1.0.0
	 */
	public static function deactivate() {
		flush_rewrite_rules();

		wp_mail(
			DEFAULT_TECHNICAL_CONTACT,
			'PRC Block Tables Deactivated',
			'The PRC Block Tables plugin has been deactivated on ' . get_site_url()
		);
	}
}
