<?php
// This file is generated. Do not modify it manually.
return array(
	'data-table-controller' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'prc-block/data-table-controller',
		'version' => '0.1.0',
		'title' => 'Data Table Controller',
		'category' => 'widgets',
		'description' => 'Provides tabular data (CSV, JSON, Firebase, Remote Data Blocks, or a parent provider via block context) to a data table render block.',
		'allowedBlocks' => array(
			'prc-block/data-table-render',
			'prc-block/data-table-filter',
			'prc-block/data-table-filter-select',
			'prc-block/data-table-key',
			'core/group'
		),
		'attributes' => array(
			'dataTableInstanceId' => array(
				'type' => 'string',
				'default' => ''
			),
			'dataSource' => array(
				'type' => 'string',
				'default' => 'csv'
			),
			'csvTable' => array(
				'type' => 'object',
				'default' => array(
					'columns' => array(
						
					),
					'rows' => array(
						
					)
				)
			),
			'jsonTable' => array(
				'type' => 'object',
				'default' => array(
					'columns' => array(
						
					),
					'rows' => array(
						
					)
				)
			),
			'hiddenColumns' => array(
				'type' => 'array',
				'default' => array(
					
				)
			),
			'hiddenColumnsBySheet' => array(
				'type' => 'object',
				'default' => array(
					
				)
			),
			'hiddenColumnHeaders' => array(
				'type' => 'array',
				'default' => array(
					
				)
			),
			'jsonColumns' => array(
				'type' => 'array',
				'default' => array(
					
				)
			),
			'columnOrder' => array(
				'type' => 'array',
				'default' => array(
					
				)
			),
			'defaultJsonSheet' => array(
				'type' => 'string',
				'default' => ''
			),
			'mobileHeaderColumn' => array(
				'type' => 'string',
				'default' => ''
			),
			'mobileHiddenColumns' => array(
				'type' => 'array',
				'default' => array(
					
				)
			),
			'columnSortMode' => array(
				'type' => 'string',
				'default' => 'custom'
			),
			'enableColumnSorting' => array(
				'type' => 'boolean',
				'default' => true
			),
			'defaultSortColumn' => array(
				'type' => 'string',
				'default' => ''
			),
			'defaultSortDirection' => array(
				'type' => 'string',
				'default' => 'asc'
			),
			'autoSortVariable' => array(
				'type' => 'string',
				'default' => ''
			),
			'autoSortRowIndex' => array(
				'type' => 'number',
				'default' => -1
			),
			'autoSortRowValue' => array(
				'type' => 'string',
				'default' => ''
			),
			'autoSortExcludedColumns' => array(
				'type' => 'array',
				'default' => array(
					
				)
			),
			'mobileColumnSortMode' => array(
				'type' => 'string',
				'default' => 'inherit'
			),
			'mobileColumnOrder' => array(
				'type' => 'array',
				'default' => array(
					
				)
			),
			'mobileAutoSortVariable' => array(
				'type' => 'string',
				'default' => ''
			),
			'mobileAutoSortRowIndex' => array(
				'type' => 'number',
				'default' => -1
			),
			'mobileAutoSortRowValue' => array(
				'type' => 'string',
				'default' => ''
			),
			'mobileAutoSortExcludedColumns' => array(
				'type' => 'array',
				'default' => array(
					
				)
			),
			'valuePrefix' => array(
				'type' => 'string',
				'default' => ''
			),
			'valueSuffix' => array(
				'type' => 'string',
				'default' => ''
			),
			'valueFormatSheets' => array(
				'type' => 'array',
				'default' => array(
					
				)
			),
			'valueFormatExcludedColumns' => array(
				'type' => 'array',
				'default' => array(
					
				)
			),
			'valueFormatRules' => array(
				'type' => 'array',
				'default' => array(
					
				)
			),
			'enableDesktopAbbreviation' => array(
				'type' => 'boolean',
				'default' => false
			),
			'valueAbbreviationRules' => array(
				'type' => 'array',
				'default' => array(
					
				)
			),
			'mobileValueFormatRules' => array(
				'type' => 'array',
				'default' => array(
					
				)
			),
			'enableRowDropdowns' => array(
				'type' => 'boolean',
				'default' => false
			),
			'rowDropdownIdentityColumn' => array(
				'type' => 'string',
				'default' => ''
			),
			'rowDropdownColumns' => array(
				'type' => 'array',
				'default' => array(
					
				)
			),
			'rowDropdownColumnsBySheet' => array(
				'type' => 'object',
				'default' => array(
					
				)
			),
			'enableHeaderSpecialBorders' => array(
				'type' => 'boolean',
				'default' => false
			),
			'headerSpecialBorderColors' => array(
				'type' => 'object',
				'default' => array(
					
				)
			),
			'mobileColumnColors' => array(
				'type' => 'object',
				'default' => array(
					
				)
			),
			'mobileColumnHeaders' => array(
				'type' => 'object',
				'default' => array(
					
				)
			),
			'tableTextAlign' => array(
				'type' => 'string',
				'default' => 'center'
			),
			'tableHeaderTextAlign' => array(
				'type' => 'string',
				'default' => ''
			),
			'boldColumns' => array(
				'type' => 'array',
				'default' => array(
					
				)
			),
			'firebasePath' => array(
				'type' => 'string',
				'default' => ''
			),
			'pivotEnabled' => array(
				'type' => 'boolean',
				'default' => false
			),
			'pivotIndexColumn' => array(
				'type' => 'string',
				'default' => ''
			),
			'pivotColumnField' => array(
				'type' => 'string',
				'default' => ''
			),
			'pivotColumns' => array(
				'type' => 'array',
				'default' => array(
					
				)
			),
			'pivotValueFields' => array(
				'type' => 'array',
				'default' => array(
					
				)
			),
			'pivotExtraColumns' => array(
				'type' => 'array',
				'default' => array(
					
				)
			),
			'allowDataDownload' => array(
				'type' => 'boolean',
				'default' => true
			)
		),
		'supports' => array(
			'anchor' => true,
			'html' => false,
			'interactivity' => array(
				'clientNavigation' => true
			),
			'spacing' => array(
				'blockGap' => true,
				'margin' => array(
					'top',
					'bottom'
				),
				'padding' => true,
				'__experimentalDefaultControls' => array(
					'padding' => true
				)
			),
			'typography' => array(
				'fontSize' => true,
				'__experimentalFontFamily' => true,
				'__experimentalDefaultControls' => array(
					'fontSize' => true,
					'__experimentalFontFamily' => true
				)
			)
		),
		'providesContext' => array(
			'prc-block/dataTableInstanceId' => 'dataTableInstanceId',
			'prc-block/dataTableDataSource' => 'dataSource',
			'prc-block/dataTableColumns' => 'jsonColumns',
			'prc-block/dataTableColumnOrder' => 'columnOrder',
			'prc-block/dataTableHiddenColumns' => 'hiddenColumns',
			'prc-block/dataTableHiddenColumnHeaders' => 'hiddenColumnHeaders',
			'prc-block/dataTableEnableHeaderSpecialBorders' => 'enableHeaderSpecialBorders',
			'prc-block/dataTableHeaderSpecialBorderColors' => 'headerSpecialBorderColors',
			'prc-block/dataTableEnableColumnSorting' => 'enableColumnSorting',
			'prc-block/dataTableTextAlign' => 'tableTextAlign',
			'prc-block/dataTableHeaderTextAlign' => 'tableHeaderTextAlign',
			'prc-block/dataTableBoldColumns' => 'boldColumns'
		),
		'usesContext' => array(
			'prc-block/dataTableData',
			'remote-data-blocks/remoteData'
		),
		'textdomain' => 'data-table-controller',
		'editorScript' => 'file:./index.js',
		'editorStyle' => 'file:./index.css',
		'style' => 'file:./style-index.css',
		'viewScriptModule' => 'file:./view.js'
	),
	'data-table-filter' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'prc-block/data-table-filter',
		'version' => '0.1.0',
		'title' => 'Data Table Filter',
		'category' => 'widgets',
		'description' => 'A button that switches the active sheet or filters rows by column value in a sibling Data Table Render block.',
		'ancestor' => array(
			'prc-block/data-table-controller'
		),
		'attributes' => array(
			'value' => array(
				'type' => 'string',
				'default' => ''
			),
			'label' => array(
				'type' => 'string',
				'default' => 'Filter'
			),
			'filterType' => array(
				'type' => 'string',
				'default' => 'sheet'
			),
			'filterColumn' => array(
				'type' => 'string',
				'default' => ''
			),
			'isDefault' => array(
				'type' => 'boolean',
				'default' => false
			),
			'asCheckbox' => array(
				'type' => 'boolean',
				'default' => false
			),
			'invertCheckbox' => array(
				'type' => 'boolean',
				'default' => false
			)
		),
		'supports' => array(
			'anchor' => true,
			'html' => false,
			'interactivity' => array(
				'clientNavigation' => true
			),
			'spacing' => array(
				'margin' => true,
				'padding' => true,
				'__experimentalDefaultControls' => array(
					'margin' => true,
					'padding' => true
				)
			),
			'color' => array(
				'background' => true,
				'text' => true,
				'__experimentalDefaultControls' => array(
					'background' => true,
					'text' => true
				)
			),
			'typography' => array(
				'fontSize' => true,
				'__experimentalDefaultControls' => array(
					'fontSize' => true
				)
			),
			'__experimentalBorder' => array(
				'color' => true,
				'radius' => true,
				'style' => true,
				'width' => true,
				'__experimentalDefaultControls' => array(
					'color' => true,
					'radius' => true,
					'style' => true,
					'width' => true
				)
			)
		),
		'usesContext' => array(
			'prc-block/dataTableInstanceId',
			'prc-block/dataTableDataSource',
			'prc-block/dataTableColumns'
		),
		'textdomain' => 'data-table-filter',
		'editorScript' => 'file:./index.js',
		'editorStyle' => 'file:./index.css',
		'style' => 'file:./style-index.css',
		'render' => 'file:./render.php',
		'viewScriptModule' => 'file:./view.js'
	),
	'data-table-filter-select' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'prc-block/data-table-filter-select',
		'version' => '0.1.0',
		'title' => 'Data Table Filter Select',
		'category' => 'widgets',
		'description' => 'A dropdown that groups multiple data table filter options into a single select control.',
		'ancestor' => array(
			'prc-block/data-table-controller'
		),
		'allowedBlocks' => array(
			'prc-block/data-table-filter'
		),
		'attributes' => array(
			'placeholder' => array(
				'type' => 'string',
				'default' => ''
			),
			'includeResetOption' => array(
				'type' => 'boolean',
				'default' => true
			),
			'resetLabel' => array(
				'type' => 'string',
				'default' => 'All'
			),
			'defaultValue' => array(
				'type' => 'string',
				'default' => ''
			),
			'filterColumn' => array(
				'type' => 'string',
				'default' => ''
			),
			'importedOptions' => array(
				'type' => 'array',
				'default' => array(
					
				)
			),
			'isFullWidth' => array(
				'type' => 'boolean',
				'default' => false
			),
			'hasClearIcon' => array(
				'type' => 'boolean',
				'default' => false
			),
			'enableSearch' => array(
				'type' => 'boolean',
				'default' => false
			)
		),
		'supports' => array(
			'anchor' => true,
			'html' => false,
			'interactivity' => true,
			'spacing' => array(
				'margin' => true,
				'padding' => true,
				'__experimentalDefaultControls' => array(
					'margin' => true,
					'padding' => true
				)
			),
			'typography' => array(
				'fontSize' => true,
				'__experimentalDefaultControls' => array(
					'fontSize' => true
				)
			)
		),
		'usesContext' => array(
			'prc-block/dataTableInstanceId',
			'prc-block/dataTableDataSource',
			'prc-block/dataTableColumns',
			'prc-block/dataTableData'
		),
		'textdomain' => 'data-table-filter-select',
		'editorScript' => 'file:./index.js',
		'editorStyle' => 'file:./index.css',
		'style' => 'file:./style-index.css',
		'render' => 'file:./render.php',
		'viewScriptModule' => 'file:./view.js'
	),
	'data-table-key' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'prc-block/data-table-key',
		'version' => '0.1.0',
		'title' => 'Data Table Key',
		'category' => 'widgets',
		'description' => 'Legend that maps a column’s values to colors and keys the data table rows.',
		'parent' => array(
			'prc-block/data-table-controller'
		),
		'attributes' => array(
			'keyColumn' => array(
				'type' => 'string',
				'default' => ''
			),
			'colorMap' => array(
				'type' => 'object',
				'default' => array(
					
				)
			),
			'enableFilter' => array(
				'type' => 'boolean',
				'default' => false
			),
			'includeResetOption' => array(
				'type' => 'boolean',
				'default' => false
			),
			'resetLabel' => array(
				'type' => 'string',
				'default' => 'All'
			),
			'keyOrder' => array(
				'type' => 'array',
				'default' => array(
					
				)
			),
			'excludedKeys' => array(
				'type' => 'array',
				'default' => array(
					
				)
			)
		),
		'supports' => array(
			'anchor' => true,
			'html' => false,
			'interactivity' => true,
			'spacing' => array(
				'margin' => true,
				'padding' => true,
				'__experimentalDefaultControls' => array(
					'margin' => true,
					'padding' => true
				)
			),
			'typography' => array(
				'fontSize' => true,
				'__experimentalDefaultControls' => array(
					'fontSize' => true
				)
			)
		),
		'usesContext' => array(
			'prc-block/dataTableInstanceId',
			'prc-block/dataTableDataSource',
			'prc-block/dataTableData'
		),
		'textdomain' => 'data-table-key',
		'editorScript' => 'file:./index.js',
		'editorStyle' => 'file:./index.css',
		'style' => 'file:./style-index.css',
		'render' => 'file:./render.php',
		'viewScriptModule' => 'file:./view.js'
	),
	'data-table-render' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'prc-block/data-table-render',
		'version' => '0.1.0',
		'title' => 'Data Table Render',
		'category' => 'media',
		'description' => 'Renders an interactive sortable table from parent controller data.',
		'attributes' => array(
			
		),
		'supports' => array(
			'anchor' => true,
			'html' => false,
			'interactivity' => array(
				'clientNavigation' => true
			),
			'spacing' => array(
				'blockGap' => true,
				'margin' => array(
					'top',
					'bottom'
				),
				'padding' => true,
				'__experimentalDefaultControls' => array(
					'padding' => true
				)
			),
			'typography' => array(
				'fontSize' => true,
				'__experimentalFontFamily' => true,
				'__experimentalDefaultControls' => array(
					'fontSize' => true,
					'__experimentalFontFamily' => true
				)
			)
		),
		'usesContext' => array(
			'prc-block/dataTableInstanceId',
			'prc-block/dataTableColumns',
			'prc-block/dataTableColumnOrder',
			'prc-block/dataTableHiddenColumns',
			'prc-block/dataTableHiddenColumnHeaders',
			'prc-block/dataTableEnableHeaderSpecialBorders',
			'prc-block/dataTableHeaderSpecialBorderColors',
			'prc-block/dataTableEnableColumnSorting',
			'prc-block/dataTableTextAlign',
			'prc-block/dataTableHeaderTextAlign',
			'prc-block/dataTableBoldColumns'
		),
		'textdomain' => 'data-table-render',
		'editorScript' => 'file:./index.js',
		'editorStyle' => 'file:./index.css',
		'style' => 'file:./style-index.css',
		'render' => 'file:./render.php',
		'viewScriptModule' => array(
			'@prc/d3',
			'file:./view.js'
		)
	),
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
			'validationMessage' => array(
				'type' => 'string',
				'default' => ''
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
