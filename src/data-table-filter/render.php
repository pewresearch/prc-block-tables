<?php
namespace PRC\Platform\Blocks;

$instance_id   = $block->context['prc-block/dataTableInstanceId'] ?? '';
$filter_value  = isset( $attributes['value'] ) ? (string) $attributes['value'] : '';
$label         = isset( $attributes['label'] ) ? wp_kses_post( $attributes['label'] ) : '';
$filter_type   = isset( $attributes['filterType'] ) ? (string) $attributes['filterType'] : 'sheet';
$filter_column = isset( $attributes['filterColumn'] ) ? (string) $attributes['filterColumn'] : '';
$is_default    = ! empty( $attributes['isDefault'] );
$as_checkbox      = ! empty( $attributes['asCheckbox'] );
$invert_checkbox  = ! empty( $attributes['invertCheckbox'] );

$is_column_filter  = in_array( $filter_type, array( 'column', 'column-include', 'column-include-only', 'column-exclude', 'column-exclude-begins-with' ), true );
$supports_checkbox = $as_checkbox && $is_column_filter && 'column-include' !== $filter_type;

if ( $is_default && '' !== $instance_id && '' !== $filter_value ) {
	if ( $is_column_filter && '' !== $filter_column && 'column-include' !== $filter_type ) {
		$column_filter = array(
			'value'   => $filter_value,
			'exclude' => in_array( $filter_type, array( 'column-exclude', 'column-exclude-begins-with' ), true ),
		);
		if ( 'column-exclude-begins-with' === $filter_type ) {
			$column_filter['match'] = 'beginsWith';
		}
		wp_interactivity_state(
			'prc-block/data-table',
			array(
				'tables' => array(
					$instance_id => array(
						'columnFilters' => array(
							$filter_column => $column_filter,
						),
					),
				),
			)
		);
	} elseif ( 'sheet' === $filter_type ) {
		wp_interactivity_state(
			'prc-block/data-table',
			array(
				'tables' => array(
					$instance_id => array(
						'activeSheet' => $filter_value,
					),
				),
			)
		);
	}
}

$interactive_context = array(
	'dataTableInstanceId' => $instance_id,
	'filterValue'         => $filter_value,
	'filterType'          => $filter_type,
	'filterColumn'        => $filter_column,
);

if ( $supports_checkbox ) {
	$interactive_context['asCheckbox']     = true;
	$interactive_context['invertCheckbox'] = $invert_checkbox;

	$wrapper_attrs = get_block_wrapper_attributes(
		array(
			'class'               => 'wp-block-prc-block-data-table-filter is-checkbox',
			'data-wp-interactive' => 'prc-block/data-table',
			'data-wp-context'     => wp_json_encode( $interactive_context ),
		)
	);

	printf(
		'<label %1$s><input type="checkbox" data-wp-bind--checked="state.isCheckboxChecked" data-wp-on--change="actions.toggleColumnFilterCheckbox" /><span>%2$s</span></label>',
		$wrapper_attrs,
		$label
	);
	return;
}

$click_action = $is_column_filter ? 'actions.setColumnFilter' : 'actions.setActiveSheet';
$active_state = $is_column_filter ? 'state.isColumnFilterActive' : 'state.isFilterActive';

$wrapper_attrs = get_block_wrapper_attributes(
	array(
		'class'                    => 'wp-block-prc-block-data-table-filter',
		'type'                     => 'button',
		'data-wp-interactive'      => 'prc-block/data-table',
		'data-wp-context'          => wp_json_encode( $interactive_context ),
		'data-wp-on--click'        => $click_action,
		'data-wp-class--is-active' => $active_state,
	)
);

printf(
	'<button %1$s><span>%2$s</span></button>',
	$wrapper_attrs,
	$label
);
