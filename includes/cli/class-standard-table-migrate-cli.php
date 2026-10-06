<?php
/**
 * WP-CLI command: migrate legacy prc-data-table/standard-table blocks to prc-block/table.
 *
 * The prc-data-table-builder plugin that registered prc-data-table/standard-table was
 * removed, so posts that still contain the block render nothing on the frontend and show
 * an unsupported block in the editor. This command rewrites each legacy block as a
 * sortable Power Table built from its colHeaders + data attributes.
 *
 * @package PRC\Platform\Block_Tables
 */

declare(strict_types=1);

namespace PRC\Platform\Block_Tables;

// Bail when running outside VIP infrastructure (wp-env, Playground): the parent class is unavailable.
if ( ! class_exists( 'WPCOM_VIP_CLI_Command' ) ) {
	return;
}

require_once __DIR__ . '/class-standard-table-converter.php';

/**
 * Migrates prc-data-table/standard-table blocks in post_content to prc-block/table.
 */
class Standard_Table_Migrate_CLI extends \WPCOM_VIP_CLI_Command {

	/**
	 * Converts legacy Standard Data Table blocks into sortable Power Table blocks.
	 *
	 * Runs in dry-run mode by default. Pass --dry-run=false to write changes.
	 * Safe to re-run: posts without the legacy block are never touched.
	 *
	 * ## OPTIONS
	 *
	 * [--post-id=<id>]
	 * : Only migrate this post.
	 *
	 * [--dry-run=<bool>]
	 * : Preview changes without writing. Default: true.
	 *
	 * [--network]
	 * : Run on every site in the network instead of only the --url site.
	 *
	 * [--batch-size=<number>]
	 * : Number of posts to process per batch. Default: 100. Max: 100.
	 *
	 * ## EXAMPLES
	 *
	 *     # Preview a single post
	 *     wp prc block-tables migrate-standard-table --post-id=200395
	 *
	 *     # Migrate a single post
	 *     wp prc block-tables migrate-standard-table --post-id=200395 --dry-run=false
	 *
	 *     # Count legacy blocks across the network
	 *     wp prc block-tables migrate-standard-table --network
	 *
	 *     # On VIP
	 *     vip @pewresearch.production -- wp prc block-tables migrate-standard-table --post-id=200395 --dry-run=false --url=<site-url>
	 *
	 * @subcommand migrate-standard-table
	 * @synopsis [--post-id=<id>] [--dry-run=<bool>] [--network] [--batch-size=<number>]
	 *
	 * @param array $args       Positional arguments (unused).
	 * @param array $assoc_args Named arguments.
	 */
	public function migrate_standard_table( array $args, array $assoc_args ): void {
		$dry_run    = $this->parse_dry_run( $assoc_args );
		$post_id    = isset( $assoc_args['post-id'] ) ? (int) $assoc_args['post-id'] : 0;
		$network    = ! empty( $assoc_args['network'] );
		$batch_size = max( 1, min( (int) ( $assoc_args['batch-size'] ?? 100 ), 100 ) );
		$totals     = array(
			'posts'  => 0,
			'blocks' => 0,
			'failed' => 0,
		);

		if ( $network && ! is_multisite() ) {
			\WP_CLI::error( '--network requires a multisite install.' );
		}

		\WP_CLI::line(
			$dry_run
				? 'DRY RUN — no changes will be written. Pass --dry-run=false to execute.'
				: 'LIVE RUN — writing updated post_content.'
		);

		if ( ! $dry_run ) {
			// Stored content is already trusted; kses would strip unrelated markup when no user has unfiltered_html.
			kses_remove_filters();
		}

		$this->start_bulk_operation();

		$site_ids = $network
			? get_sites(
				array(
					'fields'   => 'ids',
					'number'   => 0,
					'deleted'  => 0,
					'archived' => 0,
				)
			)
			: array( get_current_blog_id() );

		foreach ( $site_ids as $site_id ) {
			$switched = $network && get_current_blog_id() !== (int) $site_id;
			if ( $switched ) {
				switch_to_blog( (int) $site_id );
			}

			$this->migrate_site( (int) $site_id, $post_id, $dry_run, $batch_size, $totals );

			if ( $switched ) {
				restore_current_blog();
			}
		}

		$this->end_bulk_operation();

		\WP_CLI::success(
			sprintf(
				'%s complete. %s %d block(s) in %d post(s). Failed: %d.',
				$dry_run ? 'Dry run' : 'Migration',
				$dry_run ? 'Would migrate' : 'Migrated',
				$totals['blocks'],
				$totals['posts'],
				$totals['failed']
			)
		);
	}

