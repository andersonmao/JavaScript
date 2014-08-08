/**
 * Log with log levels.
 * Example:
 *  logger.debug("msg");
 *  logger.info("msg");
 *  logger.error("msg");
 *  logger.debug("object="+logger.toString(object) ); // Print object one level
 *  logger.debug("object="+logger.toString(object, true) ); // Print object all levels
 * To change log level, set logger.logLevel = logger.LOG_LEVEL_DEBUG;
 * @author Anderson Mao, 2014-08-08
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

	toString : function(content, recursive){
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
								v = this.toString(v,recursive);
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
						v = this.toString(v,recursive);
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
	}
};
