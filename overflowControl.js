
// Something Very Useful
jQuery.fn.reverse = [].reverse;

var OverflowControl = function (elemToPageinate, cssClassOfPage) {
	this.$parent = $(elemToPageinate);
	this.pageClass = cssClassOfPage;
	this.activeTimer = false;
	
	// An empty span for locating overflow
	this.$es = $("<span style='background:#F00;outline:1px solid #F00;margin:0;padding:0;'></span>");
	//this.$es = $("<span style='border:0px solid #000;margin:0;padding:0'></span>");
	
	// move all current content in $parent into a page.
	var $page = this.mkPage();
	$page.append(this.$parent.contents().detach());
	this.$parent.append($page);
	
	// Split all text nodes in content to smallest possible parts
	this.splitTextNodes($page);
	
	// Record the total number of elements on the page for progress reporting
	this.totalRootElem = $page.contents().length;
	
	// Let the caller finish what its doing before starting the layout process
	var self = this;
	this.reflow();
};

OverflowControl.prototype = {
	
	//This method tries to locate the last word which fits on the page without causing overflow.
	layoutPagesWorker1: function ($curPage, continuePoint) {
		//console.log("layoutPagesWorker1", continuePoint);
		var self = this,
			continuePoint = (continuePoint && continuePoint.length ? continuePoint : [0]),
			elemHeight = $curPage.height(),
			contents = $curPage.contents(),
			pauseTime = (new Date()).getTime() + 40,
			doNewPage = function(v){self.activeTimer = window.setTimeout(function(){self.layoutPagesWorker2($curPage, v)}, 0)};
		
		// Update Progress
		$(this).trigger(jQuery.Event("progress", {
			currentIndex: this.totalRootElem - contents.length,
			totalIndex: this.totalRootElem,
			amountDone: (this.totalRootElem - contents.length) / this.totalRootElem
			}));
		
		// Take the index we are currently working on
		var i = continuePoint.pop();
		
		if (continuePoint.length == 0)
			$curPage.addClass("mkAbsolute");
		
		// if there is still indexes in the continuePoint then recurse down to that element
		for (var j = 0; j < continuePoint.length; j++) {
			contents = contents.eq(continuePoint[j]).contents();
		}
		
		for (; i < contents.length; i++) {
			var $node = contents.eq(i);
			//console.log($node);
			if ($node.hasClass("newPage")) {
				continuePoint.push(i+1);
				doNewPage(continuePoint);
				break;
			}
			//console.warn(top, " ", bottom, " ", elemHeight, " ", $node.get(0));
			if (this.layoutPagesWorker1_NodeOverflow($node, elemHeight)) {
				// Overflow!
				if ($node.hasClass("paginate_splitable")) {
					continuePoint.push(i);
					continuePoint.push(0);
					this.layoutPagesWorker1($curPage, continuePoint);
					return;
				}
				else {
					// startNode contains where to star the new page
					// make certain that there is at least one content node on the page
					var startNode = (i > 0 ? i : 1);
					continuePoint.push(startNode);
					doNewPage(continuePoint);
				}
				break;
			}
			if ((new Date()).getTime() >= pauseTime) {
				// Timeout!
				continuePoint.push(i);
				this.activeTimer = window.setTimeout(function(){self.layoutPagesWorker1($curPage, continuePoint)}, 0);
				return;
			}
		}
		
		// No Overflow
		$curPage.removeClass("mkAbsolute");
		
		if (continuePoint.length == 0 && i == contents.length) {
			// THE END!
			$(this).trigger("complete");
		}
	},
	// Returns true if the element will go further than height
	layoutPagesWorker1_NodeOverflow: function ($node, height) {
		var nodeType = $node.get(0).nodeType;
		if (nodeType == 8) return false; // Comments do not have size
		
		var top, bottom;
		if (nodeType == 3) {
			$node.after(this.$es);
			top = this.$es.position().top;
			bottom = top + this.$es.height();
			this.$es.detach();
		}
		else {
			top = $node.position().top;
			bottom = top + $node.height();
		}
		return (bottom >= height);
	},
	
	// Move this.$es and everything after it to an array
	layoutPagesWorker2: function ($curPage, overflowIndex) {
		//console.log("layoutPagesWorker2", overflowIndex);
		var self = this,
			$newPage = this.mkPage($curPage),
			contents = $curPage.contents();
		
		// For the first element we have to split it into two if there is more than one overflowIndex
		function splitNode($parent, $node, splitDepth) {
			var $clone = $node.clone(true, true);
			$clone.addClass('overflowControlParent').data('overflowControlParent', $node);
			var nodeContents = $node.contents();
			var isTopNode = (splitDepth + 1 >= overflowIndex.length);
			nodeContents.slice(overflowIndex[splitDepth] + (isTopNode ? 0 : 1)).remove();
			$clone.contents().slice(0, overflowIndex[splitDepth] + (isTopNode ? 0 : 1)).remove();
			$parent.prepend($clone);
			if (!isTopNode)
				splitNode($clone, nodeContents.eq(overflowIndex[splitDepth]), splitDepth + 1);
		}
		if (overflowIndex.length > 1) {
			splitNode($newPage, contents.eq(overflowIndex[0]), 1);
			overflowIndex[0]++;
		}
		
		// Now for the rest of the elements
		for (var i = overflowIndex[0]; i < contents.length; i++)
			$newPage.append(contents.eq(i));
		$curPage.after($newPage);
		this.activeTimer = window.setTimeout(function(){self.layoutPagesWorker1($newPage)}, 0);
	},
	
	splitTextNodes: function ($container) {
		var self = this;
		$container.contents().each(function (index) {
			var $this = $(this);
			if (this.nodeType == 3) {
				$this.after(self.$es);
				var text = this.nodeValue.match(/(\S+)|(\s+)/g);
				this.nodeValue = '';
				
				for (var i = 0; i < text.length; i++) {
					var tn = document.createTextNode(text[i]);
					self.$es.before(tn);
				}
			}
			else if ($this.hasClass("paginate_splitable")) {
				self.splitTextNodes($this);
			}
		});
	},
	
	isESOverflowed: function ($page) {
		var pos = this.$es.position().top;
		return (pos >= $page.height());
		
	/*		var obj = document.getElementById(id);
	if(obj.innerHTML.length==0) return 0;
	var overflow = obj.scrollHeight/obj.clientHeight;
	return overflow;*/

	},

	mkPage: function ($curPage) {
		var $page = $("<div></div>");
		$page.addClass(this.pageClass).addClass('overflowControlPage');
		if ($curPage)
			$page.data('overflowControlPage', $curPage);
		return $page;
	},
	
	/**
	 * Resplits the pages.
	 * Useful when you want to resize the pages.
	 */
	reflow: function () {
		this.revertSplit();
		var $page = $('.overflowControlPage:first');
		var self = this;
		this.activeTimer = window.setTimeout(function(){self.layoutPagesWorker1($page)}, 0)
	},
	
	/**
	 * Completely remove all uses of overflowControl.
	 * Its a good idea to not use this instance again after calling this.
	 */
	removeControl: function () {
		this.revertSplit();
		var $page = $('.overflowControlPage:first');
		$page.parent().append($page.contents());
		$page.remove();
	},
	
	/**
	 * Turns the document back into one page, ready to split it up again.
	 */
	revertSplit: function () {
		clearTimeout(this.activeTimer);
		$('.overflowControlParent').reverse().each(function () {
			var $this = $(this);
			$this.data('overflowControlParent').append($this.contents());
			$this.remove();
		});
		$('.overflowControlPage').reverse().each(function () {
			var $this = $(this);
			if ($this.data('overflowControlPage')) {
				$this.data('overflowControlPage').append($this.contents());
				$this.remove();
			}
		});
	}
};
