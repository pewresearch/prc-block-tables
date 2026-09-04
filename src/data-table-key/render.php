<?php
/**
 * Data Table Key — legend + Interactivity state for row coloring.
 *
 * @package PRC\Platform\Blocks
 */

namespace PRC\Platform\Blocks;

$instance_id   = $block->context['prc-block/dataTableInstanceId'] ?? '';
$key_column    = isset( $attributes['keyColumn'] ) ? (string) $attributes['keyColumn'] : '';
$enable_filter = ! empty( $attributes['enableFilter'] );
$include_reset   = ! empty( $attributes['includeResetOption'] );
$reset_label     = isset( $attributes['resetLabel'] ) ? wp_strip_all_tags( (string) $attributes['resetLabel'] ) : 'All';
if ( '' === $reset_label ) {
	$reset_label = 'All';
}
$raw_map       = isset( $attributes['colorMap'] ) && is_array( $attributes['colorMap'] ) ? $attributes['colorMap'] : array();
$raw_order     = isset( $attributes['keyOrder'] ) && is_array( $attributes['keyOrder'] ) ? $attributes['keyOrder'] : array();
$raw_excluded  = isset( $attributes['excludedKeys'] ) && is_array( $attributes['excludedKeys'] ) ? $attributes['excludedKeys'] : array();

$sanitized_map = array();
foreach ( $raw_map as $label => $hex ) {
	$safe = is_string( $hex ) ? sanitize_hex_color( $hex ) : '';
	if ( $safe ) {
		$sanitized_map[ wp_strip_all_tags( (string) $label ) ] = $safe;
	}
}

$ordered_labels = array();
foreach ( $raw_order as $label ) {
	$safe_label = wp_strip_all_tags( (string) $label );
	if ( isset( $sanitized_map[ $safe_label ] ) && ! in_array( $safe_label, $ordered_labels, true ) ) {
		$ordered_labels[] = $safe_label;
	}
}
foreach ( array_keys( $sanitized_map ) as $label ) {
	if ( ! in_array( $label, $ordered_labels, true ) ) {
		$ordered_labels[] = $label;
	}
}

$excluded_labels = array();
foreach ( $raw_excluded as $label ) {
	$safe_label = wp_strip_all_tags( (string) $label );
	if ( isset( $sanitized_map[ $safe_label ] ) && ! in_array( $safe_label, $excluded_labels, true ) ) {
		$excluded_labels[] = $safe_label;
	}
}

if ( '' !== $instance_id && '' !== $key_column && ! empty( $sanitized_map ) ) {
	wp_interactivity_state(
		'prc-block/data-table',
		array(
			'tables' => array(
				$instance_id => array(
					'keyMap' => array(
						'column' => $key_column,
						'colors' => $sanitized_map,
					),
				),
			),
		)
	);
}

$wrapper_extra = array(
	'class' => 'wp-block-prc-block-data-table-key',
);

if ( $enable_filter && '' !== $instance_id && '' !== $key_column && ! empty( $sanitized_map ) ) {
	$wrapper_extra['data-wp-interactive'] = 'prc-block/data-table';
}

$wrapper_attrs = get_block_wrapper_attributes( $wrapper_extra );
?>
<div <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
	<?php if ( '' !== $key_column && ! empty( $sanitized_map ) ) : ?>
		<div
			class="prc-data-table-key__legend"
			role="<?php echo $enable_filter ? 'group' : 'list'; ?>"
			<?php if ( $enable_filter ) : ?>
				aria-label="<?php esc_attr_e( 'Legend filters', 'data-table-key' ); ?>"
			<?php endif; ?>
		>
			<?php if ( $enable_filter && $include_reset && '' !== $instance_id ) : ?>
				<?php
				$reset_context = wp_json_encode(
					array(
						'dataTableInstanceId' => $instance_id,
						'filterColumn'        => $key_column,
					)
				);
				?>
				<button
					type="button"
					class="prc-data-table-key__item prc-data-table-key__item--button prc-data-table-key__item--reset"
					data-wp-context="<?php echo esc_attr( $reset_context ); ?>"
					data-wp-on--click="actions.resetKeyFilter"
					data-wp-class--is-active="state.isKeyFilterResetActive"
					data-wp-bind--aria-pressed="state.isKeyFilterResetActive"
				>
					<span
						class="prc-data-table-key__swatch"
						style="<?php echo esc_attr( 'background-color: rgb(215, 215, 215)' ); ?>"
						aria-hidden="true"
					></span>
					<span class="prc-data-table-key__label"><?php echo esc_html( $reset_label ); ?></span>
				</button>
			<?php endif; ?>
			<?php foreach ( $ordered_labels as $label ) : ?>
				<?php
				if ( in_array( $label, $excluded_labels, true ) ) {
					continue;
				}
				$hex = $sanitized_map[ $label ];
				?>
				<?php if ( $enable_filter && '' !== $instance_id ) : ?>
					<?php
					$item_context = wp_json_encode(
						array(
							'dataTableInstanceId' => $instance_id,
							'filterColumn'        => $key_column,
							'filterValue'         => $label,
						)
					);
					?>
					<button
						type="button"
						class="prc-data-table-key__item prc-data-table-key__item--button"
						data-wp-context="<?php echo esc_attr( $item_context ); ?>"
						data-wp-on--click="actions.toggleKeyFilter"
						data-wp-class--is-active="state.isKeyFilterActive"
						data-wp-bind--aria-pressed="state.isKeyFilterActive"
					>
						<span
							class="prc-data-table-key__swatch"
							style="<?php echo esc_attr( 'background-color: ' . $hex ); ?>"
							aria-hidden="true"
						></span>
						<span class="prc-data-table-key__label"><?php echo esc_html( $label ); ?></span>
					</button>
				<?php else : ?>
					<span class="prc-data-table-key__item" role="listitem">
						<span
							class="prc-data-table-key__swatch"
							style="<?php echo esc_attr( 'background-color: ' . $hex ); ?>"
							aria-hidden="true"
						></span>
						<span class="prc-data-table-key__label"><?php echo esc_html( $label ); ?></span>
					</span>
				<?php endif; ?>
			<?php endforeach; ?>
		</div>
	<?php endif; ?>
</div>
