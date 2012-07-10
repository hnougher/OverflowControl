
var OverflowControl = function (elemToPageinate, cssClassOfPage) {
	this.$parent = $(elemToPageinate);
	this.pageClass = cssClassOfPage;
	this.myPageUID = Math.random();
	
	// An empty span for locating overflow
	this.$es = $("<span style='background:#F00;outline:1px solid #F00;margin:0;padding:0;'>a</span>");
	//this.$es = $("<span style='border:0px solid #000;margin:0;padding:0'></span>");
	
	// move all current content in $parent into a page.
	var $page = this.mkPage();
	$page.append(this.$parent.contents().detach());
	this.$parent.append($page);
	
	// Split all text nodes in content to smallest possible parts
	this.splitTextNodes($page);
	
	//this.findOverflow($page, $page);
	this.layoutPages($page);
};

OverflowControl.prototype = {
	
	layoutPages: function ($firstPage) {
		// This process is split into workers for the *very* slow IE
		this.layoutPagesWorker1($firstPage);
	},
	//This method tries to locate the last word which fits on the page without causing overflow.
	layoutPagesWorker1: function ($curPage, continuePoint) {
		//console.log("layoutPagesWorker1");
		$curPage.addClass("mkAbsolute");
		var self = this,
			i = (continuePoint > 0 ? continuePoint : 0),
			elemHeight = $curPage.height(),
			contents = $curPage.contents(),
			pauseTime = (new Date()).getTime() + 40,
			doNewPage = function(v){window.setTimeout(function(){self.layoutPagesWorker2($curPage, v)}, 0)};
		
		for (; i < contents.length; i++) {
			var $node = contents.eq(i);
			var nodeType = $node.get(0).nodeType;
			if (nodeType == 8) continue; // Comments do not have size
			if ($node.hasClass("newPage")) {
				doNewPage(i+1);
				break;
			}
			
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
			//console.warn(top, " ", bottom, " ", elemHeight, " ", $node.get(0));
			if (bottom >= elemHeight) {
				// Overflow!
				doNewPage(i);
				break;
			}
			if ((new Date()).getTime() >= pauseTime) {
				// Timeout!
				window.setTimeout(function(){self.layoutPagesWorker1($curPage, i)}, 0);
				return;
			}
		}
		
		// No Overflow
		$curPage.removeClass("mkAbsolute");
	},
	// Move this.$es and everything after it to an array
	layoutPagesWorker2: function ($curPage, overflowIndex) {
		//console.log("layoutPagesWorker2");
		var elements = [];
		var contents = $curPage.contents();
		for (var i = overflowIndex; i < contents.length; i++)
			elements.push(contents.eq(i));
		var self = this;
		window.setTimeout(function(){self.layoutPagesWorker3($curPage, elements)}, 0);
	},
	// Move everything in elements to a new page
	layoutPagesWorker3: function ($curPage, elements) {
		//console.log("layoutPagesWorker3");
		var $newPage = this.mkPage();
		for (var i = 0; i < elements.length; i++)
			$newPage.append(elements[i]);
		$curPage.after($newPage);
		var self = this;
		window.setTimeout(function(){self.layoutPagesWorker1($newPage)}, 0);
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

	mkPage: function () {
		var $page = $("<div></div>");
		$page.addClass(this.pageClass);
		$page.data("overflowControlPageUID", this.myPageUID);
		return $page;
	}
};
