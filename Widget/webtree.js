/**
 * jQuery UI Tree Table
 * Support multi select, icon, table columns, group and item events.
 * 
 * options.groupTree {
 *   id:
 *   name:
 *   subGroupMap{
 *   	<id>: {
 *   	}
 *   	// , ......
 *   }
 *   itemList:[
 *   	{
 *   		id:
 *   		name:
 *   	}
 *   	// , ......
 *   ]
 * }
 * 
 * @author Anderson Mao, 2011-11-14
 */
$.widget("web.webtree", {
	/** 
	 * Default options
	 */
	options: {
		id: 1, // Used in id prefix, use different value when there are multi devicepicker in same page
		groupTree: {},
		multiSelect: false,
		multiSelectNotCheckParent: false, // When true, not check parent, still uncheck parent, and uncheck all parents (even when some child selected) 
		multiSelectGroupMap: {}, // [Edit Mode, used when multiSelect is true
		multiSelectItemMap: {}, // [Edit Mode], used when multiSelect is true
		showExpandCollapse: false,
		editable: false, // If true, can add/update/remove/move(drag/drop) group or item
		maxDepth: -1, // Allow max depth when add group. <=0: no limit; 1: can only add to root; 2: max 2 depth from root; ...
		//
		showIcon: false,
		showIconGroupImage: "image/tree/group.gif",
		showIconGroupOpenImage: "image/tree/group-open.gif",
		showIconItemImage: "image/tree/item.gif",
		onShowIconItemImage: null, // onShowIconItemImage(id) return image URL to replace "showIconItemImage"
		//
		showElbow: false,
		showElbowImage: "image/tree/elbow.gif",
		showElbowLineImage: "image/tree/elbow-line.gif",
		showElbowEndImage: "image/tree/elbow-end.gif",
		showElbowPadding: false, // Padding parents instead of use group body margin, used when showElbow is false.
		//
		showColumn: false,
		showColumnMargin: 4,
		showColumnPosList: [], // Position list in "px". ex: ["200", "250", "300"]. The last pos can be used to set width only without value.
		onShowColumnValueList: null, // onShowColumnValueList(itemId) return columnValidList like [123, "abc", {value: 1, text: "One"} ]
		//
		showGroupVisibleItemCount: false, // If true, show group's direct visible item count in group name span: <group name> (<visible item count>)
		//
		singleClickNode: true, // If true, select only group or item node, otherwise can select both group and item node
		onGroupClick: null, // onGroupClick(id)
		onItemClick: null, // onItemClick(id, name)
		onItemDblClick: null, // onItemDblClick(id)
		showMouseOverOut: true, // If true, will deal with mouseover and mouseout event
		onItemMouseOver: null, // onItemMouseOver(id), used when showMouseOverOut is true
		onItemMouseOut: null,  // onItemMouseOut(id),  used when showMouseOverOut is true
		onItemContextMenu: null, // onItemContextMenu(id, event)
		onShowHint: null, // onShowHint(msg)
		//
		inplaceEditable: false,   // If true, can edit group name or item name inplace on tree node (only effect when 'editable' is true)
		onInplaceGroupEdit: null, // onInplaceGroupEdit(id,name,parentId), trigger when inplace group edit end (has set name)
		onInplaceItemEdit: null,  // onInplaceItemEdit(id,name,groupId), trigger when inplace group edit end (has set name)
		itemLabelMaxLength: 20,		//max length of label
		//
		onGroupDragEnd: null,     // onGroupDragEnd(id,name,parentId), new parentId, trigger when group drag end (dragged)
		onItemDragEnd: null,      // onItemDragEnd(id,name,groupId), new groupId, trigger when item drag end (dragged)
		// Styles
		styleGroupDiv: null,
		styleItemDiv: null,
		styleItemHover: null,
		//
		hidden: false,
		isGroupSelectionMode: false
	},
	
	/**
	 * @param groupId
	 * @return groupId or null if invalid
	 */
	selectGroup: function(groupId){
		if(groupId && this._groupInfoMap[groupId]){
			this._selectGroup(groupId);
			return groupId;
		}
		return null;
	},
	
	/**
	 * @param itemId: (optional) itemId, if null, will use the first item
	 * @return itemId
	 */
	selectItem: function(itemId, isNoNeedTrigger){
		// If no itemId, select the first item
		if(!itemId){
			for(var k in this._itemInfoMap){
				itemId = k;
				break;
			}
		}
		if(itemId){
			this._clickItem(itemId, isNoNeedTrigger);
		}
		return itemId;
	},
	
	/**
	 * Used when multiSelect is true
	 * @return map of selected groups id=>name
	 */
	getSelectGroupMap: function(data){
		var names = {};
		if(!this.options.multiSelect){
			return names;
		}
		var groups = this._groupInfoMap;
		for(var id in groups){
			var groupInfo = groups[id];
			if(!groupInfo || !groupInfo.checkBoxDiv || !groupInfo.checkBoxDiv.is(":checked") ){
				continue;
			}
			names[id] = groupInfo.name;
		}
		return names;
	},
	
	/**
	 * When multiSelect is true, return multi items. Otherwise return selected item
	 * @return map of selected items id=>name
	 */
	getSelectItemMap: function(data){
		var names = {};
		var items = this._itemInfoMap;
		if(!this.options.multiSelect){
			if(this._itemId && items[this._itemId]){
				var itemInfo = items[this._itemId];
				names[this._itemId] = itemInfo.name;
			}
			return names;
		}
		for(var id in items){
			var itemInfo = items[id];
			if(!itemInfo.checkBoxDiv.is(":checked") ){
				continue;
			}
			names[id] = itemInfo.name;
		}
		return names;
	},
	
	/**
	 * @return selected groupId, or null if no group selected
	 */
	getSelectGroupId: function(){
		return this._groupId;
	},
	
	/**
	 * @return selected itemId, or null if no item selected
	 */
	getSelectItemId: function(){
		return this._itemId;
	},
	
	/**
	 * @return group name
	 */
	getGroupName: function(groupId){
		var groupInfo = this._groupInfoMap[groupId];
		if(groupInfo){
			return groupInfo.name;
		}
		return "";
	},
	
	/**
	 * Use this function when "editable"
	 * @param groupInfo: null to get from root
	 * @return groupTree with same format as this.options.groupTree
	 */
	getGroupTree: function(groupInfo){
		if(!this._editable){
			return null;
		}
		this._inplaceEditClose();
		var tree = {};
		if(!groupInfo){
			var rootGroupInfo = this._groupInfoMap[ this._treeRootId ];
			if(!rootGroupInfo){
				return null;
			}
			groupInfo = rootGroupInfo;
			tree.id = (groupInfo.id == this._treeRootIdDefault) ? "" : this._treeRootId;
			tree.name = (groupInfo.name == this._treeRootNameDefault) ? "" : this._treeRootName;;
		}else{
			tree.id = groupInfo.id;
			tree.name = groupInfo.name;
		}
		tree.subGroupMap = {};
		tree.itemList = [];
		// subGroupMap
		for(var subGroupId in groupInfo.subGroupMap){
			var subGroupInfo = groupInfo.subGroupMap[subGroupId];
			if(subGroupInfo){
				tree.subGroupMap[ subGroupId ] = this.getGroupTree(subGroupInfo);
			}
		}
		// itemList
		for(var i=0;i<groupInfo.itemList.length;i++){
			var itemInfo = groupInfo.itemList[i];
			if(!itemInfo){
				continue;
			}
			var item = {};
			item.id  = itemInfo.id;
			item.name = itemInfo.name;
			tree.itemList.push(item);
		}
		//
		return tree;
	},
	
	/**
	 * Refresh group tree
	 */
	setGroupTree: function(groupTree){
		logger.debug("setGroupTree","devicepicker");
		var mainDiv = this.element;
		//
		this._selectItemIdSet = {};
		this._groupInfoMap = {};
		this._itemInfoMap = {};
		this._itemId = null;
		this._groupId = null;
		//
		if(this._inplaceEditable){
			this._inplaceEditClose();
			this._inplaceGroupId = null;
			this._inplaceItemId  = null;
		}
		mainDiv.empty();
		var groupDiv = this._renderGroup(groupTree);
		mainDiv.append(groupDiv);
	},
	
	/**
	 * @parem parentGroupId: (optional) the group to append to. if null, will use selected group, or treeRoot
	 * @return 0 for success, -1 for fail, otherwise error string
	 */
	addGroup: function(groupId, groupName, parentGroupId, isInplaceEdit){
		if(!this._editable){
			return -1;
		}
		if(this._inplaceEditing){
			return -1;
		}
		if(!groupId || !groupName){
			logger.debug("Invalid groupId '"+groupId+"' or groupName '"+groupName+"'");
			return -1;
		}
		var groupInfo = this._groupInfoMap[groupId];
		if(groupInfo){// Do not add duplicate group (with same groupId)
			logger.debug("Group with groupId '"+groupId+"' already exists, can not add group with duplicate id");
			return "Can not add group with duplicate id";
		}
		// The parent group must exist
		if(!parentGroupId){
			if(this._groupId){
				parentGroupId = this._groupId;
			}else{
				parentGroupId = this._treeRootId;
			}
		}
		var parentGroupInfo = this._groupInfoMap[parentGroupId];
		if(!parentGroupInfo){
			logger.debug("Invalid parent group");
			return -1;
		}
		// Expand all parents
		var pg = parentGroupInfo;
		while(true){
			if(!pg.visible){
				this._expandCollapseGroup(pg.id);
			}
			// Next
			if(pg.parentGroup){
				pg = pg.parentGroup;
			}else{
				break;
			} 
		}
		// Create group
		var group = {id: groupId, name: groupName, depth: (parentGroupInfo.depth+1) };
		var groupDiv = this._renderGroup(group, parentGroupInfo, true);
		// Add group to parent (See also _renderGroup() "subGroupMap" part)
		parentGroupInfo.subGroupDiv.append(groupDiv);
		groupInfo = this._groupInfoMap[ groupId ];
		groupInfo.parentGroup = parentGroupInfo;
		parentGroupInfo.subGroupMap[ groupId ] = groupInfo;
		parentGroupInfo.subGroupIdList.push(groupId);
		
		// Update elbow
		if(this.options.showElbow){
			this._renderElbowParent(parentGroupInfo);
		}
		
		// Success
		if(isInplaceEdit){
			var self = this;
			// If not use setTimeout, when key press ENTER on add button, the inplace editor will get keyup event and wrongly be closed
			setTimeout(function(){
				self._selectGroup(groupId); // Select new group for delete. #VTWEB-490
				self.inplaceEditGroup(groupId,null,null,true,true);
				if($.isFunction( self.options.onGroupClick) ){
					self.options.onGroupClick(groupId);
				}
			},100);
		}
		return 0;
	},
	
	/**
	 * @return 0 for success, -1 for fail, otherwise error string
	 */
	addItem: function(itemId, itemName, parentGroupId){
		if(!this._editable){
			return -1;
		}
		if(!itemId || !itemName){
			logger.debug("Invalid itemId '"+itemId+"' or itemName '"+itemName+"'");
			return -1;
		}
		var itemInfo = this._itemInfoMap[itemId];
		if(itemInfo){// Do not add duplicate item (with same itemId)
			logger.debug("Item with itemId '"+itemId+"' already exists, can not add item with duplicate id");
			return "Can not add item with duplicate id";
		}
		// The parent group must exist
		if(!parentGroupId){
			if(this._groupId){
				parentGroupId = this._groupId;
			}else{
				parentGroupId = this._treeRootId;
			}
		}
		var parentGroupInfo = this._groupInfoMap[parentGroupId];
		if(!parentGroupInfo){
			logger.debug("Invalid parent group");
			return -1;
		}
		// Create item
		var item = {id: itemId, name: itemName};
		var itemDiv = this._renderItem(item, parentGroupId);
		// Add item to parent (See also _renderGroup() "itemList" part)
		parentGroupInfo.itemListDiv.append(itemDiv);
		var itemInfo = this._itemInfoMap[itemId];
		parentGroupInfo.itemList.push( itemInfo );
		// Success
		return 0;
	},
	
	/**
	 * Update groupName
	 * @param groupName: new group name
	 * @param groupId: (optional) the group to update. if null, will use selected group
	 * @return 0 for success, -1 for fail, otherwise error string
	 */
	updateGroup: function(groupName, groupId, newGroupId){
		this._inplaceEditClose();
		if(!groupName){
			return -1;
		}
		if(!groupId){
			if(this._groupId){
				groupId = this._groupId;
			}
			if(!groupId){
				logger.debug("Invalid group id: '"+groupId+"'");
				return -1;
			}
		}
		if(groupId == this._treeRootId){
			return "Can not update root";
		}
		var groupInfo = this._groupInfoMap[groupId];
		if(groupInfo){
			groupInfo.titleDiv.text(groupName);
			groupInfo.name = groupName;
		}
		// Update groupId (Used when create group). Use removeGroup() and addGroup()
		// Update groupInfo references is not enough, because div bind events will still use old groupId 
		if(newGroupId && newGroupId != groupId){
			var newGroupInfo = this._groupInfoMap[newGroupId];
			if(!newGroupInfo && groupInfo.parentGroup){
				var parentGroupId = groupInfo.parentGroup.id;
				var isSelect = (this._groupId == groupId) ? true : false;
				if(isSelect){
					this._selectGroup(null);
				}
				this.removeGroup(groupId);
				this.addGroup(newGroupId, groupName, parentGroupId);
				//
				if(isSelect){
					this._selectGroup(newGroupId);
				}
			}
		}
		//
		return 0;
	},
	
	/**
	 * Update itemName
	 * @param itemName: new item name
	 * @param itemId: (optional) the item to update. if null, will use selected item
	 * @return 0 for success, -1 for fail, otherwise error string
	 */
	updateItem: function(itemName, itemId){
		this._inplaceEditClose();
		if(!itemName){
			return -1;
		}
		if(!itemId){
			if(this._itemId){
				itemId = this._itemId;
			}
			if(!itemId){
				logger.debug("Invalid item id: '"+itemId+"'");
				return -1;
			}
		}
		var itemInfo = this._itemInfoMap[itemId];
		if(itemInfo){
			itemInfo.titleDiv.text(itemName);
			itemInfo.name = itemName;
		}
		return 0;
	},
	
	updateItemIcon: function(itemId, iconUrl){
		var itemInfo = this._itemInfoMap[itemId];
		if(itemInfo && itemInfo.iconDiv){
			itemInfo.iconDiv.attr("src", iconUrl);
			itemInfo.iconUrl = iconUrl;
		}
	},
	
	/**
	 * @param columnValueList: list of number, string or map {value:?, text:?}, value for sort and text for display
	 * Example: [123, "abc", {value: 1, text: "One"} ]
	 */
	updateItemColumn: function(itemId, columnValueList){
		if(!columnValueList){
			return;
		}
		if(!this.options.showColumn){
			return;
		}
		if(!this.options.showColumnPosList || this.options.showColumnPosList.length==0){
			return;
		}
		var itemInfo = this._itemInfoMap[itemId];
		if(!itemInfo || !itemInfo.columnDiv){
			return;
		}
		// Skip update for same value list
		var columnValue = itemInfo.columnValue;
		if(columnValue != null && columnValue.length >= columnValueList.length){
			var isSame = true;
			for(var i=0; i<columnValueList.length; i++){
				var newValue = this._updateItemColumnGetValue(columnValueList, i);
				var oldValue = this._updateItemColumnGetValue(columnValue, i);
				if(newValue != oldValue ){
					isSame = false;
					break;
				}
			}
			if(isSame){
				return;
			}
			// Update itemInfo.columnValue
			for(var i=0; i<columnValueList.length; i++){
				itemInfo.columnValue[i] = columnValueList[i];
			}
		}else{
			// Update itemInfo.columnValue
			itemInfo.columnValue = columnValueList;
		}
		//
		this._updateItemColumn(itemInfo.columnDiv, columnValueList);
	},
	
	_updateItemColumn: function(columnDiv, columnValueList){
		if(!columnDiv){
			return;
		}
		// Update when already have column spans
		var clist = columnDiv.children();
		if(clist.length >= columnValueList.length){
			for(var i=0; i<columnValueList.length; i++){
				var value = this._updateItemColumnGetValue(columnValueList, i); 
				var span = $(clist[i]);
				span.text(value);
				span.attr("title", value);
			}
			return;
		}
		// Render column list by empty() and column spans
		var posList = this.options.showColumnPosList;
		var margin  = this.options.showColumnMargin;
		
		columnDiv.empty();
		var columnSpanList = [];
		var columnLeftList = [];
		for(var i=0; i<posList.length; i++){
			var isLast = ( i==(posList.length-1) );
			var pos = posList[i];
			var value = this._updateItemColumnGetValue(columnValueList, i);
			// Skip empty last column
			if(isLast && value==""){
				break;
			}
			var widthStr = "";
			if(!isLast){
				var width = posList[i+1] - pos - margin;
				widthStr = "width:"+width+"px;"; 
			}
			// Use absolute position to the non-static parent. It is better to set "this" div as "position:relative"
			var span = $("<span class='web-tree-item-column' style='left:"+pos+"px;"+widthStr+"' title='"+value+"'>"+value+"</span>");
			columnDiv.append(span);
		}
	},
	
	/**
	 * @param isSort (optional): Used by object column only: true to get .value instead of .text for sort
	 */
	_updateItemColumnGetValue: function(columnValueList, index, isSort){
		if(!columnValueList || index<0 || index >= columnValueList.length){
			return "";
		}
		var column = columnValueList[index] ? columnValueList[index] : "";
		if($.isPlainObject(column) ){
			if(isSort){
				column = column.value;
			}else{
				column = column.text;
			}
		}
		return column;
	},
	
	/**
	 * Adjust titleDiv style to not overflow to columns
	 * Used offset() so can only be done when div is visible, otherwise offset().left will be invalid 0
	 */
	_updateItemColumnAdjustTitle: function(){
		if(!this.options.showColumn){
			return;
		}
		//
		var margin = this.options.showColumnMargin;
		var widthMap = {};
		var count = 0;
		var invalidCount = 0;
		for(var itemId in this._itemInfoMap){
			var itemInfo = this._itemInfoMap[itemId];
			if(!itemInfo || !itemInfo.columnDiv){
				continue;
			}
			var firstColumnLeft = 0;
			var clist = itemInfo.columnDiv.children();
			if(clist && clist.length>0){
				firstColumnLeft = $(clist[0]).offset().left;
			}
			//
			var titleDiv = itemInfo.titleDiv;
			var left = titleDiv.offset().left;
			if(firstColumnLeft && left){
				var width = (firstColumnLeft - left - margin);
				var cw = titleDiv.width();
				if(width != cw){
					widthMap[itemId] = width;
					count++;
				}
			}else{
				invalidCount++;
			}
		}
		logger.debug("updateItemColumnAdjustTile: count="+count+", invalidCount="+invalidCount);
		// Update all after hide mainDiv can gain performance?: var mainDiv = this.element; mainDiv.hide(); ...; mainDiv.show();
		for(var itemId in widthMap){
			var width = widthMap[itemId];
			var itemInfo = this._itemInfoMap[itemId];
			itemInfo.titleDiv.css({
				"display": "inline-block",
				"overflow": "hidden",
				"white-space": "nowrap",
				"width": width
			});
		}
	},
	
	updateItemVisible: function(visibleItemIdList){
		var visibleItemMap = {};
		for(var i=0; i<visibleItemIdList.length; i++){
			var id = visibleItemIdList[i];
			visibleItemMap[id] = true;
		}
		// Hide main div first and show later when there are many items to hide.
		// Otherwise, will be slow in Chrome when hide all 1000 devices. (Takes 10+ seconds)
		var hideCountThreshod = 100;
		var hideCount  = 0;
		for(var itemId in this._itemInfoMap){
			var itemInfo = this._itemInfoMap[itemId];
			if(itemInfo && !itemInfo.hideWhole && !(visibleItemMap[itemId]) ){
				hideCount++;
				if(hideCount > hideCountThreshod){
					break;
				}
			}
		}
		var hasManyHideItem = (hideCount > hideCountThreshod);
		// Before
		if(hasManyHideItem){
			this.element.hide();
		}
		// Hide items
		for(var itemId in this._itemInfoMap){
			this._hideWholeItem(itemId, (visibleItemMap[itemId] ? true : false) );
		}
		// Update visible item count (optional)
		if(this.options.showGroupVisibleItemCount){
			for(var groupId in this._groupInfoMap){
				this._updateGroupVisibleItemCount(groupId);
			}
		}
		// After
		if(hasManyHideItem){
			this.element.show();
		}
	},
	
	_hideWholeItem: function(itemId, visible){
		var itemInfo = this._itemInfoMap[itemId];
		if(!itemInfo || !itemInfo.dragDiv){
			return;
		}
		if(visible && !itemInfo.hideWhole){
			return;
		}else if(!visible && itemInfo.hideWhole){
			return;
		}
		if(visible){
			itemInfo.dragDiv.show();
			itemInfo.hideWhole = false;
		}else{
			itemInfo.dragDiv.hide();
			itemInfo.hideWhole = true;
		}
		this._hideWholeGroup(itemInfo.groupId, visible);
	},
	
	/**
	 * Hide whole group only when all sub groups and items are hided
	 * @see _checkParentGroup() for similar code logic
	 */
	_hideWholeGroup: function(groupId, visible){
		var groupInfo = this._groupInfoMap[groupId];
		if(!groupInfo || !groupInfo.dragDiv){
			return;
		}
		if(groupInfo.parentGroup == null){// Do not hide root
			return;
		}
		if(visible && !groupInfo.hideWhole){
			return;
		}else if(!visible && groupInfo.hideWhole){
			return;
		}
		//
		if(visible){
			groupInfo.dragDiv.show();
			groupInfo.hideWhole = false;
			if(groupInfo.parentGroup != null){
				this._hideWholeGroup(groupInfo.parentGroup.id, true);
			}
		}else{
			var hasChildVisible = false;
			var itemList = groupInfo.itemList;
			for(var i=0;i<itemList.length;i++){
				var info = itemList[i];
				if(!info.hideWhole){
					hasChildVisible = true;
					break;
				}
			}
			if(!hasChildVisible){
				var subGroupMap = groupInfo.subGroupMap;
				for(var subGroupId in subGroupMap){
					var subGroup = subGroupMap[ subGroupId ];
					if(!subGroup.hideWhole ){
						hasChildVisible = true;
						break;
					}
				}
			}
			if(!hasChildVisible){
				groupInfo.dragDiv.hide();
				groupInfo.hideWhole = true;
				if(groupInfo.parentGroup != null){
					this._hideWholeGroup(groupInfo.parentGroup.id, false);
				}
			}
		}
	},
	
	_updateGroupVisibleItemCount: function(groupId){
		var groupInfo = this._groupInfoMap[groupId];
		if(!groupInfo || !groupInfo.itemList || groupInfo.itemList.length==0 || !groupInfo.titleDiv){
			return;
		}
		var itemList = groupInfo.itemList;
		var visibleCount = 0;
		for(var i=0; i<itemList.length; i++){
			var item = itemList[i];
			if(!item.hideWhole){
				visibleCount++;
			}
		}
		if(visibleCount != groupInfo.visibleItemCount){
			groupInfo.visibleItemCount = visibleCount;
			var s = " (" + visibleCount + ")";
			groupInfo.titleDiv.text(groupInfo.name + s);
		}
	},
	
	/**
	 * Sort items for each group
	 * @param columnPos: -2 to sort by icon, -1 to sort by name, 0, 1, ... for column
	 * @param asc (optional): undefined - decide automatically; true - asc; false - desc
	 */
	sortItem: function(columnPos, asc){
		if(asc == null){
			if(this._sortColumnPos == columnPos){
				asc = !(this._sortAsc);
			}else{
				asc = true;
			}
		}
		logger.debug("sortItem: columnPos="+columnPos+", asc="+asc)
		// Save current sort options
		this._sortColumnPos = columnPos;
		this._sortAsc       = asc;
		// Sort for each group
		for(var groupId in this._groupInfoMap){
			var groupInfo = this._groupInfoMap[groupId];
			var itemList = groupInfo.itemList;
			if(!itemList || itemList.length==0){
				continue;
			}
			var itemListDiv = groupInfo.itemListDiv;
			var children = itemListDiv.children();
			var valueMap = {};
			var domDivMap = {};
			for(var i=0; i<itemList.length; i++){
				var item = itemList[i];
				var id = item.id;
				if(columnPos == -2){// -2 sort by icon
					valueMap[id ] = item.iconUrl;
				}else if(columnPos == -1){// -1 sort by name
					valueMap[id ] = item.name;
				}else{// column
					valueMap[id ] = this._updateItemColumnGetValue(item.columnValue, columnPos, true);
				}	
				domDivMap[id ] = children[i];
			}
			// Bubble sort for itemList. Do not sort div here.
			var temp = null;
			var isWholeMod = false;
			for(var i=itemList.length; i>0; i--){
				var isMod = false;
				for(var j=0; j<(i-1); j++){
					var itemA = itemList[j];
					var itemB = itemList[j + 1];
					var a = valueMap[itemA.id];
					var b = valueMap[itemB.id];
					if((asc && a>b) || (!asc && a<b) ){
						isMod = true;
						// Swap itemList
						temp = itemList[j];
						itemList[j] = itemList[j+1];
						itemList[j+1] = temp;
					}
				}
				if(!isMod){
					break;
				}else{
					isWholeMod = true;
				}
			}
			if(isWholeMod){
				// Use DOM DocumentFragment to sort div
				var frag = document.createDocumentFragment();
				for(var i=0; i<itemList.length; i++){
					var id = itemList[i].id;
					var div = domDivMap[id];
					frag.appendChild(div);
				}
				itemListDiv[0].appendChild(frag);
			}
		}
	},
	
	/**
	 * @param groupId: (optional) the group to remove. if null, will use selected group
	 * @return 0 for success, -1 for fail, otherwise error string
	 */
	removeGroup: function(groupId){
		this._inplaceEditClose(true);
		if(!groupId && this._groupId){
			groupId = this._groupId;
		}
		//
		var checkStatus = this.removeGroupCheck(groupId);
		if(checkStatus != 0 ){
			logger.debug("removeGroup: "+checkStatus);
			return checkStatus;
		}
		//
		var selectGroupId = null; // After delete, select group in priority: [1]Next sibling. [2]Previous sibling. [3]Parent.
		var groupInfo = this._groupInfoMap[groupId];
		// Remove parent's reference
		var parentGroupInfo = groupInfo.parentGroup;
		if(parentGroupInfo!=null){
			for(var id in parentGroupInfo.subGroupMap){
				if(id == groupId){
					// Delete from map
					delete parentGroupInfo.subGroupMap[id];
					// Delete from id list
					var idList = parentGroupInfo.subGroupIdList;
					for(var i=0;i<idList.length;i++){
						if(idList[i] == id){
							if(i<(idList.length-1) ){
								selectGroupId = idList[i+1];
							}else if(i>0){
								selectGroupId = idList[i-1];
							}else{
								selectGroupId = parentGroupInfo.id;
							}
							//
							idList.splice(i,1);
							break;
						}
					}
					//
					break;
				}
			}
		}
		// Update check status (step 1: save status)
		var needCheckParent = false;
		if(this.options.multiSelect){
			if(groupInfo.checkBoxDiv.is(":checked")){
				needCheckParent = true;
			}
		}
		// Remove div
		groupInfo.dragDiv.remove();
		// Remove self
		delete this._groupInfoMap[groupId];
		// Update check status (step 2: action after remove)
		if(needCheckParent){
			this._checkParentGroup(parentGroupInfo,false);
		}
		// Update elbow
		if(this.options.showElbow){
			this._renderElbowParent(parentGroupInfo);
		}
		// Reset
		if(this._groupId == groupId){
			this._groupId = null;
		}
		// Select group
		if(selectGroupId){
			this._selectGroup(selectGroupId);
		}
		// Success
		return 0;
	},
	
	/**
	 * @param groupId: (optional) the group to remove. if null, will use selected group
	 * @return 0 for success, -1 for fail, otherwise error string
	 */
	removeGroupCheck: function(groupId, isSkipSubGroupCheck){
		if(!this._editable){
			return -1;
		}
		if(!groupId && this._groupId){
			groupId = this._groupId;
		}
		if(!groupId){
			return "Invalid group id: '"+groupId+"'";
		}
		if(groupId == this._treeRootId){
			return "Can not remove root";
		}
		var groupInfo = this._groupInfoMap[groupId];
		if(!groupInfo){
			return "Invalid group id: '"+groupId+"'";
		}
		if(groupInfo.itemList.length>0){
			return "Can not remove group with items";
		}
		var hasSubGroup = false;
		for(var k in groupInfo.subGroupMap){
			hasSubGroup = true;
			break;
		}
		if(!isSkipSubGroupCheck && hasSubGroup){
			return "Can not remove group with sub groups";
		}
		// Success
		return 0;
	},
	
	/**
	 * @return 0 for success, -1 for fail, otherwise error string
	 */
	removeItem: function(itemId){
		this._inplaceEditClose();
		if(!itemId && this._itemId){
			itemId = this._itemId;
		}
		//
		var checkStatus = this.removeItemCheck(itemId);
		if(checkStatus != 0 ){
			logger.debug("removeItem: "+checkStatus);
			return checkStatus;
		}
		//
		var itemInfo = this._itemInfoMap[itemId];
		// Remove parent's reference
		var parentGroupInfo = this._groupInfoMap[ itemInfo.groupId ];
		if(parentGroupInfo!=null && parentGroupInfo.itemList!=null){
			for(var i=0;i<parentGroupInfo.itemList.length;i++){
				if(parentGroupInfo.itemList[i] == itemInfo){
					parentGroupInfo.itemList.splice(i,1);
					break;
				}
			}
		}
		// Update check status (step 1: save status)
		var needCheckParent = false;
		if(this.options.multiSelect){
			if(itemInfo.checkBoxDiv.is(":checked")){
				needCheckParent = true;
			}
		}
		// Remove div
		itemInfo.dragDiv.remove();
		// Remove self
		delete this._itemInfoMap[itemId];
		// Update check status (step 2: action after remove)
		if(needCheckParent){
			this._checkParentGroup(parentGroupInfo,false);
		}
		// Reset
		this._itemId = null;
		// Success
		return 0;
	},
	
	/**
	 * @return 0 for success, -1 for fail, otherwise error string
	 */
	removeItemCheck: function(itemId){
		if(!this._editable){
			return -1;
		}
		if(!itemId && this._itemId){
			itemId = this._itemId;
		}
		if(!itemId){
			return "Invalid item id: '"+itemId+"'";
		}
		var itemInfo = this._itemInfoMap[itemId];
		if(!itemInfo){
			return "Invalid item id: '"+itemId+"'";
		}
		// Success
		return 0;
	},
	
	/**
	 * @return Edit status when editable
	 * {
	 *   canAddGroup: <true|false>
	 *   canAddItem: <true|false>
	 *   canUpdateGroup: <true|false>
	 *   canUpdateItem: <true|false>
	 *   canRemoveGroup: <true|false>
	 *   canRemoveItem: <true|false>
	 *   subGroupCount: <0,1,2...>
	 * }
	 */
	getEditStatus: function(){
		var status = {};
		status.canAddGroup    = false;
		status.canAddItem     = false;
		status.canUpdateGroup = false;
		status.canUpdateItem  = false;
		status.canRemoveGroup = false;
		status.canRemoveItem  = false;
		//
		status.subGroupCount  = 0;
		//
		if(!this._editable){
			return status;
		}
		if(this._groupId){
			var groupInfo = this._groupInfoMap[ this._groupId ];
			status.canAddGroup    = this._inplaceEditing ? false : true;
			if(this.options.maxDepth && this.options.maxDepth>0){
				if(groupInfo.depth >= this.options.maxDepth){
					status.canAddGroup = false;
				}
			}
			status.canAddItem     = this._inplaceEditing ? false : true;
			status.canRemoveGroup = (this.removeGroupCheck(this._groupId, true) == 0);
			status.canUpdateGroup = (this._groupId != this._treeRootId);
			//
			var subGroupCount = 0;
			for(var k in groupInfo.subGroupMap){
				subGroupCount++;
			}
			status.subGroupCount  = subGroupCount;
		}
		if(this._itemId){
			status.canRemoveItem  = true;
			status.canUpdateItem  = true;
		}
		return status;
	},
	
	/**
	 * @param groupId: (optional) the group to edit. if null, will use selected group
	 * @param style: CSS style for the input
	 * @param tip: Title tip for the input
	 * @return 0 for success, -1 for fail, otherwise error string
	 */
	inplaceEditGroup: function(groupId, style, tip, isSelect, isAddGroup){
		this._inplaceAddGroup = false; // Reset _inplaceAddGroup to false first. Because _inplaceEditClose() will use _inplaceAddGroup
		this._inplaceEditClose();
		if(!this._inplaceEditable){
			return -1;
		}
		if(!groupId && this._groupId){
			groupId = this._groupId;
		}
		if(!groupId){
			return "Invalid group id: '"+groupId+"'";
		}
		if(groupId == this._treeRootId){
			return "Can not edit root";
		}
		var groupInfo = this._groupInfoMap[groupId];
		if(!groupInfo){
			return "Invalid group id: '"+groupId+"'";
		}
		// Render inplace editor
		this._inplaceEditOpen( groupInfo.titleDiv, style, tip, isSelect);
		this._inplaceGroupId = groupId;
		this._inplaceAddGroup = isAddGroup;
		// Success
		return 0;
	},
	
	/**
	 * @param itemId: (optional) the item to edit. if null, will use selected item
	 * @param style: CSS style for the input
	 * @param tip: Title tip for the input
	 * @return 0 for success, -1 for fail, otherwise error string
	 */
	inplaceEditItem: function(itemId, style, tip, isSelect){
		this._inplaceEditClose();
		if(!this._inplaceEditable){
			return -1;
		}
		if(!itemId && this._itemId){
			itemId = this._itemId;
		}
		if(!itemId){
			return "Invalid item id: '"+itemId+"'";
		}
		var itemInfo = this._itemInfoMap[itemId];
		if(!itemInfo){
			return "Invalid item id: '"+itemId+"'";
		}
		// Render inplace editor
		this._inplaceEditOpen( itemInfo.titleDiv, style, tip, isSelect);
		this._inplaceItemId = itemId;
		// Success
		return 0;
	},
	
	_inplaceEditOpen: function(titleDiv, style, tip, isSelect){
		if(!this._inplaceEditable){
			return -1;
		}
		var width = Math.min(titleDiv.width() + 40, 300); // Wider but with max
		this._inplaceInput.width( width );
		this._inplaceInput.height( titleDiv.height());
		this._inplaceInput.val( titleDiv.text() );
		titleDiv.empty();
		titleDiv.append(this._inplaceInput);
		this._inplaceInput.show();
		this._inplaceInput.focus();
		if(isSelect){
			this._inplaceInput.select();
		}
		// Can NOT bind the keyup event in _create(), because when move in DOM, the event will lose.
		var self = this;
		this._inplaceInput.keyup(function(event){
			if (event.which == 13) {// Enter
				self._inplaceEditClose();
			}
		});
		// Reset style and tip and set new style (if have)
		if(this._inplaceStyle){
			this._inplaceInput.removeClass(this._inplaceStyle);
			this._inplaceStyle = "";
		}
		if(this._inplaceTip){
			this._inplaceInput.attr("title", "");
			this._inplaceTip = "";
		}
		if(style){
			this._inplaceInput.addClass(style);
			this._inplaceStyle = style;
		}
		if(tip){
			this._inplaceInput.attr("title", tip);
			this._inplaceTip = tip;
		}
		//
		this._inplaceEditing = true;
	},
	
	_inplaceEditClose: function(isSkipFireEvent){
		if(!this._inplaceEditable || !this._inplaceEditing){
			return -1;
		}
		if(this._inplaceInput && this._inplaceInput.is(":visible") ){
			this._inplaceInput.hide();
		}
		if(isSkipFireEvent){
			this._inplaceGroupId = null;
			this._inplaceItemId  = null;
			this._inplaceEditing = false;
			return;
		}
		//
		var postSelectGroupId = null;
		var value = $.trim( this._inplaceInput.val() );
		if(this._inplaceGroupId){
			var groupInfo = this._groupInfoMap[ this._inplaceGroupId ];
			if(groupInfo){
				if(!value){// Restore to original name when empty. And return to continue edit
					value = groupInfo.name;
					this._inplaceInput.val(value);
					this._inplaceInput.show();
					this._inplaceInput.select();
					return;
				}else{
					var previousName = groupInfo.name; 
					groupInfo.titleDiv.text( value );
					groupInfo.name = value;
					// Fire onInplaceGroupEdit event when name changed
					if( (this._inplaceAddGroup || previousName!=value) && $.isFunction(this.options.onInplaceGroupEdit) ){
						var parentId = 0;
						if(groupInfo.parentGroup && groupInfo.parentGroup.id>0){
							parentId = groupInfo.parentGroup.id;
						}
						this.options.onInplaceGroupEdit(groupInfo.id, value, parentId);
					}else if($.isFunction(this.options.onGroupClick) ){
						// Do not fire onGroupClick event here, because _inplaceEditing is true now.
						postSelectGroupId = groupInfo.id;
					}
				}
			}
			this._inplaceGroupId = null;
		}else if(this._inplaceItemId){
			var itemInfo = this._itemInfoMap[ this._inplaceItemId ];
			this._inplaceItemId = null;
			if(itemInfo){
				if(!value){// Restore to original name when empty
					value = itemInfo.name;
					itemInfo.titleDiv.text( value );
				}else{
					itemInfo.titleDiv.text( value );
					itemInfo.name = value;
					if($.isFunction(this.options.onInplaceItemEdit) ){
						this.options.onInplaceItemEdit(itemInfo.id, value, itemInfo.groupId );
					}
				}
			}
		}
		//
		this._inplaceEditing = false;
		// Fire post group click event after set _inplaceEditing to false
		if(postSelectGroupId){
			this.options.onGroupClick(postSelectGroupId);
		}
	},
   
	/**
	 * Creation code for widget. Can use this.options, and this.element
	 */
	_create: function() {
		if (this.options.hidden) {
			this.element.hide(); 
		}
		var mainDiv = this.element;
		var self = this;
		////
		this._selectGroupIdSet = this.options.multiSelectGroupMap;
		if(!this._selectGroupIdSet){
			this._selectGroupIdSet = {};
		}
		this._selectItemIdSet = this.options.multiSelectItemMap;
		if(!this._selectItemIdSet){
			this._selectItemIdSet = {};
		}
		//
		this._groupInfoMap = {};
		this._itemInfoMap = {};
		this._groupId = null;
		this._itemId = null;
		// Editable
		this._editable = this.options.editable;
		this._dragGroupIdPrefix = "GROUP_TREE_GROUP_" + this.options.id + "_";
		this._dragItemIdPrefix  = "GROUP_TREE_ITEM_"  + this.options.id + "_";
		// Inplace editable
		this._inplaceEditable = (this._editable && this.options.inplaceEditable);
		if(this._inplaceEditable){
			this._inplaceGroupId = null;
			this._inplaceItemId  = null;
			this._inplaceInput   = $("<input type='input' style='display:none' maxLength='"+this.options.itemLabelMaxLength+"'/>");
			// Use style and tip to show warning
			this._inplaceStyle   = "";
			this._inplaceTip     = "";
			this._inplaceEditing = false;
			this._inplaceAddGroup= false;
		}
		// Sort
		this._sortColumnPos = -1;
		this._sortAsc       = true;
		//
		var groupTree = this.options.groupTree;
		// Root
		this._treeRootInit        = false;
		this._treeRootIdDefault   = -999;
		this._treeRootNameDefault = "***";
		this._treeRootId   = this._treeRootIdDefault;
		this._treeRootName = this._treeRootNameDefault;
		if(groupTree!=null){
			if(groupTree.id && groupTree.id>0){
				this._treeRootId = groupTree.id;
			}
			if(groupTree.name){
				this._treeRootName = groupTree.name;
			}
		}
		//
		var groupDiv = this._renderGroup(groupTree);
		// Default select root group when initial
		if(groupTree!=null && !this.options.multiSelect){
			this._selectGroup(this._treeRootId);
		}
		// Click to close inplaceEdit when not click on edit
		if(this._inplaceEditable && groupDiv){
			this._inplaceInput.click(function(event){// Skip click on edit
				if(event && event.stopPropagation){
					event.stopPropagation();
				}
			});
			groupDiv.click(function(event){
				if(self._inplaceEditing){
					self._inplaceEditClose();
				}
			});
		}
		mainDiv.append(groupDiv);
		// ShowColumn: Use position relative
		if(this.options.showColumn){
			mainDiv.css("position","relative");
		}
		// ShowColumn: Adjust item title style after mainDiv become visible. Watch by setInterval() timer
		this._showColumnTimer = null;
		if(this.options.showColumn && $.isFunction(this.options.onShowColumnValueList) ){
			var afterShowFunc = function(){
				if(!mainDiv.is(":visible") ){
					return;
				}
				clearInterval(self._showColumnTimer);
				self._showColumnTimer = null;
				// Real func
				self._updateItemColumnAdjustTitle();
			};
			this._showColumnTimer = setInterval(afterShowFunc, 500);
		}
	},
	
	/**
	 * Clear select for previous this._groupId and set new this._groupId
	 */
	_selectGroup: function(groupId){
		if(this._groupId == groupId){
			return;
		}
		// Clear previous group
		if(this._groupId){
			var prevGroupInfo = this._groupInfoMap[ this._groupId ];
			if(prevGroupInfo){
				var preTitleDiv = prevGroupInfo.titleDiv;
				if(preTitleDiv && this.options.isGroupSelectionMode){
					preTitleDiv.removeClass("web-tree-item-selected");
				}
			}
			this._groupId = null;
		}
		// Select current group
		this._groupId = groupId;
		if(!groupId){
			return;
		}
		var groupInfo = this._groupInfoMap[ this._groupId ];
		if(!groupInfo){
			return;
		}
		var titleDiv = groupInfo.titleDiv;
		if(titleDiv && this.options.isGroupSelectionMode){
			titleDiv.addClass("web-tree-item-selected");
		}
	},
	
	_selectItem: function(itemId){
		if(this._itemId == itemId || !itemId){
			return;
		}
		// Clear previous item
		if(this._itemId){
			var prevItemInfo = this._itemInfoMap[ this._itemId ];
			var preTitleDiv = prevItemInfo.titleDiv;
			if(preTitleDiv){
				preTitleDiv.removeClass("web-tree-item-selected");
			}
			var preColumnDiv = prevItemInfo.columnDiv;
			if(preColumnDiv){
				preColumnDiv.removeClass("web-tree-item-selected");
			}
			this._itemId = null;
		}
		// Select current item
		this._itemId = itemId;
		if(!itemId){
			return;
		}
		var itemInfo = this._itemInfoMap[ this._itemId ];
		var titleDiv = itemInfo.titleDiv;
		if(titleDiv){
			titleDiv.addClass("web-tree-item-selected");
		}
		var columnDiv = itemInfo.columnDiv;
		if(columnDiv){
			columnDiv.addClass("web-tree-item-selected");
		}
	},
	
	/**
	 * 1. Select group
	 * 2. Expand/Collapse group after group selected (Second click on same group)
	 */
	_clickGroup: function(groupId){
		var skipExpandCollapse = false; // Skip expand collapse when editing
		if(this._inplaceEditable){
			skipExpandCollapse = true; 
			if(this._inplaceGroupId != groupId ){
				if(this._inplaceGroupId){
					this._inplaceEditClose();
					return;
				}
			}else{
				return;
			}
		}
		//
		if(this.options.singleClickNode){
			// Clear previous item
			this._selectItem(null);
		}
		var isGroupSelected = false;
		if(this._groupId != groupId){
			this._selectGroup(groupId);
		}else{
			isGroupSelected = true;
		}
		// Edit when click after group selected (click twice)
		if(isGroupSelected && this._inplaceEditable && !this._inplaceEditing){
			this.inplaceEditGroup(groupId);
		}
		// When editable, Expand/Collapse group only when group selected. 
		if(this._editable){
			if(isGroupSelected && !skipExpandCollapse){
				this._expandCollapseGroup(groupId);
			}
		}else{// When not editable, Expand/Collapse. #VTWEB-469
			if(!skipExpandCollapse){
				this._expandCollapseGroup(groupId);
			}
		}
		if($.isFunction( this.options.onGroupClick) ){
			this.options.onGroupClick(groupId);
		}
	},
	
	_expandCollapseGroup : function(groupId){
		if(this._inplaceEditing){// Do not collapse when editing
			return;
		}
		var groupInfo = this._groupInfoMap[groupId];
		if(!groupInfo || !groupInfo.bodyDiv){
			return;
		}
		var hasChild = false;
		if(groupInfo.itemList.length>0){
			hasChild = true;
		}else{
			for(var subGroupId in groupInfo.subGroupMap){
				hasChild = true;
				break;
			}
		}
		var expandDiv = null;
		if(this.options.showExpandCollapse && groupInfo.expandDiv){
			expandDiv = groupInfo.expandDiv;
		}
		if(!hasChild){
			if(expandDiv){
				if(expandDiv.text() != "-"){
					expandDiv.text("-");
				}
			}
		}else{
			if(groupInfo.visible){
				groupInfo.bodyDiv.hide();
				if(expandDiv){
					expandDiv.text("+");
				}
			}else{
				groupInfo.bodyDiv.show();
				if(expandDiv){
					expandDiv.text("-");
				}
			}
			groupInfo.visible = !groupInfo.visible;
		}
		if(this.options.showIcon && groupInfo.iconDiv){
			var icon = groupInfo.visible ? this.options.showIconGroupOpenImage : this.options.showIconGroupImage;
			if(icon && groupInfo.iconDiv.attr("src") != icon){
				groupInfo.iconDiv.attr("src",icon);
			}
		}
	},
	
	/**
	 * Select item and clear previous selected item
	 */
	_clickItem: function(itemId, isNoNeedTrigger){
		if(this._inplaceEditable){
			if(this._inplaceItemId != itemId ){
				this._inplaceEditClose();
			}else{
				return;
			}
		}
		if(this.options.singleClickNode){
			// Clear previous group
			this._selectGroup(null);
		}
		this._selectItem(itemId);
		// Check/uncheck item
		var itemInfo = this._itemInfoMap[ itemId ];
		if(this.options.multiSelect && itemInfo && itemInfo.checkBoxDiv){
			if(itemInfo.checkBoxDiv.is(":checked")){
				itemInfo.checkBoxDiv.attr("checked",false);
			}else{
				itemInfo.checkBoxDiv.attr("checked",true);
			}
			this._checkItem(itemId);
		}
		//
		if($.isFunction( this.options.onItemClick) && !isNoNeedTrigger){
			this.options.onItemClick(itemId, itemInfo.name);
		}
	},
	
	/**
	 * When click group checkBox, check all items or uncheck all items
	 */
	_checkGroup: function(groupId, isChecked){
		if(!groupId){
			return;
		}
		var groupInfo = this._groupInfoMap[groupId];
		var groupCheckBox = groupInfo.checkBoxDiv;
		if(!groupCheckBox){
			return;
		}
		// Use param "isChecked" when iterate sub groups
		var checkStatus = false;
		if(isChecked!=undefined){// Iterate, use param and check group itself
			checkStatus = isChecked;
			groupCheckBox.attr("checked",isChecked);
		}else{// Initial, get status and check parent
			checkStatus = groupCheckBox.is(":checked");
			this._checkParentGroup(groupInfo.parentGroup, checkStatus );
		}
		// Check sub groups
		for(var subGroupId in groupInfo.subGroupMap){
			this._checkGroup(subGroupId,checkStatus);
		}
		// Check item list
		var itemList = groupInfo.itemList;
		if(!itemList || itemList.length==0){
			return;
		}
		if(checkStatus ){
			for(var i=0;i<itemList.length;i++){
				var itemInfo = itemList[i];
				itemInfo.checkBoxDiv.attr("checked",true);
			}
		}else{
			for(var i=0;i<itemList.length;i++){
				var itemInfo = itemList[i];
				itemInfo.checkBoxDiv.attr("checked",false);
			}
		}
	},
	
	/**
	 * When click item checkBox, check group when at least 1 child is checked.
	 */
	_checkItem: function(itemId){
		var itemInfo = this._itemInfoMap[ itemId ];
		if(!itemInfo){
			return;
		}
		// Select group when select item
		var groupId = itemInfo.groupId;
		if(!groupId){
			return;
		}
		var groupInfo = this._groupInfoMap[groupId];
		this._checkParentGroup(groupInfo, itemInfo.checkBoxDiv.is(":checked") );
	},
	
	_checkParentGroup: function(groupInfo, isChecked){
		if(this.options.multiSelectNotCheckParent && isChecked){
			return;
		}
		if(!groupInfo || !groupInfo.checkBoxDiv){
			return;
		}
		var groupCheckBox = groupInfo.checkBoxDiv;
		if(isChecked){
			if(groupCheckBox.is(":checked") ){
				return;// Stop iterate
			}
			groupCheckBox.attr("checked",true);
			var parentGroup = groupInfo.parentGroup;
			if(parentGroup!=null){
				this._checkParentGroup(parentGroup, true);
			}
		}else{
			var hasChildChecked = false;
			if(!this.options.multiSelectNotCheckParent){
				var itemList = groupInfo.itemList;
				for(var i=0;i<itemList.length;i++){
					var info = itemList[i];
					if(info.checkBoxDiv.is(":checked")){
						hasChildChecked = true;
						break;
					}
				}
				if(!hasChildChecked){
					for(var subGroupId in groupInfo.subGroupMap){
						var subGroup = groupInfo.subGroupMap[ subGroupId ];
						if(subGroup.checkBoxDiv.is(":checked") ){
							hasChildChecked = true;
							break;
						}
					}
				}
			}
			if(!hasChildChecked){
				groupCheckBox.attr("checked",false);
				var parentGroup = groupInfo.parentGroup;
				if(parentGroup!=null){
					this._checkParentGroup(parentGroup, false);
				}
			}
		}
	},
	
	/**
	 * Render group and sub groups recursively
	 */
	_renderGroup: function(group, parentGroup, isLastChild){
		var self = this;
		var styleGroupDiv = "";
		if(this.options.styleGroupDiv){
			styleGroupDiv = " class='"+this.options.styleGroupDiv+"'";
		}
		var groupDiv = $("<div"+styleGroupDiv+"></div>");
		var titleDiv = null;
		var bodyDiv = null;
		var groupExpand = null;
		var groupCheckBox = null;
		var iconDiv = null;
		var elbowDiv = null;
		if(this._editable && !this._treeRootInit && (!group.id || !group.name) ){
			// Add "Root" when edit (only one root)
			this._treeRootInit = true;
			if(!group.id){
				group.id   = this._treeRootId;
			}
			if(!group.name){
				group.name = this._treeRootName;
			}
		}
		if(group.id == this._treeRootId){
			group.depth = 0;
		}
		var groupId = group.id;
		if(group.id && group.name){
			var groupDivIdStr = "";
			if(this._editable){
				groupDivIdStr = " id='"+this._dragAddGroupIdPrefix(groupId)+"'";
			}
			titleDiv = $("<span class='web-tree-group' "+groupDivIdStr+">"+group.name+"</span>");
			if(this._editable){
				titleDiv.draggable({helper: "clone"});
				titleDiv.droppable({
					tolerance: "pointer",
					drop: function(event, ui ) {
						$(this).removeClass( "web-tree-droppable");
						$(this).removeClass( "web-tree-not-droppable");
						//
						var id = ui.draggable.attr("id");
						if(self._dragIsGroup(id)){
							var dragGroupId = self._dragDelGroupIdPrefix(id);
							self._dragGroupToGroup(groupId, dragGroupId);
						}else if(self._dragIsItem(id)){
							var dragItemId = self._dragDelItemIdPrefix(id);
							self._dragItemToGroup(groupId, dragItemId);
						}else{
							logger.debug("droped, groupId="+groupId+", drag object unknown");
						}
					},
					over: function(event, ui ) {
						var checkStatus = -1;
						var id = ui.draggable.attr("id");
						if(self._dragIsGroup(id)){
							var dragGroupId = self._dragDelGroupIdPrefix(id);
							checkStatus = self._dragGroupToGroupCheck(groupId, dragGroupId);
						}else if(self._dragIsItem(id)){
							var dragItemId = self._dragDelItemIdPrefix(id);
							checkStatus = self._dragItemToGroupCheck(groupId, dragItemId);
						}
						if(checkStatus == 0){
							$(this).addClass( "web-tree-droppable");
						}else{
							$(this).addClass( "web-tree-not-droppable");
						}
					},
					out: function(event, ui ) {
						$(this).removeClass( "web-tree-droppable");
						$(this).removeClass( "web-tree-not-droppable");
					}
				});
				if(this._inplaceEditable){
					titleDiv.dblclick(function(){
						if(!self._inplaceEditing){
							self.inplaceEditGroup(groupId);
							if($.isFunction( self.options.onGroupClick) ){
								self.options.onGroupClick(groupId);
							}
						}
					});
				}
			}
			// Padding
			var bodyDivCss = "web-tree-body-margin";
			if(this.options.showElbow || this.options.showElbowPadding){
				bodyDivCss = "web-tree-body";
				elbowDiv = $("<span></span>");
				this._renderElbow(elbowDiv, parentGroup, isLastChild);
				groupDiv.append(elbowDiv);
			}
			//
			if(this.options.showExpandCollapse){
				groupExpand = $("<span class='web-tree-expand-collapse'>-</span>");
				groupDiv.append(groupExpand);
			}
			if(this.options.multiSelect){
				groupCheckBox = $("<input type='checkbox' class='web-tree-checkbox'/>");
				if(this._selectGroupIdSet[groupId]){
					groupCheckBox.attr("checked",true);
				}
				groupDiv.append(groupCheckBox);
			}
			if(this.options.showIcon){
				var icon =  this.options.showIconGroupOpenImage ? this.options.showIconGroupOpenImage : this.options.showIconGroupImage;
				if(icon){
					iconDiv = $("<img src='"+icon+"' class='web-tree-icon'/>");
					groupDiv.append(iconDiv);
				}
			}
			groupDiv.append(titleDiv);
			bodyDiv = $("<div class='"+bodyDivCss+"'></div>");
		}else{// Do not render root (empty groupId)
			bodyDiv = $("<div></div>");
		}
		groupDiv.append(bodyDiv);
		var subGroupIdList = util.sortMapByName(group.subGroupMap);
		// Strip HTML tags which might be added in groupTree data
		var groupName = group.name;
		try{
			var stripGroupName = $(group.name).text();
			if(stripGroupName){
				groupName = stripGroupName;
			}
		}catch(error){
			// Special chars like "$&@." might throw exception in $(), ignore. #VTWEB-533
		}
		var groupObj = {};
		groupObj.dragDiv  = groupDiv;
		groupObj.titleDiv = titleDiv;
		groupObj.expandDiv   = groupExpand;
		groupObj.checkBoxDiv = groupCheckBox;
		groupObj.iconDiv  = iconDiv;
		groupObj.elbowDiv = elbowDiv;
		groupObj.bodyDiv  = bodyDiv;
		groupObj.id       = group.id;
		groupObj.name     = groupName;
		groupObj.visible  = true; // Use "visible" for group's children
		groupObj.hideWhole= false;// Use "hideWhole" for show/hide whole group
		groupObj.visibleItemCount = 0; // Use "visibleItemCount" for showGroupVisibleItemCount
		groupObj.subGroupMap = {};
		groupObj.depth = group.depth;
		groupObj.parentGroup = parentGroup;
		groupObj.subGroupIdList = subGroupIdList;
		// Initial to original itemList to calculate item count by subGroup. Will clear later.
		groupObj.itemList = group.itemList || [];
		this._groupInfoMap[groupId] = groupObj;
		// Group Events
		if(titleDiv != null){
			titleDiv.click(function(event){
				self._clickGroup(groupId);
				if(event && event.stopPropagation){
					event.stopPropagation();
				}
			});
		}
		if(groupExpand){
			groupExpand.click(function(event){
				self._expandCollapseGroup(groupId);
				if(event && event.stopPropagation){
					event.stopPropagation();
				}
			});
		}
		if(groupCheckBox){
			groupCheckBox.click(function(event){
				self._checkGroup(groupId);
				if(event && event.stopPropagation){
					event.stopPropagation();
				}
			});
		}
		// Append sub groups
		var isSubGroupChecked = false;
		var subGroupDiv = $("<div></div>");
		bodyDiv.append(subGroupDiv);
		groupObj.subGroupDiv = subGroupDiv;
		var subGroupCount = subGroupIdList.length;
		if(subGroupCount>0){
			var subGroupMap = group.subGroupMap;
			for(var i=0;i<subGroupCount;i++){
				var k = subGroupIdList[i];
				var isLastChildGroup = (groupObj.itemList.length==0 && i==(subGroupCount -1) );
				var subGroup = subGroupMap[k];
				subGroup.depth = group.depth + 1;
				subGroupDiv.append(this._renderGroup(subGroup, groupObj, isLastChildGroup) );
				// Use groupObj's subGroupMap and subGroup's parentGroup to link each other
				var subGroupObj = this._groupInfoMap[ subGroup.id ];
				subGroupObj.parentGroup = groupObj;
				groupObj.subGroupMap[ subGroup.id ] = subGroupObj;
				//
				if(this.options.multiSelect && subGroupObj.checkBoxDiv && subGroupObj.checkBoxDiv.is(":checked")){
					isSubGroupChecked = true;
				}
			}
		}
		// Append item list
		groupObj.itemList = []; // Clear itemList and add itemInfo
		var isGroupItemChecked = false;
		var itemList = group.itemList;
		var itemListDiv = $("<div></div>");
		groupObj.itemListDiv = itemListDiv;
		if(itemList && itemList.length>0){
			for(var i=0;i<itemList.length;i++){
				var item = itemList[i];
				var isLastChildItem = (i == (itemList.length - 1) );
				var itemDiv = this._renderItem(item, groupId, isLastChildItem);
				itemListDiv.append(itemDiv);
				var itemInfo = this._itemInfoMap[item.id];
				groupObj.itemList.push( itemInfo );
				// Group check info
				if(this.options.multiSelect && this._selectItemIdSet[item.id] ){
					isGroupItemChecked = true;
				}
			}
		}
		if(this.options.multiSelect && (isSubGroupChecked || isGroupItemChecked) ){
			this._checkParentGroup(groupObj, true);
		}
		bodyDiv.append(itemListDiv);
		// Update visible item count (optional)
		if(this.options.showGroupVisibleItemCount){
			this._updateGroupVisibleItemCount(groupId);
		}
		//
		return groupDiv;
	},
	
	/**
	 * @return itemDiv
	 */
	_renderItem: function(item, groupId, isLastChild){
		var self = this;
		var itemId = item.id;
		
		var styleItemDiv = "";
		if(this.options.styleItemDiv){
			styleItemDiv = " class='"+this.options.styleItemDiv+"'";
		}
		var itemDiv = $("<div"+styleItemDiv+"></div>");
		
		var itemDivIdStr = "";
		if(this._editable){
			itemDivIdStr = " id='"+this._dragAddItemIdPrefix(itemId)+"'";
		}
		var itemTitleDiv = $("<span class='web-tree-item' "+itemDivIdStr+">"+item.name+"</span>");
		if(this._editable){
			itemTitleDiv.draggable({helper: "clone"});
			if(this._inplaceEditable){
				itemTitleDiv.dblclick(function(){
					if(!self._inplaceEditing){
						self.inplaceEditItem(itemId);
						if($.isFunction( self.options.onItemClick) ){
							self.options.onItemClick(itemId, item.name);
						}
					}
				});
			}
		}
		var itemExpand = null;
		var itemCheckBox = null;
		var itemIcon = null;
		var itemIconUrl = null;
		// Elbow
		if(this.options.showElbow || this.options.showElbowPadding){
			var parentGroup = this._groupInfoMap[groupId];
			this._renderElbow(itemDiv, parentGroup, isLastChild);
		}
		//
		if(this.options.showExpandCollapse){
			itemExpand = $("<a  class='web-tree-expand-collapse-space'>&nbsp;</a>");
			itemDiv.append(itemExpand);
		}
		if(this.options.multiSelect){
			itemCheckBox = $("<input type='checkbox' class='web-tree-checkbox'/>");
			itemDiv.append(itemCheckBox);
			if(this._selectItemIdSet[itemId]){
				itemCheckBox.attr("checked",true);
			}
		}
		if(this.options.showIcon && this.options.showIconItemImage){
			itemIconUrl = this.options.showIconItemImage;
			if($.isFunction(this.options.onShowIconItemImage) ){
				itemIconUrl = this.options.onShowIconItemImage(item.id);
			}
			itemIcon = $("<img src='"+itemIconUrl+"' class='web-tree-icon'/>");
			itemDiv.append(itemIcon);
		}
		itemDiv.append(itemTitleDiv);
		//
		var itemColumnDiv   = null;
		var itemColumnValue = null;
		if(this.options.showColumn){
			itemColumnDiv = $("<span></span>");
			itemDiv.append(itemColumnDiv);
			//
			if($.isFunction(this.options.onShowColumnValueList) ){
				itemColumnValue = this.options.onShowColumnValueList(itemId);
				if(itemColumnValue && itemColumnValue.length>0){
					this._updateItemColumn(itemColumnDiv, itemColumnValue);
				}
			}
		}
		// Use separate function to avoid multi items click refer to same item id (in for loop)
		this._setItemClick(this,itemTitleDiv,itemId,itemCheckBox);
		var itemInfo = {};
		itemInfo.titleDiv    = itemTitleDiv;
		itemInfo.expandDiv   = itemExpand;
		itemInfo.checkBoxDiv = itemCheckBox;
		itemInfo.iconDiv     = itemIcon;
		itemInfo.iconUrl     = itemIconUrl;
		itemInfo.columnDiv   = itemColumnDiv;
		itemInfo.columnValue = itemColumnValue;
		itemInfo.id          = item.id;
		itemInfo.name        = item.name;
		itemInfo.groupId     = groupId;
		itemInfo.dragDiv     = itemDiv; // Use "dragDiv" for drag/drop
		itemInfo.hideWhole   = false;   // Use "hideWhole" for show/hide whole item
		this._itemInfoMap[itemId] = itemInfo;
		//
		return itemDiv;
	},
	
	/**
	 * Render elbow for group or item
	 */
	_renderElbow: function(div, parentGroup, isLastChild){
		var depth = (parentGroup ? (parentGroup.depth + 1) : 0);
		// Parents
		if(depth && depth>1){
			var paddingDiv = null;
			var paddingDepth = depth - 1;
			if(this.options.showElbow){
				var parentList = [];
				if(parentGroup){
					var pg = parentGroup;
					for(var i=0;i<paddingDepth;i++){
						// Calculate parentGroup's "isLastChild" realtime, consider add/delete group.
						if(pg.parentGroup && pg.parentGroup.subGroupIdList){
							var lastGroupId = pg.parentGroup.subGroupIdList[pg.parentGroup.subGroupIdList.length - 1];
							pg.isLastChild = (pg.parentGroup.itemList.length==0 && lastGroupId == pg.id);
						}
						parentList.push(pg);
						pg = pg.parentGroup;
						if(!pg){
							break;
						}
						if(parentList.length == paddingDepth){
							break;
						}
					}
				}
				if(parentList.length == paddingDepth){
					for(var i=(paddingDepth-1);i>=0;i--){
						var pg = parentList[i];
						if(pg.isLastChild){// Use parentGroup's "isLadtChild" calculated realtime above.
							paddingDiv = $("<span class='web-tree-elbow'></span>");
						}else{
							paddingDiv = $("<img src='"+this.options.showElbowLineImage+"' class='web-tree-elbow'/>");
						}
						div.append(paddingDiv);
					}
				}else{
					logger.info("_renderElbow() invalid parent list", "devicepicker");
				}
			}else{
				for(var i=(paddingDepth-1);i>=0;i--){
					paddingDiv = $("<span class='web-tree-elbow'></span>");
					div.append(paddingDiv);
				}
			}
		}
		// Self
		var elbowDiv = null;
		if(depth && depth>0){
			if(this.options.showElbow){
				if(!isLastChild){
					elbowDiv = $("<img src='"+this.options.showElbowImage+"' class='web-tree-elbow'/>");
				}else{
					elbowDiv = $("<img src='"+this.options.showElbowEndImage+"' class='web-tree-elbow'/>");
				}
				div.append(elbowDiv);
			}else{
				elbowDiv = $("<span class='web-tree-elbow'></span>");
				div.append(elbowDiv);
			}
		}
		return elbowDiv;
	},
	
	/**
	 * Update group's and child's elbow when showElbow
	 * @param allChild: if false, only update last two children. (The new last child and previous last child)
	 */
	_renderElbowParent : function(groupInfo, allChild){
		if(!this.options.showElbow){
			return;
		}
		var idList = groupInfo.subGroupIdList;
		for(var i=0;i<idList.length;i++){
			var isLastTwo = (i >= (idList.length - 2) );
			if(!allChild && !isLastTwo){
				continue;
			}
			var subGroupId = idList[i];
			var subGroupInfo = groupInfo.subGroupMap[subGroupId];
			var isLastChild = (i == (idList.length - 1) );
			if(subGroupInfo.elbowDiv){
				subGroupInfo.elbowDiv.empty();
				this._renderElbow(subGroupInfo.elbowDiv, groupInfo, isLastChild);
			}
			this._renderElbowParent(subGroupInfo, true); // allChild when iterate
		}
	},
	
	_setItemClick: function(self, item, id, checkBox){
		item.click(function(event){
			self._clickItem(id, false);
			if(event && event.stopPropagation){
				event.stopPropagation();
			}
		});
		if($.isFunction(this.options.onItemContextMenu) ){
			item.unbind("contextmenu").bind("contextmenu",function(event){
				self.options.onItemContextMenu(id, event);
				return false;
			});
		}
		if(checkBox){
			checkBox.click(function(event){
				self._checkItem(id);
				if(event && event.stopPropagation){
					event.stopPropagation();
				}
			});
		}
		if(this.options.showMouseOverOut){
			item.mouseover(function(){
				if(self.options.styleItemHover){
					item.addClass(self.options.styleItemHover);
				}else{
					item.addClass("web-tree-item-mouseover");
				}
				if($.isFunction(self.options.onItemMouseOver) ){
					self.options.onItemMouseOver(id);
				}
			});
			item.mouseout(function(){
				if(self.options.styleItemHover){
					item.removeClass(self.options.styleItemHover);
				}else{
					item.removeClass("web-tree-item-mouseover");
				}
				if($.isFunction(self.options.onItemMouseOut) ){
					self.options.onItemMouseOut(id);
				}
			});
		}
		if($.isFunction(self.options.onItemDblClick) ){
			item.dblclick(function(){
				self.options.onItemDblClick(id);
			});
		}
	},
	
	/**
	 * Get max depth of the group and it's sub groups. Compare to current group
	 */
	_getGroupChildMaxDepth : function(groupId){
		var depth = 0;
		var groupInfo = this._groupInfoMap[ groupId ];
		if(!groupInfo){
			return depth;
		}
		depth = 1;
		for(var id in groupInfo.subGroupMap){
			var d = this._getGroupChildMaxDepth(id) + 1;
			if(d>depth){
				depth = d;
			}
		}
		return depth;
	},
	
	/**
	 * Set group depth recursively including sub groups
	 */
	_setGroupDepth: function(groupInfo, depth){
		if(!groupInfo){
			return;
		}
		groupInfo.depth = depth;
		for(var id in groupInfo.subGroupMap){
			this._setGroupDepth(this._groupInfoMap[id], depth+1);
		}
	},
	
	_showHint: function(msg){
		if($.isFunction(this.options.onShowHint)){
			this.options.onShowHint(msg);
		}
	},
	
	/**
	 * @see removeGroup() and addGroup()
	 * @param groupId: container's id
	 */
	_dragGroupToGroup: function(groupId, dragGroupId){
		logger.debug("_dragGroupToGroup: groupId="+groupId+", dragGroupId="+dragGroupId);
		//
		var checkResult = this._dragGroupToGroupCheck(groupId, dragGroupId);
		if(checkResult !=0 ){
			logger.debug("_dragGroupToGroup: "+checkResult);
			return;
		}
		//
		var groupInfo = this._groupInfoMap[ groupId ];
		var dragGroupInfo = this._groupInfoMap[ dragGroupId ];
		
		// Remove old parent's reference
		var oldGroupInfo = dragGroupInfo.parentGroup;
		if(oldGroupInfo!=null){
			for(var id in oldGroupInfo.subGroupMap){
				if(id == dragGroupId){
					// Delete from map
					delete oldGroupInfo.subGroupMap[id];
					// Delete from id list
					var idList = oldGroupInfo.subGroupIdList;
					for(var i=0;i<idList.length;i++){
						if(idList[i] == id){
							idList.splice(i,1);
							break;
						}
					}
					break;
				}
			}
		}
		
		// Move div
		groupInfo.subGroupDiv.append(dragGroupInfo.dragDiv);
		
		// Update new info
		dragGroupInfo.parentGroup = groupInfo;
		groupInfo.subGroupMap[ dragGroupId ] = dragGroupInfo;
		groupInfo.subGroupIdList.push(dragGroupId);
		
		// Update depth
		this._setGroupDepth(dragGroupInfo, groupInfo.depth + 1);
		
		// Update check status (for multiselect mode)
		if(this.options.multiSelect){
			if(dragGroupInfo.checkBoxDiv.is(":checked")){
				if(oldGroupInfo!=null){
					this._checkParentGroup(oldGroupInfo,false);
				}
				this._checkParentGroup(groupInfo,true);
			}else{
				// Skip, no update
			}
		}
		
		// Update elbow
		if(this.options.showElbow){
			this._renderElbowParent(oldGroupInfo);
			this._renderElbowParent(groupInfo);
		}
		
		// Trigger event
		if($.isFunction(this.options.onGroupDragEnd) ){
			this.options.onGroupDragEnd(dragGroupId, dragGroupInfo.name, groupId);
		}
	},
	
	/**
	 * @return 0 for draggable, otherwise for not-draggable
	 */
	_dragGroupToGroupCheck: function(groupId, dragGroupId){
		var groupInfo = this._groupInfoMap[ groupId ];
		var dragGroupInfo = this._groupInfoMap[ dragGroupId ];
		if(!groupInfo || !dragGroupInfo){
			return "invalid group or dragGroup info";
		}
		// Skip move to current group
		if(dragGroupInfo.parentGroup && dragGroupInfo.parentGroup.id == groupId){
			return "skip move to current group";
		}
		// Skip move parent to child
		var parent = groupInfo.parentGroup;
		while(parent!=null){
			if(parent.id == dragGroupId){
				return "skip move to child group";
			}
			parent = parent.parentGroup;
		}
		// Skip when exceed depth
		if(this.options.maxDepth && this.options.maxDepth>0){
			var dragDepth = this._getGroupChildMaxDepth(dragGroupId);
			if( (groupInfo.depth + dragDepth -1) >= this.options.maxDepth){
				this._showHint( i18n(i18n.DESC_GROUP_MAX_DEPTH, this.options.maxDepth) );
				return "skip when exceed depth";
			}
		}
		//
		return 0;
	},
	
	/**
	 * @param groupId: container's id
	 */
	_dragItemToGroup: function(groupId, dragItemId){
		logger.debug("_dragItemToGroup: groupId="+groupId+", dragItemId="+dragItemId);
		//
		var checkResult = this._dragItemToGroupCheck(groupId, dragItemId);
		if(checkResult !=0 ){
			logger.debug("_dragItemToGroup: "+checkResult);
			return;
		}
		//
		var groupInfo = this._groupInfoMap[ groupId ];
		var itemInfo  = this._itemInfoMap[ dragItemId ];
		// Remove old parent's reference
		var oldGroupInfo = this._groupInfoMap[ itemInfo.groupId ];
		var oldGroupItemList = oldGroupInfo.itemList;
		for(var i=0;i<oldGroupItemList.length;i++){
			if(oldGroupItemList[i] == itemInfo){
				oldGroupItemList.splice(i,1);
				break;
			}
		}
		// Move div
		groupInfo.itemListDiv.append(itemInfo.dragDiv);
		
		// Update new info
		itemInfo.groupId = groupId;
		groupInfo.itemList.push(itemInfo);
		
		// Update check status (for multiselect mode)
		if(this.options.multiSelect){
			if(itemInfo.checkBoxDiv.is(":checked")){
				this._checkParentGroup(oldGroupInfo,false);
				this._checkParentGroup(groupInfo,true);
			}else{
				// Skip, no update
			}
		}
		
		// Trigger event
		if($.isFunction(this.options.onItemDragEnd) ){
			this.options.onItemDragEnd(dragItemId, itemInfo.name, groupId);
		}
	},
	
	/**
	 * @return 0 for draggable, otherwise for not-draggable
	 */
	_dragItemToGroupCheck: function(groupId, dragItemId){
		var groupInfo = this._groupInfoMap[ groupId ];
		var itemInfo  = this._itemInfoMap[ dragItemId ];
		if(!groupInfo || !itemInfo){
			return "invalid group or item info";
		}
		// Skip move to current group
		if(itemInfo.groupId == groupId){
			return "skip move to current group";
		}
		return 0;
	},
	
	/**
	 * Work with _dragDelGroupIdPrefix()
	 * @return groupId with prefix
	 */
	_dragAddGroupIdPrefix : function(groupId){
		return this._dragGroupIdPrefix + groupId;
	},
	
	/**
	 * @return groupId
	 */
	_dragDelGroupIdPrefix : function(groupIdWithPrefix){
		var prefix = this._dragGroupIdPrefix;
		return groupIdWithPrefix.replace(prefix,"");
	},
	
	_dragIsGroup: function(idWithPrefix){
		var prefix = this._dragGroupIdPrefix;
		if(idWithPrefix.indexOf(prefix)>=0){
			return true;
		}
		return false;
	},
	
	/**
	 * Work with _dragDelItemIdPrefix()
	 * @return itemId with prefix
	 */
	_dragAddItemIdPrefix : function(itemId){
		return this._dragItemIdPrefix + itemId;
	},
	
	/**
	 * @return itemId
	 */
	_dragDelItemIdPrefix : function(itemIdWithPrefix){
		var prefix = this._dragItemIdPrefix;
		return itemIdWithPrefix.replace(prefix,"");
	},
	
	_dragIsItem: function(idWithPrefix){
		var prefix = this._dragItemIdPrefix;
		if(idWithPrefix.indexOf(prefix)>=0){
			return true;
		}
		return false;
	},
	
	destroy: function() {
		$.Widget.prototype.destroy.apply(this, arguments); // default destroy
		// Clear timer
		if(this._showColumnTimer){
			clearInterval(this._showColumnTimer);
			this._showColumnTimer = null;
		}
		// now do other stuff particular to this widget
		this.element.html("");
	}
});
