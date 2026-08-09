<?php
namespace PRC\Platform\Blocks;

// $attributes, $content, $block provided by WordPress.

$instance_id = $block->context['prc-block/dataTableInstanceId'] ?? '';

$interactive_context = array(
	'dataTableInstanceId' => (string) $instance_id,
);

$wrapper_attrs = get_block_wrapper_attributes(
	array(
		'class'               => 'wp-block-prc-block-data-table-render',
		'data-wp-interactive' => 'prc-block/data-table',
		'data-wp-init'        => 'callbacks.onTableMount',
		'data-wp-watch'       => 'callbacks.watchTableState',
		'data-wp-context'     => wp_json_encode( $interactive_context ),
	)
);

?>
<div <?php echo $wrapper_attrs; ?>>
	<div class="prc-data-table-mount"></div>
</div>
