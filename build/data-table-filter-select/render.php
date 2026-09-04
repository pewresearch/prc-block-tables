<?php
/**
 * Data Table Filter Select — grouped dropdown filter control.
 *
 * @package PRC\Platform\Blocks
 */

namespace PRC\Platform\Blocks;

$instance_id        = $block->context['prc-block/dataTableInstanceId'] ?? '';
$placeholder        = isset( $attributes['placeholder'] ) ? (string) $attributes['placeholder'] : '';
$include_reset      = ! empty( $attributes['includeResetOption'] );
$reset_label        = isset( $attributes['resetLabel'] ) ? (string) $attributes['resetLabel'] : 'All';
$default_value_attr = isset( $attributes['defaultValue'] ) ? (string) $attributes['defaultValue'] : '';
$filter_column      = isset( $attributes['filterColumn'] ) ? (string) $attributes['filterColumn'] : '';
$imported_options   = isset( $attributes['importedOptions'] ) && is_array( $attributes['importedOptions'] )
	? $attributes['importedOptions']
	: array();
$is_full_width      = ! empty( $attributes['isFullWidth'] );
$has_clear_icon     = ! empty( $attributes['hasClearIcon'] );
$enable_search      = ! empty( $attributes['enableSearch'] );

$options = array();

foreach ( $imported_options as $imported_option ) {
	if ( ! is_array( $imported_option ) ) {
		continue;
	}

	$value = isset( $imported_option['value'] ) ? (string) $imported_option['value'] : '';
	if ( '' === $value ) {
		continue;
	}

	$option_label = isset( $imported_option['label'] ) ? (string) $imported_option['label'] : $value;

	$options[] = array(
		'value'        => $value,
		'label'        => wp_kses_post( $option_label ),
		'filterType'   => 'column-include-only',
		'filterColumn' => $filter_column,
		'isDefault'    => false,
	);
}

if ( ! empty( $block->inner_blocks ) ) {
	foreach ( $block->inner_blocks as $inner ) {
		if ( 'prc-block/data-table-filter' !== $inner->name ) {
			continue;
		}

		$attrs = $inner->attributes;
		$value = isset( $attrs['value'] ) ? (string) $attrs['value'] : '';
		if ( '' === $value ) {
			continue;
		}

		$filter_type = isset( $attrs['filterType'] ) ? (string) $attrs['filterType'] : 'sheet';

		$options[] = array(
			'value'        => $value,
			'label'        => isset( $attrs['label'] ) ? wp_kses_post( (string) $attrs['label'] ) : $value,
			'filterType'   => $filter_type,
			'filterColumn' => isset( $attrs['filterColumn'] ) ? (string) $attrs['filterColumn'] : '',
			'isDefault'    => ! empty( $attrs['isDefault'] ),
		);
	}
}

$default_option_index = null;
$default_filter_value = '';

if ( '' !== $default_value_attr ) {
	foreach ( $options as $index => $option ) {
		if ( $option['value'] === $default_value_attr ) {
			$default_option_index = $index;
			$default_filter_value = $option['value'];
			break;
		}
	}
} else {
	foreach ( $options as $index => $option ) {
		if ( ! empty( $option['isDefault'] ) ) {
			$default_option_index = $index;
			$default_filter_value = $option['value'];
			break;
		}
	}
}

if ( null !== $default_option_index && '' !== $instance_id && '' !== $default_filter_value ) {
	$default_option = $options[ $default_option_index ];
	$filter_type    = $default_option['filterType'];
	$filter_column  = $default_option['filterColumn'];

	$is_column_filter = in_array(
		$filter_type,
		array( 'column', 'column-include', 'column-include-only', 'column-exclude', 'column-exclude-begins-with' ),
		true
	);

	if ( $is_column_filter && '' !== $filter_column && 'column-include' !== $filter_type ) {
		$column_filter = array(
			'value'   => $default_filter_value,
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
						'activeSheet' => $default_filter_value,
					),
				),
			)
		);
	}
}

$interactive_context = array(
	'dataTableInstanceId' => $instance_id,
	'options'             => $options,
	'includeReset'        => $include_reset,
	'resetLabel'          => $reset_label,
	'placeholder'         => $placeholder,
	'hasClearIcon'        => $has_clear_icon,
	'enableSearch'        => $enable_search,
	'searchQuery'         => '',
	'highlightedValue'    => null,
	'isOpen'              => false,
);

$initial_selected_value = '';
$initial_selected_label = '';
$initial_is_placeholder = false;

if ( null !== $default_option_index ) {
	$initial_selected_value = (string) $default_option_index;
	$initial_selected_label = $options[ $default_option_index ]['label'];
} elseif ( $include_reset ) {
	$initial_selected_value = '__reset__';
	$initial_selected_label = '' !== $placeholder ? $placeholder : $reset_label;
	$initial_is_placeholder = '' !== $placeholder;
} else {
	// No default and reset disabled: leave unselected to match client resolveDropdownValue().
	$initial_selected_label = $placeholder;
	$initial_is_placeholder = '' !== $placeholder;
}

$initial_has_clear = '' !== $initial_selected_value && '__reset__' !== $initial_selected_value;

$wrapper_classes = array( 'wp-block-prc-block-data-table-filter-select' );
if ( $is_full_width ) {
	$wrapper_classes[] = 'is-full-width';
}

$wrapper_attrs = get_block_wrapper_attributes(
	array(
		'class'               => implode( ' ', $wrapper_classes ),
		'data-wp-interactive' => 'prc-block/data-table',
		'data-wp-context'     => wp_json_encode( $interactive_context ),
	)
);

$aria_label = '' !== $placeholder
	? $placeholder
	: __( 'Filter table', 'data-table-filter-select' );

