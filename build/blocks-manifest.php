<?php
// This file is generated. Do not modify it manually.
return array(
	'power-spreadsheet' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'prc-block/power-spreadsheet',
		'version' => '1.0.0',
		'title' => 'Power Spreadsheet',
		'category' => 'text',
		'keywords' => array(
			'table',
			'spreadsheet',
			'sheet',
			'data',
			'tabs'
		),
		'description' => 'An Excel-like tabbed container for Power Tables. Each tab is a sheet.',
		'textdomain' => 'prc-block-tables',
		'attributes' => array(
			'activeSheetIndex' => array(
				'type' => 'number',
				'default' => 0,
				'role' => 'local'
			)
		),
		'providesContext' => array(
			'prc-block/power-spreadsheet/activeSheetIndex' => 'activeSheetIndex'
		),
		'supports' => array(
			'anchor' => true,
			'interactivity' => true,
			'align' => array(
				'wide',
				'full'
			),
			'spacing' => array(
				'margin' => true,
				'padding' => true
			)
		),
		'allowedBlocks' => array(
			'prc-block/table'
		),
		'editorScript' => 'file:./index.js',
		'editorStyle' => 'file:./index.css',
		'style' => 'file:./style-index.css',
		'viewScriptModule' => 'file:./view.js'
	),
	'remote-pivot-table' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'prc-block/remote-pivot-table',
		'version' => '1.0.0',
		'title' => 'Remote Pivot Table',
		'description' => 'Pivots the data of a remote tabular data source allowing for pseudo-pivot-table like functionality. Select a data source like column or row and then select the columns to pivot by.',
		'category' => 'media',
		'keywords' => array(
			'remote',
			'data',
			'row',
			'table',
			'pivot',
			'tabular'
		),
		'attributes' => array(
			'primaryKey' => array(
				'type' => 'string'
			),
			'selectedColumns' => array(
				'type' => 'array',
				'items' => array(
					'type' => 'string'
				),
				'default' => array(
					
				)
			),
			'dataSource' => array(
				'type' => 'string',
				'enum' => array(
					'column',
					'row'
				),
				'default' => 'row'
			)
		),
		'example' => array(
			'attributes' => array(
				'dataSource' => 'row'
			)
		),
		'supports' => array(
			'anchor' => true,
			'html' => false
		),
		'usesContext' => array(
			'remote-data-blocks/remoteData',
			'remote-data-blocks/pivotedData'
		),
		'textdomain' => 'prc-block-tables',
		'editorScript' => 'file:./index.js',
		'style' => 'file:./style-index.css'
	),
	'table' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'prc-block/table',
		'version' => '1.1.0',
		'title' => 'Power Table',
		'category' => 'text',
		'keywords' => array(
			'table',
			'cell',
			'data'
		),
		'description' => 'Create a powerful and flexible table complete with responsive design and sorting/filtering options.',
		'textdomain' => 'prc-block-tables',
		'usesContext' => array(
			'remote-data-blocks/remoteData'
		),
		'attributes' => array(
			'metadata' => array(
				'type' => 'object',
				'default' => array(
					'name' => ''
				)
			),
			'contentJustification' => array(
				'type' => 'string'
			),
			'hasFixedLayout' => array(
				'type' => 'boolean',
				'default' => true
			),
			'isScrollOnPc' => array(
				'type' => 'boolean',
				'default' => false
			),
			'isScrollOnMobile' => array(
				'type' => 'boolean',
				'default' => false
			),
			'isStackedOnMobile' => array(
				'type' => 'boolean',
				'default' => false
			),
			'sticky' => array(
				'type' => 'string'
			),
			'tableStyles' => array(
				'type' => 'string',
				'source' => 'attribute',
				'selector' => 'table',
				'attribute' => 'style'
			),
			'sourceNote' => array(
				'type' => 'string',
				'source' => 'html',
				'selector' => 'p',
				'role' => 'content'
			),
			'tableTitle' => array(
				'type' => 'string',
				'source' => 'html',
				'selector' => 'h4',
				'role' => 'content'
			),
			'tableTitleStyles' => array(
				'type' => 'string',
				'source' => 'attribute',
				'selector' => 'h4',
				'attribute' => 'style'
			),
			'captionSide' => array(
				'type' => 'string',
				'default' => 'top'
			),
			'caption' => array(
				'type' => 'string',
				'source' => 'html',
				'selector' => 'figcaption',
				'role' => 'content'
			),
			'captionStyles' => array(
				'type' => 'string',
				'source' => 'attribute',
				'selector' => 'figcaption',
				'attribute' => 'style'
			),
			'head' => array(
				'type' => 'array',
				'default' => array(
					
				),
				'source' => 'query',
				'selector' => 'thead tr',
				'query' => array(
					'cells' => array(
						'type' => 'array',
						'default' => array(
							
						),
						'source' => 'query',
						'selector' => 'td,th',
						'query' => array(
							'content' => array(
								'type' => 'string',
								'source' => 'html',
								'role' => 'content'
							),
							'styles' => array(
								'type' => 'string',
								'source' => 'attribute',
								'attribute' => 'style'
							),
							'tag' => array(
								'type' => 'string',
								'default' => 'td',
								'source' => 'tag'
							),
							'className' => array(
								'type' => 'string',
								'source' => 'attribute',
								'attribute' => 'class'
							),
							'id' => array(
								'type' => 'string',
								'source' => 'attribute',
								'attribute' => 'id'
							),
							'headers' => array(
								'type' => 'string',
								'source' => 'attribute',
								'attribute' => 'headers'
							),
							'scope' => array(
								'enum' => array(
									'row',
									'col',
									'rowgroup',
									'colgroup'
								),
								'source' => 'attribute',
								'attribute' => 'scope'
							),
							'rowSpan' => array(
								'type' => 'string',
								'source' => 'attribute',
								'attribute' => 'rowspan'
							),
							'colSpan' => array(
								'type' => 'string',
								'source' => 'attribute',
								'attribute' => 'colspan'
							),
							'roundDecimals' => array(
								'type' => 'number',
								'source' => 'attribute',
								'attribute' => 'data-prc-round-decimals'
							)
						)
					)
				)
			),
			'body' => array(
				'type' => 'array',
				'default' => array(
					
				),
				'source' => 'query',
				'selector' => 'tbody tr',
				'query' => array(
					'cells' => array(
						'type' => 'array',
						'default' => array(
							
						),
						'source' => 'query',
						'selector' => 'td,th',
						'query' => array(
							'content' => array(
								'type' => 'string',
								'source' => 'html',
								'role' => 'content'
							),
							'styles' => array(
								'type' => 'string',
								'source' => 'attribute',
								'attribute' => 'style'
							),
							'tag' => array(
								'type' => 'string',
								'default' => 'td',
								'source' => 'tag'
							),
							'className' => array(
								'type' => 'string',
								'source' => 'attribute',
								'attribute' => 'class'
							),
							'id' => array(
								'type' => 'string',
								'source' => 'attribute',
								'attribute' => 'id'
							),
							'headers' => array(
								'type' => 'string',
								'source' => 'attribute',
								'attribute' => 'headers'
							),
							'scope' => array(
								'enum' => array(
									'row',
									'col',
									'rowgroup',
									'colgroup'
								),
								'source' => 'attribute',
								'attribute' => 'scope'
							),
							'rowSpan' => array(
								'type' => 'string',
								'source' => 'attribute',
								'attribute' => 'rowspan'
							),
							'colSpan' => array(
								'type' => 'string',
								'source' => 'attribute',
								'attribute' => 'colspan'
							),
							'roundDecimals' => array(
								'type' => 'number',
								'source' => 'attribute',
								'attribute' => 'data-prc-round-decimals'
							)
						)
					)
				)
			),
			'foot' => array(
				'type' => 'array',
				'default' => array(
					
				),
				'source' => 'query',
				'selector' => 'tfoot tr',
				'query' => array(
					'cells' => array(
						'type' => 'array',
						'default' => array(
							
						),
						'source' => 'query',
						'selector' => 'td,th',
						'query' => array(
							'content' => array(
								'type' => 'string',
								'source' => 'html',
								'role' => 'content'
							),
							'styles' => array(
								'type' => 'string',
								'source' => 'attribute',
								'attribute' => 'style'
							),
							'tag' => array(
								'type' => 'string',
								'default' => 'td',
								'source' => 'tag'
							),
							'className' => array(
								'type' => 'string',
								'source' => 'attribute',
								'attribute' => 'class'
							),
							'id' => array(
								'type' => 'string',
								'source' => 'attribute',
								'attribute' => 'id'
							),
							'headers' => array(
								'type' => 'string',
								'source' => 'attribute',
								'attribute' => 'headers'
							),
							'scope' => array(
								'enum' => array(
									'row',
									'col',
									'rowgroup',
									'colgroup'
								),
								'source' => 'attribute',
								'attribute' => 'scope'
							),
							'rowSpan' => array(
								'type' => 'string',
								'source' => 'attribute',
								'attribute' => 'rowspan'
							),
							'colSpan' => array(
								'type' => 'string',
								'source' => 'attribute',
								'attribute' => 'colspan'
							),
							'roundDecimals' => array(
								'type' => 'number',
								'source' => 'attribute',
								'attribute' => 'data-prc-round-decimals'
							)
						)
					)
				)
			),
			'columnMeta' => array(
				'type' => 'array',
				'default' => array(
					
				)
			),
			'validationSchema' => array(
				'type' => 'string',
				'default' => ''
			),
			'isValid' => array(
				'type' => 'boolean',
				'default' => true
			),
			'columnRoundDecimals' => array(
				'type' => 'array',
				'default' => array(
					
				),
				'__deprecated' => 'Use columnMeta[i].roundDecimals instead.'
			),
			'hiddenColumns' => array(
				'type' => 'array',
				'default' => array(
					
				),
				'__deprecated' => 'Use columnMeta[i].hidden instead.'
			),
			'isSortable' => array(
				'type' => 'boolean',
				'default' => false
			),
			'sortableColumns' => array(
				'type' => 'array',
				'default' => array(
					
				),
				'__deprecated' => 'Use columnMeta[i].sortable instead.'
			)
		),
		'example' => array(
			'attributes' => array(
				'head' => array(
					array(
						'cells' => array(
							array(
								'content' => 'Version',
								'tag' => 'th'
							),
							array(
								'content' => 'Jazz Musician',
								'tag' => 'th'
							),
							array(
								'content' => 'Release Date',
								'tag' => 'th'
							)
						)
					)
				),
				'body' => array(
					array(
						'cells' => array(
							array(
								'content' => '5.9',
								'tag' => 'td'
							),
							array(
								'content' => 'Joséphine Baker',
								'tag' => 'td'
							),
							array(
								'content' => 'January 25, 2022',
								'tag' => 'td'
							)
						)
					),
					array(
						'cells' => array(
							array(
								'content' => '5.8',
								'tag' => 'td'
							),
							array(
								'content' => 'Art Tatum',
								'tag' => 'td'
							),
							array(
								'content' => 'July 20, 2021',
								'tag' => 'td'
							)
						)
					),
					array(
						'cells' => array(
							array(
								'content' => '5.7',
								'tag' => 'td'
							),
							array(
								'content' => 'Esperanza Spalding',
								'tag' => 'td'
							),
							array(
								'content' => 'March 9, 2021',
								'tag' => 'td'
							)
						)
					)
				)
			)
		),
		'supports' => array(
			'anchor' => true,
			'interactivity' => true,
			'align' => array(
				'left',
				'right',
				'wide',
				'full'
			),
			'color' => array(
				'__experimentalSkipSerialization' => array(
					'text',
					'background',
					'gradients'
				),
				'gradients' => true,
				'link' => true
			),
			'typography' => array(
				'fontSize' => true,
				'__experimentalFontFamily' => true,
				'__experimentalDefaultControls' => array(
					'fontSize' => false
				)
			),
			'spacing' => array(
				'margin' => true,
				'padding' => true,
				'__experimentalDefaultControls' => array(
					'margin' => false
				)
			),
			'__experimentalBorder' => array(
				'color' => true,
				'radius' => false,
				'style' => true,
				'width' => true,
				'__experimentalDefaultControls' => array(
					'color' => true,
					'radius' => true,
					'style' => true,
					'width' => true
				)
			),
			'__experimentalSelector' => array(
				'root' => '.wp-block-prc-block-table',
				'typography' => array(
					'root' => '.wp-block-prc-block-table',
					'fontFamily' => '.wp-block-prc-block-table',
					'fontSize' => '.wp-block-prc-block-table > table'
				)
			)
		),
		'providesContext' => array(
			'prc-block/table/columnMeta' => 'columnMeta',
			'prc-block/table/validationSchema' => 'validationSchema',
			'prc-block/table/isValid' => 'isValid'
		),
		'editorScript' => array(
			'ais-ai',
			'file:./index.js'
		),
		'editorStyle' => 'file:./index.css',
		'style' => 'file:./style-index.css',
		'viewScriptModule' => 'file:./view.js'
	)
);
