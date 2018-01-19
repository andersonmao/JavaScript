/**
 * Standalone logger with Vue plugin feature
 * Set log level via logger.logLevel
 * @author Anderson Mao, 2018-01-18
 */
var logger = {
	LOG_LEVEL_ERROR : 2,
	LOG_LEVEL_INFO  : 4,
	LOG_LEVEL_DEBUG : 6,
	
	logLevel : 4, // default LOG_LEVEL_INFO
	
	error : function(content, tip){
		this._logWithLevel(this.LOG_LEVEL_ERROR, "ERROR", content, tip);
	},

	info : function(content, tip){
		this._logWithLevel(this.LOG_LEVEL_INFO, "INFO", content, tip);
	},

	debug : function(content, tip){
		this._logWithLevel(this.LOG_LEVEL_DEBUG, "DEBUG", content, tip);
	},
	
	log: function(content, tip){
		this.info(content, tip);
	},
	
	_logWithLevel : function(logLevel, prefix, content, tip){
		if(this.logLevel < logLevel){
			return;
		}
		var s = this.toString(content);
		if(tip){
			s = tip + ": " + s;
		}
		if(logLevel <= this.LOG_LEVEL_ERROR){
			this._error(prefix + ": " + s);
		}else{
			this._log(prefix + ": " + s);
		}
	},
	
	_log : function(content){
		if(window.console && window.console.log){
			window.console.log(content);
		}
	},

	_error : function(content){
		if(window.console && window.console.error){
			window.console.error(content);
		}else{
			this._log(content);
		}
	},
	
	/**
	 * to string with recursive option. default is not recursive
	 */
	toStringRecursive : function(content, recursive){
		if(!content){
			return content;
		}
		var sa = [];
		if((typeof content) == "object" ){
			if(content.length){// array
				sa.push("[");
				for(var i=0;i<content.length;i++){
					var obj = content[i];
					if(!obj){
						continue;
					}
					if(i>0){
						sa.push(",");
					}
					if((typeof obj) == "object" ){
						sa.push("{");
						for(var k in obj){
							var v = obj[k];
							if(recursive && v && (typeof v) == "object"){
								v = this.toStringRecursive(v,recursive);
							}else if(v && (typeof v) == "object"){
								v = "object";
							}else if((typeof v) == "function" ){
								v = "function";
							}
							sa.push(k+":"+v+",");
						}
						sa.push("}");
					}else{
						sa.push(obj);
					}
				}
				sa.push("]");
			}else{// map
				sa.push("{");
				for(var k in content){
					var v = content[k];
					if(recursive && v && (typeof v) == "object"){
						v = this.toStringRecursive(v,recursive);
					}else if(v && (typeof v) == "object"){
						v = "object";
					}else if((typeof v) == "function" ){
						v = "function";
					}
					sa.push(k+":"+v+",");
				}
				sa.push("}");
			}
		}else{// string
			sa.push(content);
		}
		return sa.join("");
	},
	
	/**
	 * @return JSON字符串
	 */
	toString: function(obj){
		var output = obj;
		if(typeof obj == 'object'){
			output = JSON.stringify(obj);
		}
		return output;
	},
	
	/**
	 * Vue get componentTag
	 */
	_getVueCompTip: function($vue, tip){
		var myTip = tip || "";
		var compTag = "";
		if($vue.$options && $vue.$options._componentTag){
			// no vue-router
			compTag = $vue.$options._componentTag;
		}else if($vue.$route && $vue.$route.path){
			// vue-router
			compTag = $vue.$route.path;
		}
		if(compTag){
			if(myTip && compTag){
				myTip = compTag + ": "+myTip;
			}else if(compTag){
				myTip = compTag;
			}
		}
		return myTip;
	},
	
	/**
	 * Vue plugin install()
	 */
	install: function (Vue, options) {
		Vue.prototype.$debug = function (message, tip) {
			var myTip = logger._getVueCompTip(this, tip);
			logger.debug(message, myTip);
		}
		
		Vue.prototype.$info = function (message, tip) {
			var myTip = logger._getVueCompTip(this, tip);
			logger.info(message, myTip);
		}
		
		Vue.prototype.$error = function (message, tip) {
			var myTip = logger._getVueCompTip(this, tip);
			logger.error(message, myTip);
		}
	}
};

if (typeof window !== 'undefined' && window.Vue) {
    window.Vue.use(logger);
}