$dropdown_classes = array( 'ui', 'selection', 'dropdown' );
if ( $has_clear_icon ) {
	$dropdown_classes[] = 'has-clear-icon';
}
if ( $enable_search ) {
	$dropdown_classes[] = 'search';
}

ob_start();
?>
<div <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
	<div
		class="<?php echo esc_attr( implode( ' ', $dropdown_classes ) ); ?>"
		<?php if ( ! $enable_search ) : ?>
			role="listbox"
			tabindex="0"
		<?php endif; ?>
		data-wp-on--click="actions.toggleDropdown"
		data-wp-on--keydown="actions.onDropdownKeydown"
		data-wp-on-document--click="callbacks.onDocumentClick"
		data-wp-class--active="context.isOpen"
		data-wp-class--visible="context.isOpen"
		<?php if ( ! $enable_search ) : ?>
			data-wp-bind--aria-expanded="context.isOpen"
			aria-label="<?php echo esc_attr( $aria_label ); ?>"
		<?php endif; ?>
	>
		<?php if ( $has_clear_icon ) : ?>
			<button
				type="button"
				class="prc-data-table-filter-select__clear-button"
				data-wp-on--click="actions.clearSelection"
				data-wp-bind--hidden="!state.hasClearIcon"
				aria-label="<?php echo esc_attr__( 'Clear filter', 'data-table-filter-select' ); ?>"
				<?php echo $initial_has_clear ? '' : ' hidden'; ?>
			>
				<?php echo \PRC\Platform\Icons\render( 'solid', 'circle-xmark' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
			</button>
		<?php endif; ?>
		<i class="dropdown icon" aria-hidden="true"></i>
		<?php if ( $enable_search ) : ?>
			<input
				class="search"
				type="search"
				autocomplete="off"
				spellcheck="false"
				tabindex="0"
				role="combobox"
				aria-autocomplete="list"
				aria-label="<?php echo esc_attr__( 'Search options', 'data-table-filter-select' ); ?>"
				data-wp-on--input="actions.onSearchInput"
				data-wp-on--keydown="actions.onSearchKeydown"
				data-wp-on--focus="actions.onSearchFocus"
				data-wp-on--click="actions.stopPropagation"
				data-wp-bind--value="context.searchQuery"
				data-wp-bind--aria-expanded="context.isOpen"
			/>
		<?php endif; ?>
		<div
			class="text<?php echo $initial_is_placeholder ? ' default' : ''; ?>"
			data-wp-text="state.selectedLabel"
			data-wp-class--default="state.isPlaceholder"
			<?php if ( $enable_search ) : ?>
				data-wp-class--filtered="state.isSearchActive"
			<?php endif; ?>
		>
			<?php echo $initial_is_placeholder ? esc_html( $initial_selected_label ) : wp_kses_post( $initial_selected_label ); ?>
		</div>
		<div
			class="menu"
			role="<?php echo $enable_search ? 'listbox' : 'presentation'; ?>"
			data-wp-on--click="actions.stopPropagation"
		>
			<?php if ( $enable_search ) : ?>
				<div
					class="message"
					hidden
					data-wp-bind--hidden="!state.hasNoSearchResults"
				>
					<?php echo esc_html__( 'No results found', 'data-table-filter-select' ); ?>
				</div>
			<?php endif; ?>
			<?php if ( $include_reset ) : ?>
				<?php
				$reset_is_active = '__reset__' === $initial_selected_value;
				$reset_item_ctx  = wp_json_encode(
					array(
						'optionValue' => '__reset__',
						'optionLabel' => $reset_label,
					)
				);
				?>
				<div
					class="item<?php echo $reset_is_active ? ' active selected' : ''; ?>"
					role="option"
					tabindex="-1"
					data-value="__reset__"
					data-wp-context="<?php echo esc_attr( $reset_item_ctx ); ?>"
					data-wp-on--click="actions.selectItem"
					data-wp-class--active="state.isItemActive"
					data-wp-class--selected="state.isItemActive"
					data-wp-bind--aria-selected="state.isItemActive"
					<?php if ( $enable_search ) : ?>
						data-wp-bind--hidden="state.isItemFiltered"
					<?php endif; ?>
					<?php echo $reset_is_active ? ' aria-selected="true"' : ' aria-selected="false"'; ?>
				>
					<?php echo esc_html( $reset_label ); ?>
				</div>
			<?php endif; ?>
			<?php foreach ( $options as $index => $option ) : ?>
				<?php
				$option_value     = (string) $index;
				$option_is_active = $option_value === $initial_selected_value;
				$option_item_ctx  = wp_json_encode(
					array(
						'optionValue' => $option_value,
						'optionLabel' => wp_strip_all_tags( $option['label'] ),
					)
				);
				?>
				<div
					class="item<?php echo $option_is_active ? ' active selected' : ''; ?>"
					role="option"
					tabindex="-1"
					data-value="<?php echo esc_attr( $option_value ); ?>"
					data-wp-context="<?php echo esc_attr( $option_item_ctx ); ?>"
					data-wp-on--click="actions.selectItem"
					data-wp-class--active="state.isItemActive"
					data-wp-class--selected="state.isItemActive"
					data-wp-bind--aria-selected="state.isItemActive"
					<?php if ( $enable_search ) : ?>
						data-wp-bind--hidden="state.isItemFiltered"
					<?php endif; ?>
					<?php echo $option_is_active ? ' aria-selected="true"' : ' aria-selected="false"'; ?>
				>
					<?php echo wp_kses_post( $option['label'] ); ?>
				</div>
			<?php endforeach; ?>
		</div>
	</div>
</div>
<?php
echo ob_get_clean(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