	/**
	 * Migrate matching posts on the current site.
	 *
	 * @param int   $site_id    Current blog ID (for logging).
	 * @param int   $post_id    Restrict to this post ID, or 0 for all posts.
	 * @param bool  $dry_run    Whether to skip writes.
	 * @param int   $batch_size Posts per query.
	 * @param array $totals     Running totals (posts, blocks, failed).
	 */
	private function migrate_site( int $site_id, int $post_id, bool $dry_run, int $batch_size, array &$totals ): void {
		global $wpdb;

		$needle  = '%' . $wpdb->esc_like( '<!-- wp:' . Standard_Table_Converter::LEGACY_BLOCK_NAME . ' ' ) . '%';
		$last_id = 0;

		do {
			if ( $post_id ) {
				// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
				$ids = $wpdb->get_col(
					$wpdb->prepare(
						"SELECT ID FROM {$wpdb->posts} WHERE ID = %d AND post_content LIKE %s",
						$post_id,
						$needle
					)
				);
			} else {
				// Keyset pagination: migrated posts drop out of the LIKE match, so offsets would skip rows.
				// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
				$ids = $wpdb->get_col(
					$wpdb->prepare(
						"SELECT ID FROM {$wpdb->posts} WHERE ID > %d AND post_type <> 'revision' AND post_content LIKE %s ORDER BY ID ASC LIMIT %d",
						$last_id,
						$needle,
						$batch_size
					)
				);
			}

			foreach ( $ids as $id ) {
				$id      = (int) $id;
				$last_id = $id;
				$this->migrate_post( $site_id, $id, $dry_run, $totals );
			}

			$fetched = count( $ids );
			if ( ! $dry_run && $fetched > 0 ) {
				sleep( 1 );
			}
			$this->vip_inmemory_cleanup();
		} while ( ! $post_id && $fetched === $batch_size );
	}

	/**
	 * Convert and save one post.
	 *
	 * @param int   $site_id Current blog ID (for logging).
	 * @param int   $post_id Post ID.
	 * @param bool  $dry_run Whether to skip writes.
	 * @param array $totals  Running totals (posts, blocks, failed).
	 */
	private function migrate_post( int $site_id, int $post_id, bool $dry_run, array &$totals ): void {
		$post = get_post( $post_id );
		if ( ! $post ) {
			return;
		}

		$converted = 0;
		$blocks    = parse_blocks( $post->post_content ); // phpcs:ignore Universal.Functions.ForbiddenFunctions.parse_blocksFound
		$blocks    = Standard_Table_Converter::convert_blocks( $blocks, $converted );

		if ( 0 === $converted ) {
			\WP_CLI::line( sprintf( '[SKIP] Site %d post %d: no convertible standard-table block found.', $site_id, $post_id ) );
			return;
		}

		$label = sprintf( 'site %d post %d (%s): %d block(s)', $site_id, $post_id, get_the_title( $post ), $converted );

		if ( $dry_run ) {
			\WP_CLI::line( '[DRY RUN] Would migrate ' . $label . '.' );
			++$totals['posts'];
			$totals['blocks'] += $converted;
			return;
		}

		$result = wp_update_post(
			wp_slash(
				array(
					'ID'           => $post_id,
					'post_content' => serialize_blocks( $blocks ), // phpcs:ignore Universal.Functions.ForbiddenFunctions.serialize_blocksFound
				)
			),
			true
		);

		if ( is_wp_error( $result ) ) {
			\WP_CLI::warning( sprintf( 'Update failed for %s — %s', $label, $result->get_error_message() ) );
			++$totals['failed'];
			return;
		}

		\WP_CLI::line( 'Migrated ' . $label . '.' );
		++$totals['posts'];
		$totals['blocks'] += $converted;
	}

	/**
	 * Parse --dry-run from assoc args safely.
	 *
	 * WP-CLI passes flag values as strings; (bool) 'false' === true, so compare explicitly.
	 *
	 * @param array $assoc_args Named WP-CLI arguments.
	 * @return bool True if dry-run, false if live.
	 */
	private function parse_dry_run( array $assoc_args ): bool {
		if ( ! isset( $assoc_args['dry-run'] ) ) {
			return true;
		}
		if ( 'false' === $assoc_args['dry-run'] ) {
			return false;
		}
		return (bool) $assoc_args['dry-run'];
	}
}

\WP_CLI::add_command( 'prc block-tables migrate-standard-table', array( new Standard_Table_Migrate_CLI(), 'migrate_standard_table' ) );
