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
		if($vue.$options && $vue.$options._componentTag){
			var compTag = $vue.$options._componentTag;
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
