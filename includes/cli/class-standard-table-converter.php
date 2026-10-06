<?php
/**
 * Converts legacy prc-data-table/standard-table blocks into prc-block/table (Power Table) blocks.
 *
 * @package PRC\Platform\Block_Tables
 */

namespace PRC\Platform\Block_Tables;

/**
 * Builds Power Table block arrays that match the markup produced by src/table/save.tsx,
 * so the editor validates the migrated block without recovery prompts.
 */
class Standard_Table_Converter {

	/**
	 * Legacy block name removed from the platform.
	 */
	public const LEGACY_BLOCK_NAME = 'prc-data-table/standard-table';

	/**
	 * Replacement block name.
	 */
	public const TARGET_BLOCK_NAME = 'prc-block/table';

	/**
	 * Legacy wrapper attrs carried over as-is (supported by prc-block/table too).
	 */
	private const PASSTHROUGH_ATTRS = array( 'align', 'className', 'anchor' );

	/**
	 * Recursively convert every legacy standard-table block in a parsed block tree.
	 *
	 * @param array $blocks    Parsed blocks.
	 * @param int   $converted Incremented once per converted block.
	 * @return array Blocks with legacy tables replaced.
	 */
	public static function convert_blocks( array $blocks, int &$converted ): array {
		foreach ( $blocks as $index => $block ) {
			if ( self::LEGACY_BLOCK_NAME === ( $block['blockName'] ?? '' ) ) {
				$replacement = self::convert_block( $block );
				if ( null !== $replacement ) {
					$blocks[ $index ] = $replacement;
					++$converted;
				}
				continue;
			}

			if ( ! empty( $block['innerBlocks'] ) ) {
				$blocks[ $index ]['innerBlocks'] = self::convert_blocks( $block['innerBlocks'], $converted );
			}
		}

		return $blocks;
	}

	/**
	 * Convert one legacy standard-table block into a sortable Power Table block.
	 *
	 * @param array $block Parsed prc-data-table/standard-table block.
	 * @return array|null Parsed prc-block/table block, or null when the legacy block has no data.
	 */
	public static function convert_block( array $block ): ?array {
		$legacy  = $block['attrs'] ?? array();
		$headers = array_values( (array) ( $legacy['colHeaders'] ?? array() ) );
		$rows    = array_values( array_filter( (array) ( $legacy['data'] ?? array() ), 'is_array' ) );

		if ( empty( $headers ) && empty( $rows ) ) {
			return null;
		}

		$attrs = array();
		foreach ( self::PASSTHROUGH_ATTRS as $key ) {
			if ( isset( $legacy[ $key ] ) && '' !== $legacy[ $key ] ) {
				$attrs[ $key ] = $legacy[ $key ];
			}
		}
		$attrs['isSortable'] = true;

		$title   = isset( $legacy['title'] ) ? trim( (string) $legacy['title'] ) : '';
		$caption = isset( $legacy['caption'] ) ? trim( (string) $legacy['caption'] ) : '';

		// The legacy block rendered its caption below the table; Power Table defaults to top.
		if ( '' !== $caption ) {
			$attrs['captionSide'] = 'bottom';
		}

		$column_count = count( $headers );
		foreach ( $rows as $row ) {
			$column_count = max( $column_count, count( $row ) );
		}

		$figure_classes = array( 'wp-block-prc-block-table' );
		if ( isset( $attrs['align'] ) ) {
			$figure_classes[] = 'align' . $attrs['align'];
		}
		if ( isset( $attrs['className'] ) ) {
			$figure_classes[] = $attrs['className'];
		}
		$figure_classes[] = 'is-sortable';

		$html = '<figure class="' . esc_attr( implode( ' ', $figure_classes ) ) . '"';
		if ( isset( $attrs['anchor'] ) ) {
			$html .= ' id="' . esc_attr( $attrs['anchor'] ) . '"';
		}
		$html .= '>';

		if ( '' !== $title ) {
			$html .= '<h4 class="prc-block-table-title">' . esc_html( $title ) . '</h4>';
		}

		$html .= '<table class="has-fixed-layout">';
		$html .= '<colgroup>' . str_repeat( '<col/>', $column_count ) . '</colgroup>';

		if ( ! empty( $headers ) ) {
			$html .= '<thead><tr>';
			foreach ( $headers as $header ) {
				$html .= '<th class="is-sortable">' . esc_html( self::cell_text( $header ) ) . '</th>';
			}
			$html .= '</tr></thead>';
		}

		if ( ! empty( $rows ) ) {
			$html .= '<tbody>';
			foreach ( $rows as $row ) {
				$html .= '<tr>';
				foreach ( array_values( $row ) as $col => $cell ) {
					$html .= '<td data-prc-v-col="' . (int) $col . '">' . esc_html( self::cell_text( $cell ) ) . '</td>';
				}
				$html .= '</tr>';
			}
			$html .= '</tbody>';
		}

		$html .= '</table>';

		if ( '' !== $caption ) {
			$html .= '<figcaption class="prc-block-table-caption">' . esc_html( $caption ) . '</figcaption>';
		}

		$html .= '</figure>';

		return array(
			'blockName'    => self::TARGET_BLOCK_NAME,
			'attrs'        => $attrs,
			'innerBlocks'  => array(),
			'innerHTML'    => $html,
			'innerContent' => array( $html ),
		);
	}

	/**
	 * Normalize a legacy cell value (Handsontable may store null or numbers) to a string.
	 *
	 * @param mixed $value Cell value.
	 * @return string
	 */
	private static function cell_text( $value ): string {
		if ( null === $value || is_array( $value ) || is_object( $value ) ) {
			return '';
		}
		return (string) $value;
	}
}
