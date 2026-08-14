<?php
/**
 * Data Table Controller Block
 *
 * @package PRC\Platform\Blocks
 */

namespace PRC\Platform\Blocks;

use WP_Block;

/**
 * Block Name:        Data Table Controller
 *
 * @package PRC\Platform\Blocks
 */
class Data_Table_Controller {

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
			$loader->add_action( 'rest_api_init', $this, 'register_rest_routes' );
			$loader->add_filter( 'remote_data_blocks_template_blocks', $this, 'signal_rdb_template_support' );
			$loader->add_filter( 'render_block_data', $this, 'ensure_instance_id', 100, 1 );
			$loader->add_filter( 'render_block_context', $this, 'ensure_remote_data_block_context', 10, 3 );
		}
	}

	/**
	 * Register REST API routes for editor preview.
	 */
	public function register_rest_routes(): void {
		register_rest_route(
			'prc-api/v3',
			'/data-table/firebase-data',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'rest_get_firebase_data' ),
				'permission_callback' => function () {
					return current_user_can( 'edit_posts' );
				},
				'args'                => array(
					'path' => array(
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => array( $this, 'sanitize_firebase_path' ),
					),
				),
			)
		);

		register_rest_route(
			'prc-api/v3',
			'/data-table/firebase-column-values',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'rest_post_firebase_column_values' ),
				'permission_callback' => function () {
					return current_user_can( 'edit_posts' );
				},
				'args'                => array(
					'path' => array(
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => array( $this, 'sanitize_firebase_path' ),
					),
					'column' => array(
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
					),
					'defaultJsonSheet' => array(
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
					),
					'pivotEnabled' => array(
						'type'    => 'boolean',
						'default' => false,
					),
					'pivotIndexColumn' => array(
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
					),
					'pivotColumnField' => array(
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
					),
					'pivotColumns' => array(
						'type'    => 'array',
						'default' => array(),
					),
					'pivotValueFields' => array(
						'type'    => 'array',
						'default' => array(),
					),
					'pivotExtraColumns' => array(
						'type'    => 'array',
						'default' => array(),
					),
				),
			)
		);
	}

	/**
	 * Sanitize a Firebase Realtime Database path.
	 *
	 * Rejects empty values, URL schemes, and path traversal segments.
	 *
	 * @param string $path Raw path from the request.
	 * @return string|WP_Error Sanitized path or error.
	 */
	public function sanitize_firebase_path( $path ) {
		$path = is_string( $path ) ? trim( $path ) : '';
		$path = ltrim( $path, '/' );

		if ( '' === $path ) {
			return new \WP_Error(
				'invalid_firebase_path',
				__( 'Firebase path is required.', 'data-table-controller' ),
				array( 'status' => 400 )
			);
		}

		if ( preg_match( '#^[a-z][a-z0-9+.-]*:#i', $path ) ) {
			return new \WP_Error(
				'invalid_firebase_path',
				__( 'Firebase path must not include a URL scheme.', 'data-table-controller' ),
				array( 'status' => 400 )
			);
		}

		if ( str_contains( $path, '..' ) ) {
			return new \WP_Error(
				'invalid_firebase_path',
				__( 'Firebase path must not contain ".." segments.', 'data-table-controller' ),
				array( 'status' => 400 )
			);
		}

		return sanitize_text_field( $path );
	}

	/**
	 * Max rows returned by the editor Firebase preview endpoint.
	 *
	 * Large interactives datasets (tens of thousands of rows) exceed practical
	 * REST/JSON limits and break apiFetch with "not a valid JSON response".
	 * Front-end render still loads the full path server-side.
	 */
	private const FIREBASE_EDITOR_PREVIEW_ROW_LIMIT = 500;

	/**
	 * REST: fetch raw data from a Firebase Realtime Database path.
	 *
	 * Returns a row-capped preview suitable for editor controls. Published
	 * output uses the full dataset via {@see fetch_firebase_path()}.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function rest_get_firebase_data( \WP_REST_Request $request ) {
		$path = $request->get_param( 'path' );
		if ( is_wp_error( $path ) ) {
			return $path;
		}

		$raw = $this->fetch_firebase_path( $path );
		if ( is_wp_error( $raw ) ) {
			return $raw;
		}

		if ( null === $raw ) {
			return new \WP_Error(
				'firebase_path_empty',
				__( 'No data found at that Firebase path.', 'data-table-controller' ),
				array( 'status' => 404 )
			);
		}

		return rest_ensure_response( $this->cap_firebase_editor_preview( $raw ) );
	}

	/**
	 * REST: distinct non-empty values for one column from the full Firebase dataset.
	 *
	 * Scans the uncapped Firebase path and applies the same normalize + pivot
	 * pipeline as front-end render so filter-select import matches published output.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function rest_post_firebase_column_values( \WP_REST_Request $request ) {
		$path = $request->get_param( 'path' );
		if ( is_wp_error( $path ) ) {
			return $path;
		}

		$column = $request->get_param( 'column' );
		$column = is_string( $column ) ? trim( $column ) : '';
		if ( '' === $column ) {
			return new \WP_Error(
				'invalid_column',
				__( 'Column name is required.', 'data-table-controller' ),
				array( 'status' => 400 )
			);
		}

		$attributes = $this->rest_pivot_attributes_from_request( $request );

		$raw = $this->fetch_firebase_path( $path );
		if ( is_wp_error( $raw ) ) {
			return $raw;
		}

		if ( null === $raw ) {
			return new \WP_Error(
				'firebase_path_empty',
				__( 'No data found at that Firebase path.', 'data-table-controller' ),
				array( 'status' => 404 )
			);
		}

		$normalized = $this->normalize_context_data( $raw, $attributes, null );
		if ( empty( $normalized ) ) {
			return rest_ensure_response( array( 'values' => array() ) );
		}

		$normalized = $this->apply_pivot( $normalized, $attributes );

		$default_sheet = isset( $attributes['defaultJsonSheet'] ) ? (string) $attributes['defaultJsonSheet'] : '';
		$sheet_names   = array_keys( $normalized );
		$active_sheet  = ( '' !== $default_sheet && isset( $normalized[ $default_sheet ] ) )
			? $default_sheet
			: ( $sheet_names[0] ?? '' );

		if ( '' === $active_sheet || ! isset( $normalized[ $active_sheet ] ) ) {
			return rest_ensure_response( array( 'values' => array() ) );
		}

		$rows   = isset( $normalized[ $active_sheet ]['rows'] ) && is_array( $normalized[ $active_sheet ]['rows'] )
			? $normalized[ $active_sheet ]['rows']
			: array();
		$values = $this->collect_sorted_column_uniques( $rows, $column );

		return rest_ensure_response( array( 'values' => $values ) );
	}

	/**
	 * Build pivot-related attributes from a REST request body.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return array<string, mixed>
	 */
	private function rest_pivot_attributes_from_request( \WP_REST_Request $request ): array {
		return array(
			'defaultJsonSheet'  => (string) ( $request->get_param( 'defaultJsonSheet' ) ?? '' ),
			'pivotEnabled'      => rest_sanitize_boolean( $request->get_param( 'pivotEnabled' ) ?? false ),
			'pivotIndexColumn'  => (string) ( $request->get_param( 'pivotIndexColumn' ) ?? '' ),
			'pivotColumnField'  => (string) ( $request->get_param( 'pivotColumnField' ) ?? '' ),
			'pivotColumns'      => $request->get_param( 'pivotColumns' ) ?? array(),
			'pivotValueFields'  => $request->get_param( 'pivotValueFields' ) ?? array(),
			'pivotExtraColumns' => $request->get_param( 'pivotExtraColumns' ) ?? array(),
		);
	}

	/**
	 * Collect sorted unique non-empty string values for one column.
	 *
	 * @param array<int, array<string, mixed>> $rows   Table rows.
	 * @param string                           $column Column name.
	 * @return string[]
	 */
	private function collect_sorted_column_uniques( array $rows, string $column ): array {
		$seen = array();
		foreach ( $rows as $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}
			$value = isset( $row[ $column ] ) ? (string) $row[ $column ] : '';
			if ( '' === $value ) {
				continue;
			}
			$seen[ $value ] = true;
		}

		$values = array_keys( $seen );
		usort(
			$values,
			static function ( $a, $b ) {
				return strnatcasecmp( $a, $b );
			}
		);

		return $values;
	}

	/**
	 * Cap Firebase payloads so the editor REST response stays JSON-safe.
	 *
	 * @param mixed $raw Raw Firebase value.
	 * @return mixed Possibly truncated value in the same shape.
	 */
	private function cap_firebase_editor_preview( $raw ) {
		$limit = self::FIREBASE_EDITOR_PREVIEW_ROW_LIMIT;

		if ( ! is_array( $raw ) ) {
			return $raw;
		}

		if ( $this->is_list_of_assoc_arrays( $raw ) ) {
			return count( $raw ) > $limit ? array_slice( $raw, 0, $limit ) : $raw;
		}

		if ( isset( $raw['sheets'] ) && is_array( $raw['sheets'] ) ) {
			foreach ( $raw['sheets'] as $sheet_name => $sheet ) {
				if ( ! is_array( $sheet ) || ! isset( $sheet['rows'] ) || ! is_array( $sheet['rows'] ) ) {
					continue;
				}
				if ( count( $sheet['rows'] ) > $limit ) {
					$raw['sheets'][ $sheet_name ]['rows'] = array_slice( $sheet['rows'], 0, $limit );
				}
			}
			return $raw;
		}

		if ( isset( $raw['rows'] ) && is_array( $raw['rows'] ) && count( $raw['rows'] ) > $limit ) {
			$raw['rows'] = array_slice( $raw['rows'], 0, $limit );
		}

		return $raw;
	}

	/**
	 * Resolve the data-table-builder Realtime Database URL for the current environment.
	 *
	 * Table datasets (e.g. migrations) live on the data-table-builder RTDB, not
	 * the default auth database that `\PRC\Platform\Firebase::$db` uses.
	 *
	 * @return string|\WP_Error Database URL or error.
	 */
	private function resolve_data_table_builder_database_uri() {
		$environment = \wp_get_environment_type();
		$is_production = 'production' === $environment;

		if ( $is_production ) {
			if ( ! defined( 'PRC_PLATFORM_FIREBASE_DATA_TABLE_BUILDER_DB' ) ) {
				return new \WP_Error(
					'firebase_unavailable',
					__( 'Data-table-builder Firebase database URL is not configured.', 'data-table-controller' ),
					array( 'status' => 503 )
				);
			}
			return (string) \PRC_PLATFORM_FIREBASE_DATA_TABLE_BUILDER_DB;
		}

		if ( ! defined( 'PRC_PLATFORM_FIREBASE_DATA_TABLE_BUILDER_DB__DEV' ) ) {
			return new \WP_Error(
				'firebase_unavailable',
				__( 'Data-table-builder Firebase database URL is not configured.', 'data-table-controller' ),
				array( 'status' => 503 )
			);
		}

		return (string) \PRC_PLATFORM_FIREBASE_DATA_TABLE_BUILDER_DB__DEV;
	}

	/**
	 * Fetch a value from the data-table-builder Firebase Realtime Database via the platform SDK.
	 *
	 * @param string $path Database path relative to the data-table-builder RTDB root.
	 * @return mixed|\WP_Error Raw value or error.
	 */
	private function fetch_firebase_path( string $path ) {
		if ( ! class_exists( '\PRC\Platform\Firebase' ) ) {
			return new \WP_Error(
				'firebase_unavailable',
				__( 'Firebase is not available on this environment.', 'data-table-controller' ),
				array( 'status' => 503 )
			);
		}

		$database_uri = $this->resolve_data_table_builder_database_uri();
		if ( is_wp_error( $database_uri ) ) {
			return $database_uri;
		}

		try {
			$firebase = new \PRC\Platform\Firebase();
			if ( ! $firebase->instance ) {
				return new \WP_Error(
					'firebase_unavailable',
					__( 'Firebase database could not be initialized.', 'data-table-controller' ),
					array( 'status' => 503 )
				);
			}

			// Point at the data-table-builder RTDB (not the default auth DB).
			$db = $firebase->instance->withDatabaseUri( $database_uri )->createDatabase();

			return $db->getReference( $path )->getValue();
		} catch ( \Throwable $e ) {
			return new \WP_Error(
				'firebase_error',
				sprintf(
					/* translators: %s: error message */
					__( 'Failed to read Firebase path: %s', 'data-table-controller' ),
					$e->getMessage()
				),
				array( 'status' => 500 )
			);
		}
	}

	/**
	 * Signal support to Remote Data Blocks which PRC Blocks are supported as "RDB templates".
	 *
	 * @param array $template_blocks The template blocks.
	 * @return array The template blocks.
	 */
	public function signal_rdb_template_support( $template_blocks ) {
		$template_blocks[] = 'prc-block/data-table-controller';
		return $template_blocks;
	}

	/**
	 * Ensure dataTableInstanceId is set before children render so providesContext stays in sync.
	 *
	 * Inner blocks read the instance ID from block context (saved attribute). Generating an ID
	 * only inside render_callback is too late — children already received the empty value.
	 *
	 * @hook render_block_data
	 *
	 * @param array $parsed_block Parsed block array.
	 * @return array
	 */
	public function ensure_instance_id( $parsed_block ) {
		if ( ( $parsed_block['blockName'] ?? '' ) !== 'prc-block/data-table-controller' ) {
			return $parsed_block;
		}
		if ( empty( $parsed_block['attrs']['dataTableInstanceId'] ) ) {
			$parsed_block['attrs']['dataTableInstanceId'] = wp_unique_id( 'data-table-' );
		}
		return $parsed_block;
	}

	/**
	 * Ensure Data Table Controller receives remote RDB context when the parent is a template
	 * (remote-data-blocks/template exposes remoteData only on $block->context, not attributes).
	 *
	 * @param array          $context      Context for the block about to render.
	 * @param array          $parsed_block Parsed block array.
	 * @param \WP_Block|null $parent_block Parent block instance.
	 * @return array
	 */
	public function ensure_remote_data_block_context( $context, $parsed_block, $parent_block = null ) {
		if ( ( $parsed_block['blockName'] ?? '' ) !== 'prc-block/data-table-controller' ) {
			return $context;
		}
		$key = 'remote-data-blocks/remoteData';
		if ( ! empty( $context[ $key ] ) && is_array( $context[ $key ] ) ) {
			// do_action('qm/debug', 'context[remote-data-blocks/remoteData] is not empty');
			// do_action('qm/debug', $context[ $key ]);
			return $context;
		}
		$remote = $this->get_remote_data_from_parent_block( $parent_block );
		if ( is_array( $remote ) && ! empty( $remote ) ) {
			$context[ $key ] = $remote;
		}
		return $context;
	}

	/**
	 * Read remoteData from an RDB container (attribute) or inner template (context).
	 *
	 * @param mixed $parent_block Parent WP_Block from render_block_context.
	 * @return array|null
	 */
	private function get_remote_data_from_parent_block( $parent_block ): ?array {
		if ( ! $parent_block instanceof WP_Block ) {
			return null;
		}
		$attrs = $parent_block->attributes;
		if ( ! empty( $attrs['remoteData'] ) && is_array( $attrs['remoteData'] ) ) {
			return $attrs['remoteData'];
		}
		$from_context = $parent_block->context['remote-data-blocks/remoteData'] ?? null;
		if ( is_array( $from_context ) && ! empty( $from_context ) ) {
			return $from_context;
		}
		return null;
	}

	/**
	 * Unwrap a single RDB result row, extracting plain values from
	 * {name, type, value} wrappers.
	 *
	 * @param array $result A single result's field map.
	 * @return array<string, mixed> Plain key => value pairs.
	 */
	private function unwrap_result_row( array $result ): array {
		$row = array();
		foreach ( $result as $key => $cell ) {
			$value = ( is_array( $cell ) && array_key_exists( 'value', $cell ) )
				? $cell['value']
				: $cell;
			if ( is_array( $value ) || is_object( $value ) ) {
				$value = wp_json_encode( $value );
			}
			$row[ (string) $key ] = $value;
		}
		return $row;
	}

	/**
	 * Group RDB list results by their `sheet` field, returning per-sheet
	 * columns and rows with only non-empty columns retained.
	 *
	 * Falls back to a single group keyed "default" when results lack a
	 * `sheet` field.
	 *
	 * @param array $results The remoteData.results array.
	 * @return array<string, array{ columns: string[], rows: array<int, array<string, mixed>> }>
	 */
	private function group_remote_results_by_sheet( array $results ): array {
		$groups = array();

		foreach ( $results as $item ) {
			if ( ! isset( $item['result'] ) || ! is_array( $item['result'] ) ) {
				continue;
			}

			$row        = $this->unwrap_result_row( $item['result'] );
			$sheet_name = $row['sheet'] ?? 'default';
			unset( $row['sheet'] );

			if ( ! isset( $groups[ $sheet_name ] ) ) {
				$groups[ $sheet_name ] = array();
			}
			$groups[ $sheet_name ][] = $row;
		}

		$sheets = array();
		foreach ( $groups as $sheet_name => $rows ) {
			$non_empty_keys = array();
			foreach ( $rows as $row ) {
				foreach ( $row as $key => $value ) {
					if ( '' !== $value && null !== $value ) {
						$non_empty_keys[ $key ] = true;
					}
				}
			}

			$columns     = array_keys( $non_empty_keys );
			$clean_rows  = array();
			foreach ( $rows as $row ) {
				$clean_rows[] = array_intersect_key( $row, $non_empty_keys );
			}

			$sheets[ $sheet_name ] = array(
				'columns' => $columns,
				'rows'    => $clean_rows,
			);
		}

		return $sheets;
	}

	/**
	 * Normalize csvTable attribute to columns/rows lists.
	 *
	 * @param mixed $csv_table Attribute value.
	 * @return array{ columns: string[], rows: array<int, array<string, mixed>> }
	 */
	private function normalize_csv_table( $csv_table ): array {
		if ( ! is_array( $csv_table ) ) {
			return array(
				'columns' => array(),
				'rows'    => array(),
			);
		}
		$columns = isset( $csv_table['columns'] ) && is_array( $csv_table['columns'] )
			? array_map( 'strval', $csv_table['columns'] )
			: array();
		$rows    = isset( $csv_table['rows'] ) && is_array( $csv_table['rows'] )
			? $csv_table['rows']
			: array();
		return array(
			'columns' => $columns,
			'rows'    => $rows,
		);
	}

	/**
	 * Normalize jsonTable attribute to columns/rows lists.
	 *
	 * Shares the same stored shape as csvTable, so delegates to normalize_csv_table.
	 *
	 * @param mixed $json_table Attribute value.
	 * @return array{ columns: string[], rows: array<int, array<string, mixed>> }
	 */
	private function normalize_json_table( $json_table ): array {
		return $this->normalize_csv_table( $json_table );
	}

	/**
	 * Normalize multi-sheet jsonTable attribute (nested-group JSON).
	 *
	 * @param mixed $json_table Attribute value.
	 * @return array<string, array{ columns: string[], rows: array<int, array<string, mixed>> }>|null Normalized sheets or null when not multi-sheet.
	 */
	private function normalize_json_multi_sheet( $json_table ): ?array {
		if ( ! is_array( $json_table ) || ! isset( $json_table['sheets'] ) || ! is_array( $json_table['sheets'] ) ) {
			return null;
		}

		$sheets = array();
		foreach ( $json_table['sheets'] as $sheet_name => $sheet ) {
			if ( ! is_array( $sheet ) ) {
				continue;
			}
			$normalized = $this->normalize_csv_table( $sheet );
			if ( ! empty( $normalized['columns'] ) || ! empty( $normalized['rows'] ) ) {
				$sheets[ (string) $sheet_name ] = $normalized;
			}
		}

		if ( empty( $sheets ) ) {
			return null;
		}

		return $sheets;
	}

	/**
	 * Remove hidden columns from a sheet's columns and rows.
	 *
	 * @param array    $sheet  { columns: string[], rows: array[] }.
	 * @param string[] $hidden Column names to exclude.
	 * @return array Filtered sheet.
	 */
	private function filter_hidden_columns( array $sheet, array $hidden ): array {
		if ( empty( $hidden ) ) {
			return $sheet;
		}
		$flip    = array_flip( $hidden );
		$columns = array_values( array_filter(
			$sheet['columns'],
			fn( $col ) => ! isset( $flip[ $col ] )
		) );
		return array( 'columns' => $columns, 'rows' => $sheet['rows'] );
	}

	/**
	 * Reorder visible columns using editor columnOrder (keys only). Unknown keys are ignored;
	 * columns missing from order are appended in their original order.
	 *
	 * @param array    $sheet { columns: string[], rows: array[] }.
	 * @param string[] $order Preferred column key order.
	 * @return array Sheet with reordered columns; rows unchanged (cells keyed by column).
	 */
	private function apply_column_order( array $sheet, array $order ): array {
		if ( empty( $order ) ) {
			return $sheet;
		}
		$columns = isset( $sheet['columns'] ) && is_array( $sheet['columns'] )
			? $sheet['columns']
			: array();
		$ordered = array();
		foreach ( $order as $key ) {
			$key = (string) $key;
			if ( in_array( $key, $columns, true ) ) {
				$ordered[] = $key;
			}
		}
		foreach ( $columns as $col ) {
			if ( ! in_array( $col, $ordered, true ) ) {
				$ordered[] = $col;
			}
		}
		return array(
			'columns' => $ordered,
			'rows'    => $sheet['rows'],
		);
	}

	/**
	 * Parse a table cell value for numeric descending auto column sort.
	 *
	 * Mirrors {@see parseNumericCell} in edit-utils.js.
	 *
	 * @param mixed $value Cell value.
	 * @return float|null Parsed number, or null when not numeric.
	 */
	private function parse_numeric_cell( $value ): ?float {
		if ( null === $value || '' === $value ) {
			return null;
		}

		$str     = trim( (string) $value );
		$cleaned = preg_replace( '/^[^0-9.\-+]+/', '', $str );
		if ( null === $cleaned || '' === $cleaned || ! is_numeric( $cleaned ) ) {
			return null;
		}

		$num = (float) $cleaned;
		return is_finite( $num ) ? $num : null;
	}

	/**
	 * Resolve the auto-sort reference row by variable value, with index fallback.
	 *
	 * Mirrors {@see resolveAutoSortRowIndex} in edit-utils.js.
	 *
	 * @param array  $rows       Sheet rows.
	 * @param string $variable   Column key used to identify the row.
	 * @param string $row_value  Saved cell value for the selected row.
	 * @param int    $row_index  Saved zero-based row index fallback.
	 * @return int|null Resolved row index, or null when unavailable.
	 */
	private function resolve_auto_sort_row_index( array $rows, string $variable, string $row_value, int $row_index ): ?int {
		if ( '' !== $variable && '' !== $row_value ) {
			foreach ( $rows as $index => $row ) {
				if ( ! is_array( $row ) ) {
					continue;
				}
				$cell = $row[ $variable ] ?? '';
				if ( (string) $cell === $row_value ) {
					return (int) $index;
				}
			}
		}

		if ( $row_index >= 0 && isset( $rows[ $row_index ] ) && is_array( $rows[ $row_index ] ) ) {
			return $row_index;
		}

		return null;
	}

	/**
	 * Order visible, non-excluded columns by numeric values in the selected row (descending).
	 *
	 * Mirrors {@see computeAutoSortOrder} in edit-utils.js.
	 *
	 * @param array    $rows       Sheet rows.
	 * @param int      $row_index  Target row index.
	 * @param string[] $columns    Visible column keys.
	 * @param string[] $excluded   Columns excluded from auto sort.
	 * @return string[] Sorted column keys.
	 */
	private function compute_auto_sort_order( array $rows, int $row_index, array $columns, array $excluded ): array {
		if ( ! isset( $rows[ $row_index ] ) || ! is_array( $rows[ $row_index ] ) ) {
			return array();
		}

		$row           = $rows[ $row_index ];
		$excluded_flip = array_flip( array_map( 'strval', $excluded ) );
		$sortable      = array();

		foreach ( $columns as $original_index => $col ) {
			$col = (string) $col;
			if ( 'row_id' === $col || isset( $excluded_flip[ $col ] ) ) {
				continue;
			}

			$sortable[] = array(
				'col'            => $col,
				'original_index' => (int) $original_index,
				'num'            => $this->parse_numeric_cell( $row[ $col ] ?? null ),
			);
		}

		usort(
			$sortable,
			function ( array $a, array $b ): int {
				$a_nan = null === $a['num'];
				$b_nan = null === $b['num'];
				if ( $a_nan && $b_nan ) {
					return $a['original_index'] <=> $b['original_index'];
				}
				if ( $a_nan ) {
					return 1;
				}
				if ( $b_nan ) {
					return -1;
				}
				if ( $b['num'] !== $a['num'] ) {
					return $b['num'] <=> $a['num'];
				}
				return $a['original_index'] <=> $b['original_index'];
			}
		);

		return array_map(
			static function ( array $item ): string {
				return $item['col'];
			},
			$sortable
		);
	}

	/**
	 * Split excluded columns into before/after groups relative to the auto-sorted block.
	 *
	 * Mirrors {@see getExcludedSides} in edit-utils.js.
	 *
	 * @param string[] $column_order Saved order.
	 * @param string[] $excluded     Excluded column keys.
	 * @param string[] $visible      Visible column keys.
	 * @param string[] $auto_order   Locked auto-sorted column keys.
	 * @return array{ before: string[], after: string[] } Excluded columns by side.
	 */
	private function get_excluded_sides( array $column_order, array $excluded, array $visible, array $auto_order ): array {
		$excluded_flip    = array_flip( array_map( 'strval', $excluded ) );
		$auto_flip        = array_flip( array_map( 'strval', $auto_order ) );
		$excluded_visible = array_values(
			array_filter(
				$visible,
				static function ( $col ) use ( $excluded_flip ): bool {
					return isset( $excluded_flip[ (string) $col ] );
				}
			)
		);
		$before           = array();
		$after            = array();
		$placed           = array();
		$seen_auto        = false;

		foreach ( $column_order as $col ) {
			$col = (string) $col;
			if ( isset( $auto_flip[ $col ] ) ) {
				$seen_auto = true;
				continue;
			}
			if ( ! isset( $excluded_flip[ $col ] ) || isset( $placed[ $col ] ) ) {
				continue;
			}
			if ( $seen_auto ) {
				$after[] = $col;
			} else {
				$before[] = $col;
			}
			$placed[ $col ] = true;
		}

		foreach ( $excluded_visible as $col ) {
			$col = (string) $col;
			if ( ! isset( $placed[ $col ] ) ) {
				$before[] = $col;
			}
		}

		return array(
			'before' => $before,
			'after'  => $after,
		);
	}

	/**
	 * Merge excluded (manual) and auto-sorted column groups.
	 *
	 * Mirrors {@see buildAutoColumnOrder} in edit-utils.js.
	 *
	 * @param string[] $before_order Excluded columns before auto sort.
	 * @param string[] $auto_order   Locked auto-sorted columns.
	 * @param string[] $after_order  Excluded columns after auto sort.
	 * @return string[] Full column order.
	 */
	private function build_auto_column_order( array $before_order, array $auto_order, array $after_order ): array {
		return array_merge( $before_order, $auto_order, $after_order );
	}

	/**
	 * Compute auto column order from the active sheet and auto-sort attributes.
	 *
	 * @param array    $attributes          Block attributes.
	 * @param array    $sheet               Active sheet with filtered columns/rows.
	 * @param string[] $saved_column_order  Saved attribute order used for excluded columns.
	 * @param string   $variable_key        Attribute key for the row-label column.
	 * @param string   $row_value_key       Attribute key for the saved row cell value.
	 * @param string   $row_index_key       Attribute key for the saved row index.
	 * @param string   $excluded_key        Attribute key for excluded columns.
	 * @return string[] Effective column order, or the saved order when auto sort cannot run.
	 */
	private function compute_auto_column_order_from_sheet(
		array $attributes,
		array $sheet,
		array $saved_column_order,
		string $variable_key,
		string $row_value_key,
		string $row_index_key,
		string $excluded_key
	): array {
		$variable = isset( $attributes[ $variable_key ] )
			? sanitize_text_field( (string) $attributes[ $variable_key ] )
			: '';
		$row_value = isset( $attributes[ $row_value_key ] )
			? (string) $attributes[ $row_value_key ]
			: '';
		$row_index = isset( $attributes[ $row_index_key ] )
			? (int) $attributes[ $row_index_key ]
			: -1;
		$excluded  = isset( $attributes[ $excluded_key ] ) && is_array( $attributes[ $excluded_key ] )
			? array_values( array_map( 'strval', $attributes[ $excluded_key ] ) )
			: array();

		$columns = isset( $sheet['columns'] ) && is_array( $sheet['columns'] )
			? array_map( 'strval', $sheet['columns'] )
			: array();
		$rows    = isset( $sheet['rows'] ) && is_array( $sheet['rows'] )
			? $sheet['rows']
			: array();

		if ( empty( $columns ) || empty( $rows ) ) {
			return $saved_column_order;
		}

		$resolved_index = $this->resolve_auto_sort_row_index( $rows, $variable, $row_value, $row_index );
		if ( null === $resolved_index ) {
			return $saved_column_order;
		}

		$auto_sorted = $this->compute_auto_sort_order( $rows, $resolved_index, $columns, $excluded );
		$sides       = $this->get_excluded_sides( $saved_column_order, $excluded, $columns, $auto_sorted );

		return $this->build_auto_column_order( $sides['before'], $auto_sorted, $sides['after'] );
	}

	/**
	 * Re-apply auto column order to every sheet when sort mode is `auto`.
	 *
	 * @param array<string, array{ columns: string[], rows: array }> $sheets              Processed sheets.
	 * @param array                                                  $attributes          Block attributes.
	 * @param string                                                 $active_sheet        Active sheet key.
	 * @param string[]                                               $saved_column_order  Saved desktop column order.
	 * @return array{0: array<string, array{ columns: string[], rows: array }>, 1: string[]} Updated sheets and effective order.
	 */
	private function apply_auto_column_order_to_sheets( array $sheets, array $attributes, string $active_sheet, array $saved_column_order ): array {
		$sort_mode = isset( $attributes['columnSortMode'] )
			? sanitize_text_field( (string) $attributes['columnSortMode'] )
			: 'custom';

		if ( 'auto' !== $sort_mode || ! isset( $sheets[ $active_sheet ] ) ) {
			return array( $sheets, $saved_column_order );
		}

		$effective_order = $this->compute_auto_column_order_from_sheet(
			$attributes,
			$sheets[ $active_sheet ],
			$saved_column_order,
			'autoSortVariable',
			'autoSortRowValue',
			'autoSortRowIndex',
			'autoSortExcludedColumns'
		);

		foreach ( $sheets as $sheet_name => $sheet ) {
			$sheets[ $sheet_name ] = $this->apply_column_order( $sheet, $effective_order );
		}

		return array( $sheets, $effective_order );
	}

	/**
	 * Recompute mobile auto column order from the active sheet when sort mode is `auto`.
	 *
	 * @param array    $attributes             Block attributes.
	 * @param array    $active_sheet_data      Active sheet with filtered columns/rows.
	 * @param string[] $saved_mobile_col_order Saved mobile column order attribute.
	 * @return string[] Effective mobile column order.
	 */
	private function resolve_mobile_auto_column_order( array $attributes, array $active_sheet_data, array $saved_mobile_col_order ): array {
		$sort_mode = isset( $attributes['mobileColumnSortMode'] )
			? sanitize_text_field( (string) $attributes['mobileColumnSortMode'] )
			: 'inherit';

		if ( 'auto' !== $sort_mode ) {
			return $saved_mobile_col_order;
		}

		return $this->compute_auto_column_order_from_sheet(
			$attributes,
			$active_sheet_data,
			$saved_mobile_col_order,
			'mobileAutoSortVariable',
			'mobileAutoSortRowValue',
			'mobileAutoSortRowIndex',
			'mobileAutoSortExcludedColumns'
		);
	}

	/**
	 * Back-compat: derive global prefix/suffix + exclusions from columnValueFormats.
	 *
	 * @param array  $formats      Legacy columnValueFormats attribute.
	 * @param array  $sheets       Normalized sheets.
	 * @param string $active_sheet Active sheet key.
	 * @return array{ prefix: string, suffix: string, excluded: string[] }
	 */
	private function resolve_legacy_column_value_formats( array $formats, array $sheets, string $active_sheet ): array {
		$entries = array();
		foreach ( $formats as $column => $format ) {
			if ( ! is_array( $format ) ) {
				continue;
			}
			$entries[ (string) $column ] = array(
				'prefix' => isset( $format['prefix'] ) ? (string) $format['prefix'] : '',
				'suffix' => isset( $format['suffix'] ) ? (string) $format['suffix'] : '',
			);
		}

		if ( empty( $entries ) ) {
			return array(
				'prefix'   => '',
				'suffix'   => '',
				'excluded' => array(),
			);
		}

		$first       = reset( $entries );
		$prefix      = $first['prefix'];
		$suffix      = $first['suffix'];
		$excluded    = array();
		foreach ( $entries as $column => $format ) {
			if ( $format['prefix'] !== $prefix || $format['suffix'] !== $suffix ) {
				$excluded[] = $column;
			}
		}

		$columns = $sheets[ $active_sheet ]['columns'] ?? array();
		if ( is_array( $columns ) ) {
			foreach ( $columns as $column ) {
				$column = (string) $column;
				if ( 'row_id' === $column || isset( $entries[ $column ] ) ) {
					continue;
				}
				$excluded[] = $column;
			}
		}

		return array(
			'prefix'   => $prefix,
			'suffix'   => $suffix,
			'excluded' => array_values( array_unique( $excluded ) ),
		);
	}

	/**
	 * Collect default sheet/column filters from nested data-table-filter blocks.
	 *
	 * Walks descendants (e.g. data-table-filter-select, core/group) so nested
	 * isDefault filters reach the controller interactivity state.
	 *
	 * @param \WP_Block $block Controller block instance.
	 * @return array{ columnFilters: array<string, array{ value: string, exclude: bool, match?: string }>, activeSheet: string|null }
	 */
	private function collect_default_table_filters( WP_Block $block ): array {
		$column_filters = array();
		$active_sheet   = null;

		$this->accumulate_default_table_filters( $block->inner_blocks, $column_filters, $active_sheet );

		return array(
			'columnFilters' => $column_filters,
			'activeSheet'   => $active_sheet,
		);
	}

	/**
	 * Recursively accumulate default filters from a list of blocks.
	 *
	 * @param \WP_Block_List|array|null $blocks         Blocks to inspect.
	 * @param array                     $column_filters Column filter accumulator.
	 * @param string|null               $active_sheet   Active sheet accumulator.
	 */
	private function accumulate_default_table_filters( $blocks, array &$column_filters, ?string &$active_sheet ): void {
		if ( empty( $blocks ) ) {
			return;
		}

		foreach ( $blocks as $inner ) {
			if ( ! $inner instanceof WP_Block ) {
				continue;
			}

			if ( 'prc-block/data-table-filter' === $inner->name ) {
				$this->apply_default_filter_attributes(
					$inner->attributes,
					$column_filters,
					$active_sheet
				);
				continue;
			}

			if ( 'prc-block/data-table-filter-select' === $inner->name ) {
				// Resolve select defaults here (defaultValue wins over isDefault),
				// matching filter-select/render.php. Do not recurse into its
				// children or isDefault would overwrite defaultValue.
				$this->accumulate_filter_select_default(
					$inner,
					$column_filters,
					$active_sheet
				);
				continue;
			}

			if ( ! empty( $inner->inner_blocks ) ) {
				$this->accumulate_default_table_filters( $inner->inner_blocks, $column_filters, $active_sheet );
			}
		}
	}

	/**
	 * Apply one filter block's default attributes into the accumulator.
	 *
	 * @param array       $attrs          Filter block attributes.
	 * @param array       $column_filters Column filter accumulator.
	 * @param string|null $active_sheet   Active sheet accumulator.
	 * @param bool        $require_default Whether isDefault must be set.
	 */
	private function apply_default_filter_attributes(
		array $attrs,
		array &$column_filters,
		?string &$active_sheet,
		bool $require_default = true
	): void {
		if ( $require_default && empty( $attrs['isDefault'] ) ) {
			return;
		}

		$filter_value = isset( $attrs['value'] ) ? (string) $attrs['value'] : '';
		if ( '' === $filter_value ) {
			return;
		}

		$filter_type = isset( $attrs['filterType'] ) ? (string) $attrs['filterType'] : 'sheet';

		if ( 'sheet' === $filter_type ) {
			$active_sheet = $filter_value;
			return;
		}

		$is_column_filter = in_array(
			$filter_type,
			array( 'column', 'column-include', 'column-include-only', 'column-exclude', 'column-exclude-begins-with' ),
			true
		);
		if ( ! $is_column_filter || 'column-include' === $filter_type ) {
			return;
		}

		$filter_column = isset( $attrs['filterColumn'] ) ? (string) $attrs['filterColumn'] : '';
		if ( '' === $filter_column ) {
			return;
		}

		$column_filter = array(
			'value'   => $filter_value,
			'exclude' => in_array( $filter_type, array( 'column-exclude', 'column-exclude-begins-with' ), true ),
		);
		if ( 'column-exclude-begins-with' === $filter_type ) {
			$column_filter['match'] = 'beginsWith';
		}

		$column_filters[ $filter_column ] = $column_filter;
	}

	/**
	 * Collect defaults from a filter-select via defaultValue or nested isDefault.
	 *
	 * Mirrors filter-select/render.php: defaultValue wins; otherwise first
	 * nested filter with isDefault.
	 *
	 * @param \WP_Block   $select_block   Filter select block.
	 * @param array       $column_filters Column filter accumulator.
	 * @param string|null $active_sheet   Active sheet accumulator.
	 */
	private function accumulate_filter_select_default(
		WP_Block $select_block,
		array &$column_filters,
		?string &$active_sheet
	): void {
		if ( empty( $select_block->inner_blocks ) ) {
			return;
		}

		$default_value = isset( $select_block->attributes['defaultValue'] )
			? (string) $select_block->attributes['defaultValue']
			: '';

		$fallback_attrs = null;

		foreach ( $select_block->inner_blocks as $inner ) {
			if ( ! $inner instanceof WP_Block || 'prc-block/data-table-filter' !== $inner->name ) {
				continue;
			}

			$value = isset( $inner->attributes['value'] ) ? (string) $inner->attributes['value'] : '';
			if ( '' === $value ) {
				continue;
			}

			if ( '' !== $default_value && $value === $default_value ) {
				$this->apply_default_filter_attributes(
					$inner->attributes,
					$column_filters,
					$active_sheet,
					false
				);
				return;
			}

			if ( null === $fallback_attrs && ! empty( $inner->attributes['isDefault'] ) ) {
				$fallback_attrs = $inner->attributes;
			}
		}

		if ( '' === $default_value && null !== $fallback_attrs ) {
			$this->apply_default_filter_attributes(
				$fallback_attrs,
				$column_filters,
				$active_sheet,
				false
			);
		}
	}

	/**
	 * Sanitize a display-only replacement string while preserving literal "<".
	 *
	 * sanitize_text_field() entity-encodes lone less-than signs (e.g. "<1" becomes
	 * "&lt;1"), which breaks common statistical notation. Output is rendered via
	 * textContent on the client, so HTML tags are not interpreted.
	 *
	 * @param string $value Raw replacement text.
	 * @return string
	 */
	private function sanitize_display_replacement_string( string $value ): string {
		$value = wp_check_invalid_utf8( $value );
		// Decode entities from values saved before replacement sanitization was fixed.
		$value = wp_specialchars_decode( $value, ENT_QUOTES );

		return trim( $value );
	}

	/**
	 * Sanitize valueFormatRules block attribute for interactivity state.
	 *
	 * @param mixed $rules Raw attribute value.
	 * @return array<int, array<string, mixed>>
	 */
	private function sanitize_value_format_rules( $rules ): array {
		if ( ! is_array( $rules ) ) {
			return array();
		}

		$allowed_types     = array( 'replace', 'round', 'precision', 'commas' );
		$allowed_operators = array( 'lt', 'lte', 'gt', 'gte', 'eq', 'between' );
		$sanitized         = array();

		foreach ( $rules as $rule ) {
			if ( ! is_array( $rule ) ) {
				continue;
			}

			$type = isset( $rule['type'] ) ? (string) $rule['type'] : '';
			if ( ! in_array( $type, $allowed_types, true ) ) {
				continue;
			}

			$sheets  = isset( $rule['sheets'] ) && is_array( $rule['sheets'] )
				? array_values( array_map( 'strval', $rule['sheets'] ) )
				: array();
			$columns = isset( $rule['columns'] ) && is_array( $rule['columns'] )
				? array_values( array_map( 'strval', $rule['columns'] ) )
				: array();

			$entry = array(
				'id'      => isset( $rule['id'] ) ? sanitize_text_field( (string) $rule['id'] ) : '',
				'type'    => $type,
				'sheets'  => $sheets,
				'columns' => $columns,
			);

			if ( 'replace' === $type ) {
				$operator = isset( $rule['operator'] ) ? (string) $rule['operator'] : 'lt';
				if ( ! in_array( $operator, $allowed_operators, true ) ) {
					$operator = 'lt';
				}
				$entry['operator']    = $operator;
				$entry['threshold']   = isset( $rule['threshold'] ) ? (float) $rule['threshold'] : 0.0;
				$entry['thresholdMax'] = isset( $rule['thresholdMax'] ) ? (float) $rule['thresholdMax'] : 0.0;
				$entry['replacement'] = isset( $rule['replacement'] )
					? $this->sanitize_display_replacement_string( (string) $rule['replacement'] )
					: '';
			} elseif ( 'round' === $type ) {
				$nearest = isset( $rule['nearest'] ) ? (float) $rule['nearest'] : 0.0;
				if ( $nearest <= 0 ) {
					continue;
				}
				$entry['nearest'] = $nearest;
			} elseif ( 'precision' === $type ) {
				$decimals = isset( $rule['decimals'] ) ? (int) $rule['decimals'] : 0;
				if ( $decimals < 0 ) {
					$decimals = 0;
				}
				$entry['decimals'] = $decimals;
			}
			// 'commas' uses shared id/type/sheets/columns only.

			$sanitized[] = $entry;
		}

		return $sanitized;
	}

	/**
	 * Sanitize mobileValueFormatRules block attribute for interactivity state.
	 *
	 * @param mixed $rules Raw attribute value.
	 * @return array<int, array<string, mixed>>
	 */
	private function sanitize_mobile_value_format_rules( $rules ): array {
		if ( ! is_array( $rules ) ) {
			return array();
		}

		$allowed_groups    = array( 'K', 'M', 'B', 'T' );
		$allowed_operators = array( 'lt', 'lte', 'gt', 'gte', 'eq', 'between' );
		$sanitized         = array();

		foreach ( $rules as $rule ) {
			if ( ! is_array( $rule ) ) {
				continue;
			}

			$type = isset( $rule['type'] ) ? (string) $rule['type'] : '';
			if ( ! in_array( $type, array( 'abbrev', 'replace' ), true ) ) {
				continue;
			}

			$sheets  = isset( $rule['sheets'] ) && is_array( $rule['sheets'] )
				? array_values( array_map( 'strval', $rule['sheets'] ) )
				: array();
			$columns = isset( $rule['columns'] ) && is_array( $rule['columns'] )
				? array_values( array_map( 'strval', $rule['columns'] ) )
				: array();

			$entry = array(
				'id'      => isset( $rule['id'] ) ? sanitize_text_field( (string) $rule['id'] ) : '',
				'type'    => $type,
				'sheets'  => $sheets,
				'columns' => $columns,
			);

			if ( 'replace' === $type ) {
				$operator = isset( $rule['operator'] ) ? (string) $rule['operator'] : 'lt';
				if ( ! in_array( $operator, $allowed_operators, true ) ) {
					$operator = 'lt';
				}
				$entry['operator']     = $operator;
				$entry['threshold']    = isset( $rule['threshold'] ) ? (float) $rule['threshold'] : 0.0;
				$entry['thresholdMax'] = isset( $rule['thresholdMax'] ) ? (float) $rule['thresholdMax'] : 0.0;
				$entry['replacement']  = isset( $rule['replacement'] )
					? $this->sanitize_display_replacement_string( (string) $rule['replacement'] )
					: '';
				$sanitized[]           = $entry;
				continue;
			}

			$groups_raw = isset( $rule['groups'] ) && is_array( $rule['groups'] )
				? $rule['groups']
				: array();
			$groups     = array();
			foreach ( $allowed_groups as $group_key ) {
				$group_entry = isset( $groups_raw[ $group_key ] ) && is_array( $groups_raw[ $group_key ] )
					? $groups_raw[ $group_key ]
					: array();
				$decimals    = isset( $group_entry['decimals'] ) ? (int) $group_entry['decimals'] : 1;
				if ( $decimals < 0 ) {
					$decimals = 0;
				}
				$significant = isset( $group_entry['significantDigits'] ) ? (int) $group_entry['significantDigits'] : 2;
				if ( $significant < 1 ) {
					$significant = 1;
				}
				$groups[ $group_key ] = array(
					'decimals'          => $decimals,
					'significantDigits' => $significant,
				);
			}

			$entry['groups'] = $groups;
			$sanitized[]     = $entry;
		}

		return $sanitized;
	}

	/**
	 * Sanitize mobileColumnColors block attribute for interactivity state.
	 *
	 * @param mixed $colors Raw attribute value.
	 * @return array<string, string>
	 */
	private function sanitize_mobile_column_colors( $colors ): array {
		if ( ! is_array( $colors ) ) {
			return array();
		}

		$sanitized = array();
		foreach ( $colors as $column => $color ) {
			$safe_column = sanitize_text_field( (string) $column );
			$safe_color  = is_string( $color ) ? $this->sanitize_hex_color_with_alpha( $color ) : '';
			if ( '' !== $safe_column && $safe_color ) {
				$sanitized[ $safe_column ] = $safe_color;
			}
		}

		return $sanitized;
	}

	/**
	 * Sanitize mobileColumnHeaders block attribute for interactivity state.
	 *
	 * @param mixed $headers Raw attribute value.
	 * @return array<string, string>
	 */
	private function sanitize_mobile_column_headers( $headers ): array {
		if ( ! is_array( $headers ) ) {
			return array();
		}

		$sanitized = array();
		foreach ( $headers as $column => $label ) {
			$safe_column = sanitize_text_field( (string) $column );
			$safe_label  = is_string( $label ) ? sanitize_text_field( trim( $label ) ) : '';
			if ( '' !== $safe_column && '' !== $safe_label ) {
				$sanitized[ $safe_column ] = $safe_label;
			}
		}

		return $sanitized;
	}

	/**
	 * Sanitize a hex color, including 8-digit alpha values.
	 *
	 * @param string $color Raw color value.
	 * @return string Sanitized hex color or empty string.
	 */
	private function sanitize_hex_color_with_alpha( string $color ): string {
		$color = trim( $color );
		if ( '' === $color ) {
			return '';
		}

		if ( preg_match( '/^#([A-Fa-f0-9]{3,4}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/', $color ) ) {
			return strtolower( $color );
		}

		return '';
	}

	/**
	 * Sanitize headerSpecialBorderColors block attribute for interactivity state.
	 *
	 * @param mixed $colors Raw attribute value.
	 * @return array<string, string>
	 */
	private function sanitize_header_special_border_colors( $colors ): array {
		if ( ! is_array( $colors ) ) {
			return array();
		}

		$sanitized = array();
		foreach ( $colors as $column => $color ) {
			$safe_column = sanitize_text_field( (string) $column );
			$safe_color  = is_string( $color ) ? sanitize_hex_color( $color ) : '';
			if ( '' !== $safe_column && $safe_color ) {
				$sanitized[ $safe_column ] = $safe_color;
			}
		}

		return $sanitized;
	}

	/**
	 * Sanitize tableTextAlign block attribute for interactivity state.
	 *
	 * @param mixed $align Raw attribute value.
	 * @return string One of left, center, right; defaults to center.
	 */
	private function sanitize_table_text_align( $align ): string {
		$safe_align = sanitize_text_field( (string) $align );
		if ( in_array( $safe_align, array( 'left', 'center', 'right' ), true ) ) {
			return $safe_align;
		}

		return 'center';
	}

	/**
	 * Union column keys from row objects, preserving first-seen order.
	 *
	 * @param array<int, array<string, mixed>> $rows Row objects.
	 * @return string[] Column keys.
	 */
	private function derive_columns_from_rows( array $rows ): array {
		$seen    = array();
		$columns = array();
		foreach ( $rows as $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}
			foreach ( array_keys( $row ) as $key ) {
				$key = (string) $key;
				if ( ! isset( $seen[ $key ] ) ) {
					$seen[ $key ] = true;
					$columns[]    = $key;
				}
			}
		}
		return $columns;
	}

	/**
	 * Whether an array is a list of associative arrays (bare array-of-objects).
	 *
	 * @param mixed $value Value to test.
	 * @return bool
	 */
	private function is_list_of_assoc_arrays( $value ): bool {
		if ( ! is_array( $value ) || empty( $value ) ) {
			return false;
		}
		foreach ( $value as $item ) {
			if ( ! is_array( $item ) || array_is_list( $item ) ) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Validate and normalize filter output into canonical sheets.
	 *
	 * @param mixed $sheets Raw sheets map.
	 * @return array<string, array{ columns: string[], rows: array<int, array<string, mixed>> }>
	 */
	private function normalize_sheets_from_filter( $sheets ): array {
		if ( ! is_array( $sheets ) || empty( $sheets ) ) {
			return array();
		}
		$normalized = array();
		foreach ( $sheets as $sheet_name => $sheet ) {
			if ( ! is_array( $sheet ) ) {
				continue;
			}
			$parsed = $this->normalize_csv_table( $sheet );
			if ( ! empty( $parsed['columns'] ) || ! empty( $parsed['rows'] ) ) {
				$normalized[ (string) $sheet_name ] = $parsed;
			}
		}
		return $normalized;
	}

	/**
	 * Normalize arbitrary provider context data into canonical sheets.
	 *
	 * Resolution order:
	 * 1. `prc_platform_data_table_context_data` filter (custom adapter).
	 * 2. Canonical multi-sheet `{ sheets: {...} }`.
	 * 3. Canonical single `{ columns, rows }`.
	 * 4. RDB-like `{ results: [...] }`.
	 * 5. Bare array-of-objects.
	 *
	 * @param mixed          $raw        Raw context value.
	 * @param array          $attributes Block attributes.
	 * @param \WP_Block|null $block      Block instance.
	 * @return array<string, array{ columns: string[], rows: array<int, array<string, mixed>> }>
	 */
	private function normalize_context_data( $raw, array $attributes, ?WP_Block $block ): array {
		if ( ! is_array( $raw ) || empty( $raw ) ) {
			return array();
		}

		$adapted = apply_filters( 'prc_platform_data_table_context_data', null, $raw, $attributes, $block );
		if ( is_array( $adapted ) && ! empty( $adapted ) ) {
			$from_filter = $this->normalize_sheets_from_filter( $adapted );
			if ( ! empty( $from_filter ) ) {
				return $from_filter;
			}
		}

		$multi = $this->normalize_json_multi_sheet( $raw );
		if ( null !== $multi ) {
			return $multi;
		}

		if ( isset( $raw['columns'] ) || isset( $raw['rows'] ) ) {
			return array(
				'default' => $this->normalize_csv_table( $raw ),
			);
		}

		if ( isset( $raw['results'] ) && is_array( $raw['results'] ) ) {
			return $this->group_remote_results_by_sheet( $raw['results'] );
		}

		if ( $this->is_list_of_assoc_arrays( $raw ) ) {
			$columns = $this->derive_columns_from_rows( $raw );
			$rows    = array();
			foreach ( $raw as $row ) {
				$out = array();
				foreach ( $columns as $col ) {
					$val = $row[ $col ] ?? '';
					if ( is_array( $val ) || is_object( $val ) ) {
						$val = wp_json_encode( $val );
					}
					$out[ $col ] = $val;
				}
				$rows[] = $out;
			}
			return array(
				'default' => array(
					'columns' => $columns,
					'rows'    => $rows,
				),
			);
		}

		return array();
	}

	/**
	 * Normalize pivotColumns attribute entries to value/label pairs.
	 *
	 * @param mixed $pivot_columns Raw attribute.
	 * @return array<int, array{ value: string, label: string }>
	 */
	private function normalize_pivot_columns( $pivot_columns ): array {
		if ( ! is_array( $pivot_columns ) ) {
			return array();
		}
		$normalized = array();
		foreach ( $pivot_columns as $entry ) {
			if ( is_string( $entry ) && '' !== $entry ) {
				$normalized[] = array(
					'value' => $entry,
					'label' => $entry,
				);
				continue;
			}
			if ( ! is_array( $entry ) ) {
				continue;
			}
			$value = isset( $entry['value'] ) ? (string) $entry['value'] : '';
			if ( '' === $value ) {
				continue;
			}
			$label = isset( $entry['label'] ) ? (string) $entry['label'] : $value;
			$normalized[] = array(
				'value' => $value,
				'label' => '' !== $label ? $label : $value,
			);
		}
		return $normalized;
	}

	/**
	 * Normalize pivotValueFields attribute entries to field/label pairs.
	 *
	 * @param mixed $value_fields Raw attribute.
	 * @return array<int, array{ field: string, label: string }>
	 */
	private function normalize_pivot_value_fields( $value_fields ): array {
		if ( ! is_array( $value_fields ) ) {
			return array();
		}
		$normalized = array();
		foreach ( $value_fields as $entry ) {
			if ( is_string( $entry ) && '' !== $entry ) {
				$normalized[] = array(
					'field' => $entry,
					'label' => $entry,
				);
				continue;
			}
			if ( ! is_array( $entry ) ) {
				continue;
			}
			$field = isset( $entry['field'] ) ? (string) $entry['field'] : '';
			if ( '' === $field ) {
				continue;
			}
			$label = isset( $entry['label'] ) ? (string) $entry['label'] : $field;
			$normalized[] = array(
				'field' => $field,
				'label' => '' !== $label ? $label : $field,
			);
		}
		return $normalized;
	}

	/**
	 * Flatten all rows from a sheets map into a single list.
	 *
	 * @param array<string, array{ rows?: array }> $sheets Sheets map.
	 * @return array<int, array<string, mixed>>
	 */
	private function flatten_sheet_rows( array $sheets ): array {
		$rows = array();
		foreach ( $sheets as $sheet ) {
			if ( ! is_array( $sheet ) || ! isset( $sheet['rows'] ) || ! is_array( $sheet['rows'] ) ) {
				continue;
			}
			foreach ( $sheet['rows'] as $row ) {
				if ( is_array( $row ) ) {
					$rows[] = $row;
				}
			}
		}
		return $rows;
	}

	/**
	 * Normalize pivotExtraColumns attribute to unique group-by field names.
	 *
	 * @param mixed  $extra_columns Raw attribute.
	 * @param string $index_column  Row identity field.
	 * @param string $column_field  Field whose values become columns.
	 * @param array  $pivot_columns Normalized pivot column entries.
	 * @param array  $value_fields  Normalized value-field entries.
	 * @return string[]
	 */
	private function normalize_pivot_extra_columns( $extra_columns, string $index_column, string $column_field, array $pivot_columns, array $value_fields = array() ): array {
		if ( ! is_array( $extra_columns ) ) {
			return array();
		}

		$pivot_labels = array();
		foreach ( $pivot_columns as $col ) {
			$pivot_labels[ $col['label'] ] = true;
		}

		$value_field_names = array();
		foreach ( $value_fields as $entry ) {
			$value_field_names[ $entry['field'] ] = true;
		}

		$seen       = array();
		$normalized = array();
		foreach ( $extra_columns as $raw ) {
			$col = is_string( $raw ) ? $raw : (string) $raw;
			if ( '' === $col || isset( $seen[ $col ] ) ) {
				continue;
			}
			if ( $col === $index_column || $col === $column_field ) {
				continue;
			}
			if ( isset( $pivot_labels[ $col ] ) ) {
				continue;
			}
			if ( isset( $value_field_names[ $col ] ) ) {
				continue;
			}
			$seen[ $col ]       = true;
			$normalized[] = $col;
		}

		return $normalized;
	}

	/**
	 * Build a composite row key from identity value and group-by extras.
	 *
	 * @param string               $index_value Identity column value.
	 * @param array<string, mixed> $source      Source row.
	 * @param string[]             $extras      Group-by field names.
	 * @return string Composite key.
	 */
	private function build_pivot_row_key( string $index_value, array $source, array $extras ): string {
		$parts = array( $index_value );
		foreach ( $extras as $extra ) {
			$parts[] = isset( $source[ $extra ] ) ? (string) $source[ $extra ] : '';
		}
		return implode( "\0", $parts );
	}

	/**
	 * Pivot long-format sheets into one wide sheet per value field.
	 *
	 * Mirrors the editor JS pivotSheets() helper: rows are keyed by identity
	 * plus group-by extras; first match wins for duplicate (composite key +
	 * column-value) pairs.
	 *
	 * @param array $sheets     Normalized source sheets.
	 * @param array $attributes Block attributes.
	 * @return array<string, array{ columns: string[], rows: array<int, array<string, mixed>> }>
	 */
	private function apply_pivot( array $sheets, array $attributes ): array {
		if ( empty( $attributes['pivotEnabled'] ) ) {
			return $sheets;
		}

		$index_column = isset( $attributes['pivotIndexColumn'] )
			? (string) $attributes['pivotIndexColumn']
			: '';
		$column_field = isset( $attributes['pivotColumnField'] )
			? (string) $attributes['pivotColumnField']
			: '';
		$pivot_columns = $this->normalize_pivot_columns( $attributes['pivotColumns'] ?? array() );
		$value_fields  = $this->normalize_pivot_value_fields( $attributes['pivotValueFields'] ?? array() );
		$extra_columns = $this->normalize_pivot_extra_columns(
			$attributes['pivotExtraColumns'] ?? array(),
			$index_column,
			$column_field,
			$pivot_columns,
			$value_fields
		);

		if ( '' === $index_column || '' === $column_field || empty( $pivot_columns ) || empty( $value_fields ) ) {
			return $sheets;
		}

		$source_rows = $this->flatten_sheet_rows( $sheets );
		if ( empty( $source_rows ) ) {
			return $sheets;
		}

		$wide_columns = array( $index_column );
		foreach ( $extra_columns as $extra ) {
			$wide_columns[] = $extra;
		}
		foreach ( $pivot_columns as $col ) {
			$wide_columns[] = $col['label'];
		}

		$result         = array();
		$used_sheet_keys = array();

		foreach ( $value_fields as $value_entry ) {
			$field     = $value_entry['field'];
			$sheet_key = $value_entry['label'] !== '' ? $value_entry['label'] : $field;
			if ( isset( $used_sheet_keys[ $sheet_key ] ) ) {
				$suffix = 2;
				while ( isset( $used_sheet_keys[ $sheet_key . ' (' . $suffix . ')' ] ) ) {
					++$suffix;
				}
				$sheet_key = $sheet_key . ' (' . $suffix . ')';
			}
			$used_sheet_keys[ $sheet_key ] = true;

			$index_rows = array();
			foreach ( $source_rows as $source ) {
				$index_raw = $source[ $index_column ] ?? null;
				if ( null === $index_raw || '' === $index_raw ) {
					continue;
				}
				$index_value = (string) $index_raw;

				$col_raw = $source[ $column_field ] ?? null;
				if ( null === $col_raw || '' === $col_raw ) {
					continue;
				}
				$col_value = (string) $col_raw;

				$matched = null;
				foreach ( $pivot_columns as $col ) {
					if ( $col['value'] === $col_value ) {
						$matched = $col;
						break;
					}
				}
				if ( null === $matched ) {
					continue;
				}

				$row_key = $this->build_pivot_row_key( $index_value, $source, $extra_columns );

				if ( ! isset( $index_rows[ $row_key ] ) ) {
					$wide = array( $index_column => $index_value );
					foreach ( $extra_columns as $extra ) {
						$extra_val = $source[ $extra ] ?? '';
						if ( is_array( $extra_val ) || is_object( $extra_val ) ) {
							$extra_val = wp_json_encode( $extra_val );
						}
						$wide[ $extra ] = $extra_val;
					}
					foreach ( $pivot_columns as $col ) {
						$wide[ $col['label'] ] = '';
					}
					$index_rows[ $row_key ] = $wide;
				}

				// First match wins for duplicate (composite key + column-value) pairs.
				if (
					! isset( $index_rows[ $row_key ][ $matched['label'] ] ) ||
					'' === $index_rows[ $row_key ][ $matched['label'] ]
				) {
					$cell = $source[ $field ] ?? '';
					if ( is_array( $cell ) || is_object( $cell ) ) {
						$cell = wp_json_encode( $cell );
					}
					$index_rows[ $row_key ][ $matched['label'] ] = $cell;
				}
			}

			$result[ $sheet_key ] = array(
				'columns' => $wide_columns,
				'rows'    => array_values( $index_rows ),
			);
		}

		return ! empty( $result ) ? $result : $sheets;
	}

	/**
	 * Sanitize hiddenColumnsBySheet block attribute.
	 *
	 * @param mixed $by_sheet Raw attribute value.
	 * @return array<string, string[]>
	 */
	private function sanitize_hidden_columns_by_sheet( $by_sheet ): array {
		if ( ! is_array( $by_sheet ) ) {
			return array();
		}

		$sanitized = array();
		foreach ( $by_sheet as $sheet_name => $columns ) {
			// JSON object keys that look like integers become int array keys in PHP
			// (e.g. year sheets "2020"). Cast like sanitize_mobile_column_colors.
			if ( ! is_array( $columns ) ) {
				continue;
			}

			$safe_sheet = sanitize_text_field( (string) $sheet_name );
			if ( '' === $safe_sheet ) {
				continue;
			}

			$sanitized[ $safe_sheet ] = array_values( array_map( 'strval', $columns ) );
		}

		return $sanitized;
	}

	/**
	 * Resolve global and per-sheet hidden column config from block attributes.
	 *
	 * @param array $attributes Block attributes.
	 * @return array{0: string[], 1: array<string, string[]>}
	 */
	private function get_hidden_column_config( array $attributes ): array {
		$hidden = isset( $attributes['hiddenColumns'] ) && is_array( $attributes['hiddenColumns'] )
			? array_values( array_map( 'strval', $attributes['hiddenColumns'] ) )
			: array();

		$hidden_by_sheet = $this->sanitize_hidden_columns_by_sheet( $attributes['hiddenColumnsBySheet'] ?? array() );

		return array( $hidden, $hidden_by_sheet );
	}

	/**
	 * Resolve initial row-sort state seeded into Interactivity on first load.
	 *
	 * @param array  $attributes            Block attributes.
	 * @param array  $sheets                Processed sheets map.
	 * @param string $active_sheet          Active sheet key.
	 * @param bool   $enable_column_sorting Whether click-to-sort is enabled.
	 * @return array{ sortColumn: string|null, sortDirection: string }
	 */
	private function resolve_initial_sort_state( array $attributes, array $sheets, string $active_sheet, bool $enable_column_sorting ): array {
		if ( ! $enable_column_sorting ) {
			return array(
				'sortColumn'    => null,
				'sortDirection' => 'asc',
			);
		}

		$default_column = isset( $attributes['defaultSortColumn'] )
			? sanitize_text_field( (string) $attributes['defaultSortColumn'] )
			: '';

		if ( '' === $default_column ) {
			return array(
				'sortColumn'    => null,
				'sortDirection' => 'asc',
			);
		}

		$default_direction = isset( $attributes['defaultSortDirection'] )
			? sanitize_text_field( (string) $attributes['defaultSortDirection'] )
			: 'asc';

		if ( ! in_array( $default_direction, array( 'asc', 'desc' ), true ) ) {
			$default_direction = 'asc';
		}

		$active_data = $sheets[ $active_sheet ] ?? null;
		if ( ! is_array( $active_data ) || empty( $active_data['columns'] ) || ! is_array( $active_data['columns'] ) ) {
			return array(
				'sortColumn'    => null,
				'sortDirection' => 'asc',
			);
		}

		$visible_columns = array_map( 'strval', $active_data['columns'] );
		if ( ! in_array( $default_column, $visible_columns, true ) ) {
			return array(
				'sortColumn'    => null,
				'sortDirection' => 'asc',
			);
		}

		return array(
			'sortColumn'    => $default_column,
			'sortDirection' => $default_direction,
		);
	}

	/**
	 * Apply hidden-column filtering and column order to every sheet.
	 *
	 * @param array               $normalized       Normalized sheets.
	 * @param string[]            $hidden           Global hidden column keys.
	 * @param string[]            $col_order        Preferred column order.
	 * @param array<string, string[]> $hidden_by_sheet Per-sheet hidden column keys.
	 * @return array<string, array{ columns: string[], rows: array }>
	 */
	private function filter_and_order_sheets( array $normalized, array $hidden, array $col_order, array $hidden_by_sheet = array() ): array {
		$sheets = array();
		foreach ( $normalized as $sheet_name => $sheet ) {
			// Match sanitizer keying: cast + sanitize so numeric year keys and
			// labels that change under sanitize_text_field still resolve.
			$sheet_key    = sanitize_text_field( (string) $sheet_name );
			$sheet_hidden = array_values(
				array_unique(
					array_merge(
						$hidden,
						$hidden_by_sheet[ $sheet_key ] ?? array()
					)
				)
			);
			$filtered              = $this->filter_hidden_columns( $sheet, $sheet_hidden );
			$sheets[ $sheet_name ] = $this->apply_column_order( $filtered, $col_order );
		}
		return $sheets;
	}

	/**
	 * Build ordered, filtered sheets from raw context-like data.
	 *
	 * Shared by the `context` and `firebase` data-source branches.
	 *
	 * @param mixed          $raw        Raw context / Firebase value.
	 * @param array          $attributes Block attributes.
	 * @param \WP_Block|null $block      Block instance.
	 * @param string[]       $col_order  Preferred column order.
	 * @return array{ sheets: array<string, array{ columns: string[], rows: array }>, activeSheet: string|null }
	 */
	private function build_sheets_from_raw_context( $raw, array $attributes, ?WP_Block $block, array $col_order ): array {
		list( $hidden, $hidden_by_sheet ) = $this->get_hidden_column_config( $attributes );
		$default_sheet = isset( $attributes['defaultJsonSheet'] ) ? (string) $attributes['defaultJsonSheet'] : '';
		$normalized    = $this->normalize_context_data( $raw, $attributes, $block );

		if ( empty( $normalized ) ) {
			return array(
				'sheets'      => array(),
				'activeSheet' => null,
			);
		}

		$normalized = $this->apply_pivot( $normalized, $attributes );
		$sheets     = $this->filter_and_order_sheets( $normalized, $hidden, $col_order, $hidden_by_sheet );

		$active_sheet = ( '' !== $default_sheet && isset( $sheets[ $default_sheet ] ) )
			? $default_sheet
			: array_key_first( $sheets );

		return array(
			'sheets'      => $sheets,
			'activeSheet' => $active_sheet,
		);
	}

	/**
	 * Render callback
	 *
	 * @param array    $attributes Block attributes.
	 * @param string   $content    Inner blocks HTML.
	 * @param \WP_Block $block      Block instance.
	 * @return string
	 */
	public function render_block_callback( $attributes, $content, $block ) {
		$data_source = isset( $attributes['dataSource'] ) ? (string) $attributes['dataSource'] : 'csv';
		$instance_id = isset( $attributes['dataTableInstanceId'] ) ? (string) $attributes['dataTableInstanceId'] : '';
		$sheets = array();
		$activeSheet = 'default';
		$col_order = isset( $attributes['columnOrder'] ) && is_array( $attributes['columnOrder'] )
			? array_map( 'strval', $attributes['columnOrder'] )
			: array();

		if ( 'remote' === $data_source ) {
			$remote = $block->context['remote-data-blocks/remoteData'] ?? null;
			if ( is_array( $remote ) ) {
				$results = isset( $remote['results'] ) && is_array( $remote['results'] ) ? $remote['results'] : array();
				$sheets  = $this->group_remote_results_by_sheet( $results );
				$activeSheet = array_key_first( $sheets );
			}
		} elseif ( 'context' === $data_source ) {
			$raw    = $block->context['prc-block/dataTableData'] ?? null;
			$built  = $this->build_sheets_from_raw_context( $raw, $attributes, $block, $col_order );
			$sheets = $built['sheets'];
			if ( null !== $built['activeSheet'] ) {
				$activeSheet = $built['activeSheet'];
			}
		} elseif ( 'firebase' === $data_source ) {
			$firebase_path = isset( $attributes['firebasePath'] ) ? (string) $attributes['firebasePath'] : '';
			$firebase_path = is_string( $firebase_path ) ? ltrim( trim( $firebase_path ), '/' ) : '';

			if ( '' === $firebase_path ) {
				// Legacy posts that used dataSource=firebase without a path fall back to CSV.
				list( $hidden, $hidden_by_sheet ) = $this->get_hidden_column_config( $attributes );
				$normalized = array(
					'default' => $this->normalize_csv_table( $attributes['csvTable'] ?? null ),
				);
				$normalized    = $this->apply_pivot( $normalized, $attributes );
				$sheets        = $this->filter_and_order_sheets( $normalized, $hidden, $col_order, $hidden_by_sheet );
				$default_sheet = isset( $attributes['defaultJsonSheet'] ) ? (string) $attributes['defaultJsonSheet'] : '';
				$activeSheet   = ( '' !== $default_sheet && isset( $sheets[ $default_sheet ] ) )
					? $default_sheet
					: array_key_first( $sheets );
				if ( null === $activeSheet ) {
					$activeSheet = 'default';
				}
			} else {
				$raw = $this->fetch_firebase_path( $firebase_path );
				if ( ! is_wp_error( $raw ) && null !== $raw ) {
					$built  = $this->build_sheets_from_raw_context( $raw, $attributes, $block, $col_order );
					$sheets = $built['sheets'];
					if ( null !== $built['activeSheet'] ) {
						$activeSheet = $built['activeSheet'];
					}
				}
			}
		} elseif ( 'json' === $data_source ) {
			$json_table = $attributes['jsonTable'] ?? null;
			list( $hidden, $hidden_by_sheet ) = $this->get_hidden_column_config( $attributes );
			$default_sheet = isset( $attributes['defaultJsonSheet'] ) ? (string) $attributes['defaultJsonSheet'] : '';
			$multi_sheets  = $this->normalize_json_multi_sheet( $json_table );

			if ( null !== $multi_sheets ) {
				$normalized = $multi_sheets;
			} else {
				$normalized = array(
					'default' => $this->normalize_json_table( $json_table ),
				);
			}

			$normalized = $this->apply_pivot( $normalized, $attributes );
			$sheets     = $this->filter_and_order_sheets( $normalized, $hidden, $col_order, $hidden_by_sheet );
			$activeSheet = ( '' !== $default_sheet && isset( $sheets[ $default_sheet ] ) )
				? $default_sheet
				: array_key_first( $sheets );
		} else {
			list( $hidden, $hidden_by_sheet ) = $this->get_hidden_column_config( $attributes );
			$normalized = array(
				'default' => $this->normalize_csv_table( $attributes['csvTable'] ?? null ),
			);
			$normalized = $this->apply_pivot( $normalized, $attributes );
			$sheets     = $this->filter_and_order_sheets( $normalized, $hidden, $col_order, $hidden_by_sheet );
			$default_sheet = isset( $attributes['defaultJsonSheet'] ) ? (string) $attributes['defaultJsonSheet'] : '';
			$activeSheet   = ( '' !== $default_sheet && isset( $sheets[ $default_sheet ] ) )
				? $default_sheet
				: array_key_first( $sheets );
			if ( null === $activeSheet ) {
				$activeSheet = 'default';
			}
		}


		$mobile_header_column = isset( $attributes['mobileHeaderColumn'] ) ? (string) $attributes['mobileHeaderColumn'] : '';
		$mobile_hidden_columns  = isset( $attributes['mobileHiddenColumns'] ) && is_array( $attributes['mobileHiddenColumns'] )
			? array_values( array_map( 'strval', $attributes['mobileHiddenColumns'] ) )
			: array();
		$value_prefix          = isset( $attributes['valuePrefix'] ) ? (string) $attributes['valuePrefix'] : '';
		$value_suffix          = isset( $attributes['valueSuffix'] ) ? (string) $attributes['valueSuffix'] : '';
		$value_format_sheets   = isset( $attributes['valueFormatSheets'] ) && is_array( $attributes['valueFormatSheets'] )
			? array_values( array_map( 'strval', $attributes['valueFormatSheets'] ) )
			: array();
		$value_format_excluded = isset( $attributes['valueFormatExcludedColumns'] ) && is_array( $attributes['valueFormatExcludedColumns'] )
			? array_map( 'strval', $attributes['valueFormatExcludedColumns'] )
			: array();
		$value_format_rules         = $this->sanitize_value_format_rules( $attributes['valueFormatRules'] ?? array() );
		$mobile_value_format_rules  = $this->sanitize_mobile_value_format_rules( $attributes['mobileValueFormatRules'] ?? array() );

		if ( '' === $value_prefix && '' === $value_suffix && ! empty( $attributes['columnValueFormats'] ) && is_array( $attributes['columnValueFormats'] ) ) {
			$legacy = $this->resolve_legacy_column_value_formats( $attributes['columnValueFormats'], $sheets, $activeSheet );
			$value_prefix          = $legacy['prefix'];
			$value_suffix          = $legacy['suffix'];
			$value_format_excluded = $legacy['excluded'];
		}

		$default_filters = $this->collect_default_table_filters( $block );
		if ( null !== $default_filters['activeSheet'] && isset( $sheets[ $default_filters['activeSheet'] ] ) ) {
			$activeSheet = $default_filters['activeSheet'];
		}

		list( $sheets, $col_order ) = $this->apply_auto_column_order_to_sheets(
			$sheets,
			$attributes,
			(string) $activeSheet,
			$col_order
		);

		$mobile_column_order = isset( $attributes['mobileColumnOrder'] ) && is_array( $attributes['mobileColumnOrder'] )
			? array_values( array_map( 'strval', $attributes['mobileColumnOrder'] ) )
			: array();

		if ( isset( $sheets[ $activeSheet ] ) ) {
			$mobile_column_order = $this->resolve_mobile_auto_column_order(
				$attributes,
				$sheets[ $activeSheet ],
				$mobile_column_order
			);
		}

		$enable_column_sorting = ! isset( $attributes['enableColumnSorting'] ) || ! empty( $attributes['enableColumnSorting'] );
		$initial_sort          = $this->resolve_initial_sort_state( $attributes, $sheets, (string) $activeSheet, $enable_column_sorting );

		$enable_row_dropdowns = ! empty( $attributes['enableRowDropdowns'] );
		$dropdown_identity    = isset( $attributes['rowDropdownIdentityColumn'] )
			? sanitize_text_field( (string) $attributes['rowDropdownIdentityColumn'] )
			: '';
		$dropdown_columns     = isset( $attributes['rowDropdownColumns'] ) && is_array( $attributes['rowDropdownColumns'] )
			? array_values( array_map( 'strval', $attributes['rowDropdownColumns'] ) )
			: array();

		$enable_header_special_borders = ! empty( $attributes['enableHeaderSpecialBorders'] );
		$header_special_border_colors  = $this->sanitize_header_special_border_colors(
			$attributes['headerSpecialBorderColors'] ?? array()
		);
		$mobile_column_colors          = $this->sanitize_mobile_column_colors(
			$attributes['mobileColumnColors'] ?? array()
		);
		$mobile_column_headers         = $this->sanitize_mobile_column_headers(
			$attributes['mobileColumnHeaders'] ?? array()
		);
		$mobile_column_sort_mode = isset( $attributes['mobileColumnSortMode'] )
			? sanitize_text_field( (string) $attributes['mobileColumnSortMode'] )
			: 'inherit';
		$hidden_column_headers   = isset( $attributes['hiddenColumnHeaders'] ) && is_array( $attributes['hiddenColumnHeaders'] )
			? array_values( array_map( 'strval', $attributes['hiddenColumnHeaders'] ) )
			: array();
		$table_text_align        = $this->sanitize_table_text_align( $attributes['tableTextAlign'] ?? 'center' );

		wp_interactivity_state(
			'prc-block/data-table',
			array(
				'tables' => array(
					$instance_id => array(
						'sheets'               => $sheets,
						'activeSheet'          => $activeSheet,
						'dataSource'           => $data_source,
						'mobileHeaderColumn'   => $mobile_header_column,
						'mobileHiddenColumns'  => $mobile_hidden_columns,
						'valuePrefix'                => $value_prefix,
						'valueSuffix'                => $value_suffix,
						'valueFormatSheets'          => $value_format_sheets,
						'valueFormatExcludedColumns' => $value_format_excluded,
						'valueFormatRules'           => $value_format_rules,
						'mobileValueFormatRules'     => $mobile_value_format_rules,
						'enableColumnSorting'  => $enable_column_sorting,
						'sortColumn'           => $initial_sort['sortColumn'],
						'sortDirection'        => $initial_sort['sortDirection'],
						'columnFilters'        => $default_filters['columnFilters'],
						'rowDropdown'          => array(
							'enabled'        => $enable_row_dropdowns && '' !== $dropdown_identity,
							'identityColumn' => $dropdown_identity,
							'columns'        => $dropdown_columns,
						),
						'enableHeaderSpecialBorders' => $enable_header_special_borders,
						'headerSpecialBorderColors'  => $header_special_border_colors,
						'mobileColumnColors'         => $mobile_column_colors,
						'mobileColumnHeaders'        => $mobile_column_headers,
						'mobileColumnSortMode'       => $mobile_column_sort_mode,
						'mobileColumnOrder'          => $mobile_column_order,
						'hiddenColumnHeaders'        => $hidden_column_headers,
						'tableTextAlign'             => $table_text_align,
					),
				),
			)
		);

		$wrapper_attributes = get_block_wrapper_attributes(
			array(
				'class' => 'wp-block-prc-block-data-table-controller',
			)
		);

		return wp_sprintf(
			'<div %1$s>%2$s</div>',
			$wrapper_attributes,
			$content
		);
	}

	/**
	 * Register block type.
	 */
	public function block_init(): void {
		register_block_type_from_metadata(
			PRC_BLOCK_TABLES_DIR . '/build/data-table-controller',
			array(
				'render_callback' => array( $this, 'render_block_callback' ),
			)
		);
	}
}
