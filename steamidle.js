var path = require("path");
var fs = require("fs");
var PixLDebug;

try {
	PixLDebug = require("pixl-debug-tools");
} catch(e) {
	
}

try {
	var xhr = require("xmlhttprequest");
	global.XMLHttpRequest = xhr.XMLHttpRequest;
} catch(e) {
	
}

var mysql;
try {
	mysql = require("mysql2");
} catch(e) {
	
}

Date.prototype.myTimeString = Date.prototype.toTimeString;

Date.prototype.toSteamDateString = function() {
	return this.toDateString.apply(this, arguments).split(":").join(bot.inviSpace+":"+bot.inviSpace);
}
Date.prototype.toSteamTimeString = function() {
	return this.toTimeString.apply(this, arguments).split(":").join(bot.inviSpace+":"+bot.inviSpace);
}

var settings = {};

var rawGithubPrefix = "https://raw.githubusercontent.com/PixLSteam/SteamIdleNodeJS/";
var defaultBranch = "master"; //should we use this?
var defaultMainFile = "steamidle.js";
var manifestFile = "manifest.json";


var bot = {};
global.bot = bot;

bot.allowedExceptions = [];

bot.inviSpace = "\uFEFF";
bot.inviChars = [
	"\uFEFF", //zero width no-break space
	"\u2063", //invisible separator
	"\u200B", //zero width space
	"\u200C" //zero width non-joiner
];

if (PixLDebug) {
	bot.PixLDebug = PixLDebug;
	bot.pDebug = new PixLDebug();
}
//now check cmd args

var currentMainFilePath = process.argv[1];
var currentMainFile = path.basename(currentMainFilePath);

var updateCI = process.argv.indexOf("--update");

if (updateCI >= 0) {
	var branch;
	var restore = false;
	// var request;
	// try {
		// request = require("request");
	// } catch(err) {
		// console.log("You can't use the update function without the 'request' module");
		// process.exit();
		// return;
	// }
	if (updateCI >= process.argv.length - 1 || process.argv[updateCI + 1].substr(0, 1) === "-" || process.argv.includes("--restore")) { //last entry || next entry is an opt id
		if (process.argv.includes("--restore")) {
			restore = true;
		} else {
			// ?
		}
	} else {
		branch = process.argv[updateCI + 1];
	}
	if (restore) {
		//look for .backup file
		var backupPath = currentMainFilePath + ".backup";
		try {
			var data = fs.readFileSync(backupPath);
			fs.writeFileSync(currentMainFilePath, data);
			console.log("Successfully restored the backup file");
		} catch(err) {
			console.log("Couldn't restore the backup file");
		}
		process.exit();
		return;
	} else if (branch) {
		if (!global.XMLHttpRequest) {
			console.error("xmlhttprequest must be installed in order to use the update functionality");
			process.exit();
			return;
		}
		var urlPre = rawGithubPrefix + branch + "/";
		var manifestUrl = urlPre + manifestFile;
		var xhr = new XMLHttpRequest();
		xhr.open("GET", manifestUrl, false);
		xhr.send();
		if (xhr.state === 200) {
			//use manifest
			var maniData = xhr.responseText;
			try {
				maniData = JSON.parse(maniData);
				if (typeof maniData !== "object") {
					throw Error("Parsed JSON is not an object");
				}
			} catch(err) {
				console.log("Couldn't parse manifest.json");
				process.exit();
				return;
			}
			var totalF = 0;
			var succF = 0;
			for (var i in maniData) {
				var fData = maniData[i];
				var relFilePath = fData["path"] || i;
				var isMain = fData["isMain"] || fData["isMainFile"];
				if (isMain) {
					relFilePath = currentMainFile;
				}
				var curDir = path.dirname(currentMainFilePath);
				var absFilePath = path.normalize(curDir+"/"+relFilePath);
				totalF += 1;
				var xhr1 = new XMLHttpRequest();
				xhr1.open("GET", urlPre+i, false);
				xhr1.send();
				if (xhr1.status === 200) {
					try {
						if (isMain) {
							fs.writeFileSync(currentMainFilePath + ".backup", fs.readFileSync(currentMainFilePath));
							console.log("Successfully created a backup of "+currentMainFile);
						}
						fs.writeFileSync(absFilePath, xhr1.responseText);
						succF += 1;
						console.log("Successfully updated '"+i+"'");
					} catch(err) {
						console.log("Error updating '"+i+"', couldn't write to file");
					}
				} else {
					console.log("Error updating '"+i+"', returned status code "+xhr1.status);
				}
			}
			console.log("Finished updating, "+succF+" of "+totalF+" files successfully updated ("+(Math.round((succF / totalF) * 100 * 10) / 10)+"%)");
			process.exit();
			return;
		} else {
			var mainUrl = urlPre + defaultMainFile;
			var xhr1 = new XMLHttpRequest();
			xhr1.open("GET", mainUrl, false);
			xhr1.send();
			if (xhr1.status === 200) {
				// var thisFile = fs.openSync(
				try {
					fs.writeFileSync(currentMainFilePath + ".backup", fs.readFileSync(currentMainFilePath));
					console.log("Successfully backed up "+currentMainFile);
				} catch(err) {
					console.log("Error backing up "+currentMainFile+", still continuing to update");
				}
				try {
					fs.writeFileSync(currentMainFilePath, xhr1.responseText);
					console.log("Updated "+currentMainFile);
					process.exit();
					return;
				} catch(err) {
					console.log("Error writing to the main file");
					process.exit();
					return;
				}
			} else {
				console.log("Raw JS file request returned status code "+xhr.status);
				process.exit();
				return;
			}
		}
	}
	return;
}

global.SIJSError = function SIJSError(message) {
	// console.log(message, new.target?1:0, arguments.length);
	if (!new.target) {
		// return new SIJSError.apply(arguments);
		return new (Function.prototype.bind.apply(SIJSError, ([null]).concat(Array.prototype.slice.apply(arguments))));
	}
	this.message = message;
	this.stack = Error().stack;
};
SIJSError.prototype = Object.create(Error.prototype);
SIJSError.prototype.constructor = SIJSError;
SIJSError.prototype.name = "SIJSError";
SIJSError.prototype.toString = function toString() {
	return this.message;
}

var timing = {};
timing.startTime = 0;
timing.stopTime = 0;
timing.steps = [];
timing.start = function start() {
	timing.startTime = +new Date;
}
timing.stop = function stop() {
	timing.stopTime = +new Date;
}
timing.step = function step(name) {
	timing.steps.push({name: name, time: +new Date});
}
timing.printDetails = function printDetails() {
	var op = console.log;
	if (timing.startTime) {
		op("Started at "+new Date(timing.startTime).myTimeString());
	}
	var lastTime = timing.startTime || 0;
	for (var i = 0; i < timing.steps.length; i++) {
		var diff = timing.steps[i].time - lastTime;
		lastTime = lastTime + diff;
		var desc = timing.steps[i].name;
		op("Period '"+desc+"' took "+(diff/1000)+"s");
	}
	if (timing.stopTime) {
		op("The last period took "+((timing.stopTime-lastTime)/1000)+"s");
		if (timing.startTime) {
			op("The whole timing session took "+((timing.stopTime-timing.startTime)/1000)+"s");
		}
	}
}

timing.start();

var SteamUser = require("steam-user");timing.step("steam-user loaded");
var Steam = SteamUser.Steam;
var SteamTotp = require("steam-totp");timing.step("steam-totp loaded");

var SteamCommunity = require("steamcommunity");timing.step("steamcommunity loaded");
var community = new SteamCommunity();

//will probably make them optional
var Cheerio;
var request;
var md5;
try {
	Cheerio = require("cheerio");timing.step("cheerio loaded");
} catch(err) {
	Cheerio = null;
	console.log("Couldn't load cheerio");
}
try {
	request = require("request");timing.step("request loaded");
} catch(err) {
	request = null;
	console.log("Couldn't load request");
}
try {
	md5 = require("js-md5");timing.step("js-md5 loaded");
} catch(err) {
	md5 = null;
	console.log("Couldn't load js-md5");
}

var SteamID = require("steamid");timing.step("steamid loaded"); //already dependency, so doesn't make a difference for the admin

var prompt = require("prompt");timing.step("prompt loaded");
// var fs = require("fs");timing.step("fs loaded");

prompt.start();

SteamUser.prototype.initialised = function initialised() {
	return this.loggedIn;
};

//needed for the https://www.npmjs.com/package/csgo module
(function() {
	var gp = SteamUser.prototype.gamesPlayed;
	SteamUser.prototype.gamesPlayed = function() {
		var args = arguments;
		try {
			if (args[0].games_played) {
				args[0] = args[0].games_played;
			}
		} catch(err) {
			
		}
		// bot.debug("idle", "idling on "+this.name+": "+Array.prototype.join.apply(args, ", "));
		bot.debug("idle", "idling on "+this.name+": "+Array.prototype.slice.apply(args).join(", "));
		gp.apply(this, args);
	};
})();

SteamUser.prototype.idleTimeout = function idleTimeout(time) {
	if (!this.idleTimeouts) {
		this.idleTimeouts = [];
	}
	var t = Number(time);
	if (isNaN(t)) {
		return false;
	}
	var obj = {
		start: +new Date,
		dur: t
	};
	this.idleTimeouts.push(obj);
	bot.idle(this, []);
};
SteamUser.prototype.hasIdleTimeout = function hasIdleTimeout() {
	if (!this.idleTimeouts) {
		return false;
	}
	var i = 0;
	while (i < this.idleTimeouts.length) {
		var o = this.idleTimeouts[i];
		var stillRunning = o.start + o.dur >= (+new Date);
		if (stillRunning) {
			return true;
		} else {
			this.idleTimeouts.splice(i, 1);
		}
	}
	return false;
};

SteamUser.prototype.getOwnedAppsAsObject = function getOwnedAppsAsObject() {
	const user = this;
	if (!user.picsCache.packages) {
		throw new Error("No data in PICS package cache yet");
	}
	var pkgs = user.getOwnedPackages();
	var appidObj = {};
	pkgs.forEach(function(pkg) {
		if (!user.picsCache.packages[pkg]) {
			return;
		}
		pkg = user.picsCache.packages[pkg];
		if (!pkg.packageinfo) {
			return;
		}
		pkg = pkg.packageinfo;
		if (pkg.extended && pkg.extended.expirytime && pkg.extended.expirytime <= Math.floor(Date.now() / 1000)) {
			return;
		}
		(pkg.appids || []).forEach((appid) => {
			// if (appids.indexOf(appid) === -1) {
			// appids.push(appid);
			// }
			appidObj[appid] = true;
		});
	});
	return appidObj;
};
function sortNumeric(a, b) {
	if (a < b) {
		return -1;
	} else if (a > b) {
		return 1;
	}

	return 0;
}
SteamUser.prototype._getOwnedApps = function _getOwnedApps(sorted=true) {
	var appidObj = this.getOwnedAppsAsObject();
	var appids = [];
	for (var i in appidObj) {
		if (!appidObj.hasOwnProperty(i) || isNaN(Number(i))) {
			continue;
		}
		appids.push(Number(i));
	}
	if (sorted) {
		appids.sort(sortNumeric);
	}
	return appids;
};
SteamUser.prototype._ownsApp = function _ownsApp(appid) {
	return this.getOwnedAppsAsObject()[parseInt(appid, 10)] ? true : false;
};

bot.getMainIdleFromObject = function getMainIdleFromObject(obj) {
	try {
		return obj.idle || obj.main || obj.games;
	} catch(err) {
		throw err;
		return null;
	}
};
bot.getBackupIdleFromObject = function getBackupIdleFromObject(obj) {
	try {
		return obj.backup || obj.next;
	} catch(err) {
		throw err;
		return null;
	}
};

SteamUser.prototype.idlingCards = function idlingCards() {
	// return this.curIdling && this.curIdling.indexOf(":cards") > -1;
	var ci = this.curIdling;
	if (typeof ci === "object" && !(ci instanceof Array)) {
		var main = bot.getMainIdleFromObject(ci);
		if (typeof main === "object" && !(main instanceof Array)) {
			var m2 = bot.getMainIdleFromObject(main);
			if (m2 instanceof Array) {
				return m2.indexOf(":cards") > -1;
			} else {
				return ([m2]).indexOf(":cards") > -1;
			}
		} else if (main instanceof Array) {
			return main.indexOf(":cards") > -1;
		} else {
			return ([main]).indexOf(":cards") > -1;
		}
	} else if (ci instanceof Array) {
		return ci.indexOf(":cards") > -1;
	} else {
		return ([ci]).indexOf(":cards") > -1;
	}
};

SteamUser.prototype.getAccOpt = function getAccOpt(opt, def) {
	if (this.opts) {
		if (([null, undefined]).indexOf(this.opts[opt]) <= -1) {
			return this.opts[opt];
		}
	}
	return def;
};
SteamUser.prototype.getOpt = function getOpt(opt, def) {
	// console.log(bot.getSettings());
	// console.log("Querying opt '"+opt+"' on "+this.name);
	if (this.opts) {
		if (([null, undefined]).indexOf(this.opts[opt]) <= -1) {
			// console.log("Returned "+this.opts[opt]);
			return this.opts[opt];
		}
	}
	if (([null, undefined]).indexOf(bot.settings[opt]) <= -1) {
		// console.log("Returned "+bot.settings[opt]);
		return bot.settings[opt];
	}
	// console.log("Returned default value "+def);
	return def;
};
SteamUser.prototype.getOptComb = function getOptComb(opt) {
	var cur = [];
	if (this.opts) {
		if (this.opts[opt] instanceof Array) {
			cur = cur.concat(this.opts[opt]);
		}
	}
	if (settings[opt] instanceof Array) {
		cur = cur.concat(settings[opt]);
	}
	return cur;
};
SteamUser.prototype.getSetting = SteamUser.prototype.getOpt;
SteamUser.prototype.getFirstSetting = function getFirstSetting(ar, def) {
	for (var i = 0; i < ar.length; i++) {
		var r = this.getSetting(ar[i], null);
		if (r !== null) {
			return r;
		}
	}
	return def;
};

SteamUser.prototype.setName = function(name) {
	this.setPersona(SteamUser.EPersonaState[(this.isOnline ? "Online" : "Offline")], name)
};
SteamUser.prototype.getName = function() {
	return this.accountInfo ? this.accountInfo.name : null;
};

SteamUser.prototype.getPersonaStateFlags = function() {
	if (this.personaStateFlags && parseInt(this.personaStateFlags)) {
		return parseInt(this.personaStateFlags);
	}
	return 0;
};

SteamUser.prototype.setPersona = function(state, name) {
	var user = this;
	this._send(SteamUser.EMsg.ClientChangeStatus, {
		"persona_state": state,
		"persona_state_flags": user.getPersonaStateFlags(),
		"player_name": name
	});
};

Array.prototype.spliceN = function() {
	var sp = this.concat();
	sp.splice.apply(sp, arguments);
	// Array.prototype.splice.apply(sp, arguments);
	return sp;
};

Array.prototype.mapLower = function() {return this.map(r => r.toLowerCase());}
Array.prototype.mapUpper = function() {return this.map(r => r.toUpperCase());}
Array.prototype.mapEndsWith = function(x) {return this.map(r => r.endsWith(x));}
Array.prototype.mapStartsWith = function(x) {return this.map(r => r.startsWith(x));}
Array.prototype.mapTrim = function() {return this.map(r => r.trim());}
Array.prototype.mapTrimLeft = function() {return this.map(r => r.trimLeft());}
Array.prototype.mapTrimRight = function() {return this.map(r => r.trimRight());}
Array.prototype.mapLength = function() {return this.map(r => r.length);}

Array.prototype.almostAvg = function() {return this.reduce((x, v) => (x + v) / 2);};
Array.prototype.sum = function() {return this.reduce((x, v) => (x + v))};
Array.prototype.avg = function() {return this.sum() / this.length};
Array.prototype.avg2 = function() {
	var c = 0;
	return this.reduce((x, v) => {
		c++;
		return (c * x + v) / (c + 1);
	});
}

function empty(obj) {
	for (var i in obj) {
		if (obj.hasOwnProperty(i)) {
			return false;
		}
	}
	return true;
}
isEmpty = empty;

function clone(obj) {
	var r = {};
	for (var i in obj) {
		if (obj.hasOwnProperty(i)) {
			r[i] = obj[i];
		}
	}
	return r;
}

function cloneRecur(obj) {
	var recurTable = {};
	var f;
	f = function(ov) {
		var nv = ov;
		if (recurTable[ov] != undefined) {
			nv = recurTable[ov];
		} else if (ov instanceof Array) {
			nv = Array.prototype.slice.apply(ov);
		} else if (typeof v == "object") {
			nv = {};
			recurTable[ov] = nv;
			for (var k in ov) {
				if (!obj.hasOwnProperty(k)) {
					continue;
				}
				var v = obj[k];
				nv[k] = f(v);
			}
		}
		recurTable[ov] = nv;
		return nv;
	}
	return f(obj);
}

bot.SteamBotExtInterface = function SteamBotExtInterface(name) {
	Object.defineProperty(this, "name", {value: name});
}
bot.SteamBotExtInterface.prototype.addEventListener = function addEventListener(ev, id, func) {
	bot.events.addListener(ev, this.name+"_"+id, func);
};
bot.SteamBotExtInterface.prototype.removeEventListener = function removeEventListener(ev, id) {
	bot.events.removeListener(ev, this.name+"_"+id);
};

var tickHandle;

var users = {};

var alarms = {};

bot.users = users;
bot.alarms = alarms;
bot.emotes = {
	lenny_web: "( ͡° ͜ʖ ͡°)", //ignore how it looks here lmao
	shrug:  "¯\_(ツ)_/¯",
	running: "♪~ ᕕ(ᐛ)ᕗ",
	tableflip: "(╯°□°）╯︵ ┻━┻",
	wavedance: "~(˘▾˘~)",
	tableunflip: "┬──┬ ノ( ゜-゜ノ)",
	robodance: "╚(ಠ_ಠ)=┐"
}
bot.log = function log() {
	var ar = settings.display_time ? [(new Date()).toTimeString()] : [];
	console.log.apply(console, ar.concat(Array.prototype.slice.call(arguments)));
}
bot.maxErrorDepth = 16;
bot.error = bot.log; //TODO:: implement error method later, print in red?
bot.mysql = {}
bot.sql = bot.mysql;
bot.mysql.module = mysql;
bot.mysql.available = function available() {
	return bot.mysql.module ? true : false;
}
bot.mysql.createConnection = function createConnection() {
	if (!bot.mysql.available()) {
		return false;
	}
	var connH = {};
	var conn = bot.mysql._createConnection.apply(bot.mysql, ([connH]).concat(Array.prototype.slice.apply(arguments)));
	connH.conn = conn;
	return connH;
}
bot.mysql._createConnection = function _createConnection(connH) {
	var args = Array.prototype.slice.apply(arguments);
	if (!bot.mysql.available()) {
		return false;
	}
	var queries = {
		execute: [],
		query: []
	};
	var conn;
	try {
		conn = bot.mysql.module.createConnection.apply(bot.mysql.module, args.concat().splice(1));
	} catch(err) {
		conn = _createConnection(connH); //?
	}
	// connH.conn = conn;
	conn.on("error", function(err) {
		if (err && ((["PROTOCOL_CONNECTION_LOST"]).indexOf(err.code) > -1)) {
			//initiate reconnection
			bot.debug("sql", "lost connection, trying to reconnect...");
			var conn2 = bot.mysql._createConnection.apply(bot.mysql, args);
			connH.conn = conn2;
			for (var i = 0; i < queries.execute.length; i++) {
				var q = queries.execute[i];
				if (!q) {
					continue;
				}
				connH.execute.apply(conn2, q.origArgs);
			}
			for (var i = 0; i < queries.query.length; i++) {
				var q = queries.query[i];
				if (!q) {
					continue;
				}
				connH.query.apply(conn2, q.origArgs);
			}
		}
	});
	var funcs = {};
	funcs.execute = conn.execute;
	connH.execute = function execute() {
		var origArgs = Array.prototype.slice.apply(arguments);
		var newArgs = Array.prototype.slice.apply(arguments);
		var cbi = -1;
		for (var i = 0; i < newArgs.length; i++) {
			if (typeof newArgs[i] === "function") {
				cbi = i;
				break;
			}
		}
		var dataObj = {
			origArgs: origArgs,
			args: Array.prototype.slice.apply(arguments)
		};
		if (cbi >= 0) {
			var f_r = function() {
				var rmd = false;
				for (var i = 0; i < queries.execute.length; i++) {
					if (queries.execute[i] === dataObj) {
						bot.debug("sql", "removing index "+i);
						queries.execute.splice(i, 1);
						rmd = true;
						break;
					}
				}
				if (!rmd) {
					bot.debug("sql", "couldn't remove any query entries");
				}
			}
			var f_o = newArgs[cbi];
			var f = function(err, results) {
				if (err) {
					if (err.fatal) {
						return; //let the error event reconnect + requeue
					}
					if ((["PROTOCOL_CONNECTION_LOST"]).indexOf(err.code) > -1 && !err.fatal) {
						//initiate reconnection (no? should be handled by error event)
					} else {
						f_r();
						return f_o.apply(null, arguments);
					}
				} else {
					f_r();
					f_o.apply(null, arguments);
				}
			}
			newArgs[cbi] = f;
			queries.execute.push(dataObj); //in this if-block to prevent requerying after reconnecting when there was no callback to be modified
		}
		funcs.execute.apply(conn, newArgs);
	};
	funcs.query = conn.query;
	connH.query = function query() {
		var origArgs = Array.prototype.slice.apply(arguments);
		var newArgs = Array.prototype.slice.apply(arguments);
		var cbi = -1;
		for (var i = 0; i < newArgs.length; i++) {
			if (typeof newArgs[i] === "function") {
				cbi = i;
				break;
			}
		}
		var dataObj = {
			origArgs: origArgs,
			args: Array.prototype.slice.apply(arguments)
		};
		if (cbi >= 0) {
			var f_r = function() {
				var rmd = false;
				for (var i = 0; i < queries.query.length; i++) {
					if (queries.query[i] === dataObj) {
						bot.debug("sql", "removing index "+i);
						queries.query.splice(i, 1);
						rmd = true;
						break;
					}
				}
				if (!rmd) {
					bot.debug("sql", "couldn't remove any query entries");
				}
			}
			var f_o = newArgs[cbi];
			var f = function(err, results) {
				if (err) {
					if (err.fatal) {
						return; //let the error event reconnect + requeue
					}
					if ((["PROTOCOL_CONNECTION_LOST"]).indexOf(err.code) > -1 && !err.fatal) {
						//initiate reconnection (no? should be handled by error event)
					} else {
						f_r();
						return f_o.apply(null, arguments);
					}
				} else {
					f_r();
					f_o.apply(null, arguments);
				}
			}
			newArgs[cbi] = f;
			queries.query.push(dataObj);
		}
		funcs.query.apply(conn, newArgs);
	};
	return conn;
}

/*
var sqlConn = bot.mysql.createConnection({
	host: "127.0.0.1",
	user: "root",
	password: "*****"
});
//*/
function dateString() {
	var d = new Date();
	var dd = x => x < 10 ? "0" + x : "" + x;
	return d.getFullYear()+"-"+(dd(d.getMonth()+1))+"-"+dd(d.getDate())+" "+dd(d.getHours())+":"+dd(d.getMinutes())+":"+dd(d.getSeconds());
}
/*
var sqlsess = Math.floor(Math.random() * Math.pow(10, 9));
sqlConn.query("USE sijs", function(err, results) {
	var ds = dateString();
	sqlConn.execute("INSERT INTO connections (time) VALUES ('"+(ds)+"')", function(err, results) {
		if (err) {
			console.log("Error while inserting connection log: ", err);
		}
		setInterval(function() {
			sqlConn.execute("INSERT INTO pings (session, time) VALUES ('"+sqlsess+"', '"+dateString()+"')", function(err, results) {
				//
			});
		}, 60 * 1000);
	});
});
//*/

bot.events = {};
bot.events.listeners = {};
bot.events.addListener = function addListener(evt, id, func) {
	bot.events.listeners[evt] = bot.events.listeners[evt] || {};
	var obj = {};
	obj.func = func;
	obj.evt = evt;
	obj.id = id;
	bot.events.listeners[evt][id] = obj;
}
bot.events.removeAllListeners = function removeAllListeners(evt) {
	if (evt) {
		// bot.events.listeners[evt] = {};
		delete bot.events.listeners[evt];
	} else {
		bot.events.listeners = {};
	}
}
bot.events.removeListener = function removeListener(evt, id) {
	bot.events.listeners[evt] = bot.events.listeners[evt] || {};
	delete bot.events.listeners[evt][id];
}
bot.events.getEvents = function getEvents() {
	var ar = [];
	for (var i in bot.events.listeners) {
		if (!empty(bot.events.listeners[i])) {
			ar.push(i);
		}
	}
	return ar;
}
bot.events.getListeners = function getListeners(evt) {
	return clone(bot.events.listeners[evt] || {});
}
bot.events.emit = function emit(evt, args) {
	var l = bot.events.getListeners(evt);
	for (var i in l) {
		var obj = l[i];
		var f = obj.func;
		if (typeof f === "function") {
			f.apply(null, args || []);
		}
	}
}
bot.publicCommands = {};
bot.publicCommands.list = {};
bot.publicCommands.addCommand = function addCommand(cmd, func) {
	var obj = {};
	obj.func = func;
	obj.cmd = cmd;
	bot.publicCommands.list[cmd] = obj;
}
bot.publicCommands.removeCommand = function removeCommand(cmd) {
	delete bot.publicCommands.list[cmd];
}
bot.publicCommands.getCommands = function getCommands() {
	return clone(bot.publicCommands.list);
}

bot.commands = {};
bot.commands.list = {};
bot.commands.addCommand = function addCommand(cmd, func) {
	var obj = {};
	obj.func = func;
	obj.cmd = cmd;
	bot.commands.list[cmd] = obj;
}
bot.commands.removeCommand = function removeCommand(cmd) {
	delete bot.commands.list[cmd];
}
bot.commands.getCommands = function getCommands() {
	return clone(bot.commands.list);
}

bot.commands.pub = bot.publicCommands;
bot.commands["public"] = bot.publicCommands;

bot.stats = {};
bot.stats.device = {};

bot.stats.device.ram = {};
bot.stats.device.ram.getTotal = function getTotal() {
	return os.totalmem();
}
bot.stats.device.ram.getFree = function getFree() {
	return os.freemem();
}

bot.stats.device.cpu = {};
bot.stats.device.cpu.getData = function getData() {
	var ar = os.cpus();
	var r = {};
	var models = {};
	var totalSpeed;
	var count = 0;
	var maxSpeed = 0;
	var minSpeed = 0;
	for (var i = 0; i < ar.length; i++) {
		var m = ar[i].model;
		var s = ar[i].speed;
		count++;
		totalSpeed += s;
		if (!models[m]) {
			models[m] = 0;
		}
		models[m]++;
		if (s < minSpeed || !minSpeed) {
			minSpeed = s;
		}
		if (s > maxSpeed) {
			maxSpeed = s;
		}
	} //TODO: models to array, sorted by count DESC
	r.modelsArray = [];
	for (var i in models) {
		if (models.hasOwnProperty(i)) {
			r.modelsArray.push({count: models[i], model: i});
		}
	}
	r.modelsArray.sort((a, b) => a.count < b.count);
	r.modelsArrayCount = r.modelsArray.concat();
	r.modelsArray = r.modelsArray.map(x => x.model);
	r.totalSpeed = totalSpeed;
	r.minSpeed = minSpeed;
	r.maxSpeed = maxSpeed;
	r.models = models;
	r.count = count;
	return r;
}
bot.stats.device.cpu.getCount = function getCount() {
	try {
		return bot.stats.device.cpu.getData().count;
	} catch(err) { //TODO: report error
		return -1;
	}
}
bot.stats.device.cpu.getModels = function getModels() {
	try {
		return bot.stats.device.cpu.getData().modelsArray;
	} catch(err) { //TODO: report error
		return [null];
	}
}
bot.stats.device.cpu.getModelsCount = function getModelsCount() {
	try {
		return bot.stats.device.cpu.getData().modelsArrayCount;
	} catch(err) { //TODO: report error
		return [null];
	}
}
bot.stats.device.cpu.getModel = function getModel() {
	try {
		return bot.stats.device.cpu.getData().modelsArray[0];
	} catch(err) { //TODO: report error
		return null;
	}
}
bot.stats.device.cpu.getTotalSpeed = function getTotalSpeed() {
	try {
		return bot.stats.device.cpu.getData().totalSpeed;
	} catch(err) { //TODO: report error
		return -1;
	}
}
bot.stats.device.cpu.getMinSpeed = function getMinSpeed() {
	try {
		return bot.stats.device.cpu.getData().minSpeed;
	} catch(err) { //TODO: report error
		return -1;
	}
}
bot.stats.device.cpu.getMaxSpeed = function getMaxSpeed() {
	try {
		return bot.stats.device.cpu.getData().maxSpeed;
	} catch(err) { //TODO: report error
		return -1;
	}
}
bot.stats.device.cpu.getAvgSpeed = function getAvgSpeed() {
	try {
		return bot.stats.device.cpu.getTotalSpeed() / bot.stats.device.cpu.getCount();
	} catch(err) { //TODO: report error
		return -1;
	}
}

bot.stats.device.misc = {};
bot.stats.device.misc.getUptime = function getUptime() {
	return os.uptime();
}

bot.stats.app = {};

bot.util = {};
bot.util.string = {};
bot.util.string.compare = function compare(str1, str2, opt) {
	var s1 = String(str1);
	var s2 = String(str2);
	var o = opt;
	if (typeof o != "object") {
		o = {};
	}
	if (s2.length > s1.length) { //s1 >= s2
		return compare(s2, s1);
	}
	var maxR = 1;
	var i = "maxScore";
	if (typeof o[i] != "null" && !isNaN(Number(o[i]))) {
		maxR = maxR * Number(o[i]);
	}
	maxR = maxR * (s2.length / s1.length);
	console.log(maxR);
	var minL = s2.length;
	var r = 0;
	var scores = {
		equal: 1,
		equalNoCase: 0,
		notEqual: 0
	};
	if (o.scores && typeof o.scores == "object") {
		for (var i in o.scores) {
			if (o.scores.hasOwnProperty(i) && !isNaN(Number(o.scores[i])) && Number(o.scores[i]) <= 1 && Number(o.scores[i]) >= 0) {
				scores[i] = o.scores[i];
			}
		}
	}
	for (var i = 0; i < minL; i++) {
		var s = 0;
		var c1 = s1[i];
		var c2 = s2[i];
		if (c1 == c2) {
			s = scores.equal;
		} else if (c1.toLowerCase() == c2.toLowerCase()) {
			s = scores.equalNoCase;
		} else {
			s = scores.notEqual;
		}
		r += s;
	}
	r = r / minL;
	return r * maxR;
};

bot.util.json = {};
bot.util.json.stringify = function stringify(obj, pretty) {
	var recurTable = {};
	var s = 0;
	if (pretty) {
		s = 1;
	}
	if (typeof pretty === "number" && pretty > 0) {
		s = Math.floor(pretty);
	}
	if (typeof pretty === "string") {
		s = pretty;
	}
	return JSON.stringify(obj, function(k, v) {
		if (recurTable[v] && typeof v === "object") {
			return "[Circular reference]";
		}
		recurTable[v] = true;
		return v;
	}, s).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

bot.addAdminHelp = function(cmd, h) {
	bot.admin.help[cmd] = cloneRecur(h);
}

bot.isValue = function isValue(v) {
	return ([null, undefined]).indexOf(v) < 0;
};

bot.getSettings = function getSettings() {
	return clone(settings);
};
bot.setSettingDefault = function setSettingDefault(set, def) {
	// console.log("settingDefault", set, def); //debug
	// console.log("setting got", bot.getSetting(set, null)); //debug
	// console.log("setting is v", bot.isValue(bot.getSetting(set, null))); //debug
	if (!bot.isValue(bot.getSetting(set, null))) {
		bot.setSetting(set, def);
	}
};
bot.setSetting = function setSetting(set, v) {
	bot.settings[set] = v;
};
bot.getSetting = function getSetting(set, def) {
	var v = settings[set];
	if (typeof v == "object") {
		if (v == null) {
			// return null;
			return def;
		} else {
			return clone(v);
		}
	} else if (typeof v == "string") {
		return v;
	} else if (v instanceof Array) {
		return v.concat();
	} else if (typeof v == "number") {
		return v;
	}
	if (v === undefined) {
		return def;
	}
	return v;
};
bot.getFirstSetting = function getFirstSetting(ar, def) {
	for (var i = 0; i < ar.length; i++) {
		var r = bot.getSetting(ar[i], null);
		if (r !== null) {
			return r;
		}
	}
	return def;
};
bot.compareSids = function compareSids(sid1, sid2) {
	var s1 = sid1;
	var s2 = sid2;
	if (typeof s1 === "string") {
		s1 = new SteamID(s1);
	}
	if (typeof s2 === "string") {
		s2 = new SteamID(s2);
	}
	s1 = s1.getSteamID64();
	s2 = s2.getSteamID64();
	return s1 === s2;
};

bot.ext = {};
bot.ext.list = {};
bot.ext.isLoaded = function isLoaded(ext) {
	return bot.ext.list[ext] ? true : false;
}
bot.loadExtensions = function loadExtensions() {
	
};
bot.loadExtension = function loadExtension(ext, op) {
	if (bot.ext.isLoaded(ext)) {
		return op && typeof op == "function" && op("Extension already loaded");
	}
	try {
		var files = [
			"%(ext)/main.js",
			"%(ext)/init.js",
			"%(ext)/start.js",
			"%(ext)/module.js",
			"%(ext).js",
			"%(ext)",
			""
		];
		var file;
		for (var i = 0; i < files.length; i++) {
			var f = files[i].replace("%(ext)", ext);
			console.log("file: "+f, fs.existsSync(f));
			if (f.length > 0 && fs.existsSync(f)) {
				file = f;
				break;
			}
		}
		if (file) {
			var fstr = file;
			if (fstr.substr(0, 1) !== "/") {
				fstr = "./"+fstr;
			}
			var eobj = {};
			var kek = require(fstr);
			console.log(kek);
			eobj.ret = kek;
			bot.ext.list[ext] = eobj;
			if (typeof kek == "function") {
				kek();
			} else if (typeof kek == "object" && kek) {
				if (kek.init && typeof kek.init == "function") {
					kek.init();
				} else {
					//--
				}
			} else {
				
			}
		} else {
			console.log("No file found for ext "+ext);
		}
	} catch(err) {
		var e = {};
		e.err = err;
		e.where = "loadExtension";
		e.calls = [];
		/*
		var d = 0;
		try {
			var func = bot.loadExtension;
			while (true) {
				var f2 = func.caller;
				d++;
				if (d > bot.maxErrorDepth) {
					break;
				}
				e.calls.push(f2.name || "Anonymous function");
				func = f2;
			}
		} catch(err2) {
			
		} //*/
		e.calls = bot.resolveCallStack(bot.loadExtension, true);
		bot.registerError(e);
	}
};

bot.debugModes = [];
bot.getDebugModes = function getDebugModes() {
	return bot.debugModes.concat();
};
bot.debug = function debug(mode) {
	// op = op || getDefaultOutput();
	var op = getDefaultOutput();
	if (bot.getDebugModes().includes("*") || bot.getDebugModes().includes(mode)) {
		// op(msg);
		var c = 0;
		op.apply(null, ["DEBUG|"+mode].concat(Array.prototype.slice.call(arguments).filter(function(x) {return c++ > 0;})));
	}
};

var loginKeyFile = "idle_login_keys.json";
bot.loginKeys = {};
bot.hasLoginKey = function hasLoginKey(acc) {
	return bot.loginKeys[acc] ? true : false;
}
bot.getLoginKey = function getLoginKey(acc) {
	return bot.loginKeys[acc];
}
bot.setLoginKey = function setLoginKey(acc, key) {
	bot.loginKeys[acc] = key;
	bot.saveLoginKeys();
}
bot.removeLoginKey = function removeLoginKey(acc) {
	delete bot.loginKeys[acc];
	bot.saveLoginKeys();
}
bot.saveLoginKeys = function saveLoginKeys() {
	var str = JSON.stringify(bot.loginKeys);
	try {
		fs.writeFileSync(loginKeyFile, str);
	} catch(err) {
		console.log("Error while writing login keys to file");
	}
}
bot.loadLoginKeys = function loadLoginKeys() {
	try {
		var str = fs.readFileSync(loginKeyFile);
		bot.loginKeys = JSON.parse(str);
	} catch(err) {
		//
	}
}

bot.errorStack = [];
bot.registerError = function registerError(obj = {}) {
	try {
		if (isEmpty(obj)) {
			return;
		}
		var o = clone(obj);
		o.time = o.time || +new Date;
		bot.errorStack.push(o);
		// console.log(JSON.stringify(o));
		console.log(o);
	} catch(err) {
		try {
			bot.error("Error during reporting error");
		} catch(err2) {
			//TODO: kill process due to fatal error
		}
	}
};
bot.resolveCallStack = function resolveCallStack(func, includeCur) {
	if (typeof func !== "function") {
		return [];
	}
	var calls = [];
	var anon = "Anonymous function";
	if (includeCur) {
		calls.push(func.name || anon);
	}
	try {
		var d = 0;
		while (true) {
			var f2 = func.caller;
			d++;
			if (d > bot.maxErrorDepth) {
				break;
			}
			calls.push(f2.name || anon);
			func = f2;
		}
	} catch(err) {
		
	}
	return calls;
};

bot.prepareNameForOutput = function prepareNameForOutput(acc) {
	if (!acc) {
		return "ERROR";
	}
	if (!bot.users || !bot.users[acc]) {
		//TODO: check offline users | DONE?
		var accs = bot.accs;
		if (!accs || !accs[acc]) {
			return acc;
		}
		// for (var i in accs) {
			// if (!accs.hasOwnProperty(i)) {
				// continue;
			// }
			// var rep = accs[i]["name_replacement"];
			// if (typeof rep == "string") {
				// return rep;
			// }
		// }
		try {
			var rep = accs[acc]["name_replacement"];
			if (typeof rep == "string") {
				return rep;
			}
		} catch (e) {
			
		}
		// return "ERROR";
		return acc;
	}
	if (!bot.users[acc].getAccOpt("name_replacement")) {
		return acc;
	}
	return bot.users[acc].getAccOpt("name_replacement");
};
bot.aliasToAcc = function aliasToAcc(acc) {
	bot.debug("alias", "Alias resolving function started");
	if (!bot.getSetting("alias_enable")) {
		bot.debug("alias", "Alias is disabled");
		return acc;
	}
	if (!acc) {
		bot.debug("alias", "No alias supplied");
		return acc;
	}
	var cs = bot.getSetting("alias_casesensitive");
	var keywords = ["*", "all", "none"];
	if (keywords.indexOf(cs ? acc : acc.toLowerCase()) > -1) {
		bot.debug("alias", "Keyword supplied as account name, returning...");
		return acc.toLowerCase();
	}
	var accs = bot.accs;
	if (!accs) {
		bot.debug("alias", "No 'accs' object found");
		return acc;
	}
	bot.debug("alias", "Checking 'accs' obj");
	for (var i in accs) {
		if (!accs.hasOwnProperty(i)) {
			continue;
		}
		var al = accs[i]["name_alias"];
		if (typeof al == "string") {
			if ((cs ? acc : acc.toLowerCase()) == (cs ? al : al.toLowerCase())) {
				return i;
			}
		}
		if (al instanceof Array) {
			for (var i2 = 0; i2 < al.length; i2++) {
				if (typeof al[i2] !== "string") {
					continue;
				}
				bot.debug("alias", "alias '"+al[i2]+"' found for account "+i);
				if ((cs ? acc : acc.toLowerCase()) == (cs ? al[i2] : al[i2].toLowerCase())) {
					return i;
				}
			}
		}
	}
	bot.debug("alias", "no alias found matching '"+acc+"', returning as account name...");
	return acc;
};

bot.steamIDFromDict = function(id) { //TODO: implement dict
	return id;
};

bot.dictOrAliasToAcc = function dictOrAliasToAcc(acc) { //TODO: add sid dict
	return bot.aliasToAcc(acc);
};

function reverseString(str) {
	var s = "";
	for (var i = str.length; i--; i >= 0) {
		s = s + str[i];
	}
	return s;
}

function getDefaultReplaceObject() {
	return {
		"%%": "%"
	}
}

function getTimeReplaceObject(time) {
	var curDate;
	if (time) {
		curDate = new Date(time);
	} else {
		curDate = new Date();
	}
	var d = curDate;
	return {
		"%H": doubleDigit(d.getHours()),
		"%M": doubleDigit(d.getMinutes()),
		"%S": doubleDigit(d.getSeconds()),
		"%Y": doubleDigit(d.getFullYear()),
		"%m": doubleDigit(d.getMonth() + 1),
		"%d": doubleDigit(d.getDate()),
		"%y": doubleDigit(d.getFullYear() - Math.floor(d.getFullYear() / 100) * 100)
	}
}

function combineObjects(obj1, obj2) {
	var ar = [];
	if (obj1 instanceof Array) {
		ar = ar.concat(obj1);
	} else {
		ar.push(obj1);
	}
	if (obj2 instanceof Array) {
		ar = ar.concat(obj2);
	} else if (obj2) {
		ar.push(obj2);
	}
	// console.log(obj1, obj2, ar);
	var obj = {};
	for (var i = 0; i < ar.length; i++) {
		// console.log(i);
		for (var i1 in ar[i]) {
			// console.log(i, i1);
			obj[i1] = ar[i][i1];
		}
	}
	// console.log(obj);
	return obj;
}

Date.prototype.addDays = function(days) {
	var dat = new Date(this.valueOf());
	dat.setDate(dat.getDate() + days);
	return dat;
}

function doubleDigit(num) {
	var n = num + "";
	if (n.length < 2) {
		n = "0" + n;
	}
	return n;
}

function toBool(b) {
	if (b) {
		return true;
	} else {
		return false;
	}
}

function getDefaultOutput() {
	// return console.log;
	return bot.log;
}

function sidToSID64(sid) {
	var sid64 = sid;
	if ((typeof sid64) !== "string") {
		try {
			sid64 = sid64.getSteamID64();
		} catch(err) {
			
		}
	}
	return sid64;
}

function sidMatch(sid1, sid2, sid1_is_sid_obj) {
	// console.log("prear", sid1, sid2, sid1_is_sid_obj);
	// bot.debug("sidExt", typeof sid1, sid1, typeof sid2, sid2);
	if (typeof sid2 == "string") {
		sid2 = new SteamID(sid2);
	}
	var match = [sid2, sid2.getSteamID64(), sid2.getSteam2RenderedID(), sid2.getSteam2RenderedID(true), sid2.getSteam3RenderedID()];
	// bot.debug("sidExt", "match:", match);
	if (!sid1) {
		bot.debug("sidExt", "no sid1");
		return false;
	}
	if (!(sid1 instanceof Array)) {
		sid1 = [sid1];
	}
	// console.log("postar", sid1, sid2);
	for (var i in sid1) {
		// bot.debug("sidExt", "index stuff", typeof i, i, parseInt(i), typeof parseInt(i), "'"+i+"'");
		if (isNaN(parseInt(i))) {
			// bot.debug("sidExt", "skipped loop iteration for index ", i, typeof i);
			continue;
		}
		var match1 = [sid1[i]];
		// bot.debug("sidExt", sid1, sid1[i], typeof sid1[i]);
		if (
		// sid1[i] instanceof SteamID ||
		sid1_is_sid_obj) {
			match1 = match1.concat([sid1[i].getSteamID64(), sid1[i].getSteam2RenderedID(), sid1[i].getSteam2RenderedID(true), sid1[i].getSteam3RenderedID()]);
		}
		// if (match.includes(sid1)) {
			// return true;
		// }
		for (var i1 in match1) {
			// console.log("match", match, match1[i1]);
			if (match.includes(match1[i1])) {
				return true;
			}
		}
	}
	return false;
}

// function getAccs(str, via, sender, recipient) {
function getAccs(str, via, extra) {
	if (!str || str === "all") {
		str = "*";
	}
	var curAccs = [];
	var i = 0;
	var la = 0;
	var filters = [];
	while (true) {
		if (i >= str.length) {
			if (la < str.length) {
				filters.push(str.substr(la));
			}
			break;
		}
		var c = str[i];
		if (i <= 0 && (c === "[" || c === "!")) {
			filters.push("*");
		}
		if (c === "[" || c === "!") {
			if (i > 0) {
				filters.push(str.substr(la, i - la));
				la = i;
			}
		}
		i++;
	}
	// return filters; //for testing
	function filterName(n) {
		if (via === "steam") {
			if ((["me", "i", "my"]).includes(n.toLowerCase())) {
				//return sender
				if (extra && extra["from"] && extra["from"]["acc"]) {
					return extra["from"]["acc"];
				}
			}
			if ((["you"]).includes(n.toLowerCase())) {
				//return recipient
				if (extra && extra["to"] && extra["to"]["acc"]) {
					return extra["to"]["acc"];
				}
			}
		}
		// return n;
		return bot.aliasToAcc(n);
	}
	for (var i = 0; i < filters.length; i++) {
		var filter = filters[i];
		if (filter === "*") {
			// curAccs = [];
			// for (var i1 in users) {
				// curAccs.
			// }
			curAccs = Object.keys(users);
		} else if (filter.startsWith("[") && filter.endsWith("]")) {
			var fAccs = filter.replace(/\s+/g, "").substr(1, filter.replace(/\s+/g, "").length - 2).toLowerCase().split(",").map((u) => filterName(u));
			curAccs = curAccs.filter((u) => fAccs.includes(u.toLowerCase()));
		} else if (filter.startsWith("!")) {
			curAccs = curAccs.filter((u) => u.toLowerCase() !== filterName(filter.substr(1).toLowerCase()));
		} else {
			curAccs = [filterName(filter)].filter((u) => Object.keys(users).includes(u.toLowerCase()));
		}
	}
	return curAccs;
}
bot.getAccs = getAccs;

bot.accsToUsers = function accsToUsers(accs) {
	return accs.map(x => bot.users[x]).filter(x => x);
}

function formatCurrency(bal, cur) {
	var char_eur = "\u20ac";
	var char_dollar = "\u0024";
	var char_yen = "\u00a5";
	var char_btc = "\u0e3f";
	var char_corrupted = "";
	var cc = {
		USD: {
			"char": "$",
			dp: 2
		},
		EUR: {
			"char": "€", // "\u20ac"
			dp: 2
		},
		CAD: {
			"char": "$",
			dp: 2
		},
		GBP: {
			"char": "£",
			dp: 2
		},
		AUD: {
			"char": "$",
			dp: 2
		},
		RUB: {
			"char": "Руб",
			dp: 2
		},
		JPY: "¥",
		CHF: {
			"char": "Fr.",
			dp: 2
		},
		BTC: "฿"
	};
	//fix for wrong encoding
	var chars = {
		BTC: char_btc,
		CAD: char_dollar,
		USD: char_dollar,
		AUD: char_dollar,
		JPY: char_yen,
		EUR: char_eur
	};
	for (var i in chars) {
		if (chars.hasOwnProperty(i)) {
			if (!(["null", "undefined"]).includes(typeof cc[i])) {
				if (typeof cc[i] === "string") {
					if (cc[i] !== chars[i]) {
						cc[i] == chars[i];
					}
				} else {
					if (cc[i]["char"] !== chars[i]) {
						cc[i]["char"] == chars[i];
					}
				}
			}
		}
	}
	// if (cc.BTC["char"]) {
		// if (cc.BTC["char"] !== char_btc) {
			// cc.BTC["char"] = char_btc;
		// }
	// } else {
		// if (cc.BTC !== char_btc) {
			// cc.BTC = char_btc;
		// }
	// }
	var curc = SteamUser.ECurrencyCode[cur];
	if (!curc) {
		return "" + bal;
	}
	if (cc[curc]) {
		var chr = cc[curc];
		if (chr instanceof Object) {
			chr = chr["char"];
		}
		var dp = 0;
		if (cc[curc] instanceof Object) {
			dp = cc[curc]["dp"] || 0;
		}
		var smart = true;
		if (!smart) {
			bal = Math.floor(bal * Math.pow(10, dp)) / Math.pow(10, dp);
		}
		if (smart && dp <= 0) {
			bal = Math.floor(bal);
		}
		var balstr = bal + "";
		var intlen = (""+Math.floor(bal)).length;
		if (Math.floor(bal) !== bal) {
			slen = intlen + 1 + dp;
			if (smart) {
				if (slen < (bal+"").length) {
					bal = Math.floor(bal * Math.pow(10, dp)) / Math.pow(10, dp);
					balstr = bal + "";
				}
			}
			while (balstr.length < slen) {
				balstr = balstr + "0";
			}
		}
		return balstr + " " + chr;
	} else {
		return SteamUser.formatCurrency(bal, cur);
	}
}

function processStr(str) {
	var g = str;
	if ((typeof g) == "string" && g.substr(0, 1) == ":") { //clock
		g = g.substr(1);
		var d = new Date();
		g = g.replaceMultiple(combineObjects([getDefaultReplaceObject(), getTimeReplaceObject()]));
		while (g.search("%rd") >= 0) {
			g = g.replace("%rd", Math.floor(Math.random() * 10));
		}
		while (g.search("%rD") >= 0) {
			g = g.replace("%rD", Math.floor(Math.random() * 9) + 1);
		}
	}
	return g;
}

function processGame(game, user, ignorePlayingState) {
	var g = game;
	var re = /^\d+$/;
	var g2 = g;
	if (typeof g2 === "string" && g2.match(re)) {
		g2 = parseInt(g2);
	}
	// console.log(user.name, typeof g2, g2, JSON.stringify(user.getOptComb("games_blacklist")), user.getOptComb("games_blacklist").indexOf(g2));
	if (user && user.playingStateBlocked && !ignorePlayingState && (typeof g2) == "number") {
		return null;
	}
	if (user && user.getOptComb("games_blacklist").indexOf(g2) >= 0) {
		return null;
	}
	if (typeof g2 === "string" && g2 === ":cards" && user) {
		var cg = user.currentCardApps || [];
		var r = [];
		for (var i = 0; i < cg.length; i++) {
			if (user.getOptComb("games_blacklist").indexOf(g2) < 0) {
				r.push(cg[i]);
			}
		}
		if (user && user.playingStateBlocked && !ignorePlayingState && (typeof g2) == "number") {
			return null;
		}
		return r;
	}
	if (typeof g2 === "string" && bot.game_presets[g2] instanceof Array) {
		return bot.game_presets[g2].concat();
	}
	if (typeof g2 === "string" && (["number", "string"]).indexOf(typeof bot.game_presets[g2]) > -1) {
		return bot.game_presets[g2];
	}
	return processStr(g);
	// if ((typeof g) == "string" && g.substr(0, 1) == ":") { //clock
		// g = g.substr(1);
		// var d = new Date();
		// g = g.replaceMultiple({"%%": "%", "%H": doubleDigit(d.getHours()), "%M": doubleDigit(d.getMinutes()), "%S": doubleDigit(d.getSeconds())});
		// while (g.search("%rd") >= 0) {
			// g = g.replace("%rd", Math.floor(Math.random() * 10));
		// }
		// while (g.search("%rD") >= 0) {
			// g = g.replace("%rD", Math.floor(Math.random() * 9) + 1);
		// }
	// }
	// return g;
}

function processCustomMessage(msg) {
	var m = msg;
	m = processStr(m);
	var robj = {};
	var wl = []; //["maximum_alarms", "tick_delay", "afkmsg_delay", "afk_defaultmsg"]
	var bl = [];
	var types = ["string", "number"];
	if (!settings["custommsg_usesettingwhitelist"]) { //use blacklist
		for (var i in settings) {
			var v = settings[i];
			if (!bl.includes(i) && types.includes(typeof v)) {
				robj[i] = "" + v;
			}
		}
	} else {
		for (var i in wl) {
			if (settings[i] && wl.includes(i) && types.includes(typeof settings[i])) {
				robj[i] = "" + settings[i];
			}
		}
	}
	var robj2 = {};
	for (var i in robj) {
		robj2["{set:"+i+"}"] = robj[i];
	}
	m = m.replaceMultiple(robj2);
	return m;
	// if ((typeof m) == "string" && m.substr(0, 1) == ":") {
		// m = m.substr(1);
		// var d = new Date();
		// g = g.replaceMultiple({"%%": "%", "%H": doubleDigit(d.getHours()), "%M": doubleDigit(d.getMinutes()), "%S": doubleDigit(d.getSeconds())});
		// while (g.search("%rd") >= 0) {
			// g = g.replace("%rd", Math.floor(Math.random() * 10));
		// }
		// while (g.search("%rD") >= 0) {
			// g = g.replace("%rD", Math.floor(Math.random() * 9) + 1);
		// }
	// }
	// return m;
}

function processGamesArray(games, user, ignorePlayingState) {
	if ((typeof games) == "string" || (typeof games) == "number") {
		return processGame(games, user, ignorePlayingState);
	}
	var r = [];
	for (var i = 0; i < games.length; i++) {
		var g = processGame(games[i], user, ignorePlayingState);
		if (g instanceof Array) {
			r = r.concat(g);
		} else {
			if (g) {
				r.push(g);
			}
		}
	}
	r = r.filter(function(x){return ([null, undefined]).indexOf(x) < 0;});
	if (user && user.playingStateBlocked && !ignorePlayingState) {
		r = r.filter(x => (typeof x) !== "number");
	}
	if (user && (r.length > user.getOpt("maxGames"))) {
		r.splice(user.getOpt("maxGames"));
	}
	return r;
}

function idle(user, games) {
	if (user.idlingBlocked) {
		return;
	}
	function processBlockedGames(user, g) {
		if (user.playingStateBlocked) {
			// g = [];
			try {
				for (var i = 0; i < (g instanceof Array ? g.length : -1); i) {
					if (typeof g[i] === "string") {
						bot.debug("idle","skipping "+g[i]+" @"+i);
						i++;
					} else {
						var s = g.splice(i, 1);
						bot.debug("idle", "splicing "+s[0]+" @"+i);
					}
				}
			} catch(err) {
				var e = {};
				e.err = err;
				e.where = "idle";
				e.calls = [];
				bot.registerError(e);
			}
		}
		return g;
	}
	var g = games;
	if (user.overwriteIdling) {
		g = user.overwriteIdling;
	}
	if (user.hasIdleTimeout()) {
		g = [];
	}
	if (typeof g === "object" && !(g instanceof Array)) {
		var main = bot.getMainIdleFromObject(g);
		var backup = bot.getBackupIdleFromObject(g)
		if (main instanceof Array) {
			//
		} else if (typeof main === "object" && !(main instanceof Array)) {
			main = bot.getMainIdleFromObject(main);
			if (!(main instanceof Array)) {
				main = [main];
			}
		} else {
			main = [main]; //more stuff later
		}
		processBlockedGames(user, main);
		main = processGamesArray(main, user);
		if (backup instanceof Array) {
			//
		} else if (typeof backup === "object" && !(backup instanceof Array)) {
			backup = bot.getMainIdleFromObject(backup);
			if (!(backup instanceof Array)) {
				backup = [backup];
			}
		} else {
			backup = [backup];
		}
		if (main.length > 0) {
			g = main;
		} else {
			g = backup;
		}
	}
	g = g instanceof Array ? g.map(x => x) : g;
	if (!(g instanceof Array)) {
		g = [g];
	}
	processBlockedGames(user, g);
	bot.debug("idle", user.name+": "+g.length+" game(s) | "+g.join(", "));
	try {
		user.gamesPlayed(processGamesArray(g, user));
	} catch(err) {
		var e = {};
		e.err = err;
		e.where = "processGamesArray | gamesPlayed";
		e.calls = [];
		bot.registerError(e);
	}
	bot.debug("idle", "post gamesPlayed");
}

bot.idle = idle;

function checkFriends(user) {
	var friends = user.myFriends;
	var frs = {};
	for (var i in friends) {
		var rs = friends[i];
		if (!frs[rs]) {
			frs[rs] = [];
		}
		frs[rs].push(i);
	}
	for (var rs in frs) {
		var rss = SteamUser.EFriendRelationship[rs];
		for (var fr in frs[rs]) {
			var sid64 = frs[rs][fr];
			console.log(rss+"|"+sid64);
		}
	}
}

var friendRequests = {};
var aFriendRequests = {};

var afkMsgsSent = {};
var msgsSent = {};

function updateFriendFile() {
	try {
		// fs.accessSync(settings["friendSaveFile"], fs.constants.W_OK);
		var str = JSON.stringify(aFriendRequests);
		fs.writeFileSync(settings["friendSaveFile"], str);
	} catch(err) {
		//
	}
}

function loadFriendFile() {
	try {
		fs.accessSync(settings["friendSaveFile"], fs.constants ? fs.constants.R_OK : fs.R_OK);
		var data = fs.readFileSync(settings["friendSaveFile"]);
		var d = JSON.parse(data);
		if (!(d instanceof Object)) {
			throw Error("JSON not an object");
		}
		aFriendRequests = d;
	} catch(err) {
		//
	}
}

function checkFriendRequest(user, fr) {
	var autoaccept_min_lvl = (user.opts || {}).autoaccept_min_lvl;
	user.getSteamLevels([fr], function(results) {
		var ulvl = results[fr];
		if (!aFriendRequests[user.name]) {
			aFriendRequests[user.name] = {};
		}
		if (autoaccept_min_lvl >= 0 && autoaccept_min_lvl <= ulvl && (([null, undefined]).indexOf(user.getOpt("autoaccept_max_lvl")) > -1 || user.getOpt("autoaccept_max_lvl") >= ulvl)) { //test update
			//accept
			aFriendRequests[user.name][fr] = "+";
			user.addFriend(fr, function(err, name) {
				if (err) {
					return;
				}
				var acm = settings["autoaccept_msgs"] || settings["autoaccept_msg"];
				if ((typeof acm) == "string") {
					acm = [acm];
				}
				if (!(acm instanceof Array)) {
					acm = ["Hey there! You got accepted by the bot."];
				}
				for (var i = 0; i < acm.length; i++) {
					user.chatMessage(fr, acm[i].replaceMultiple(combineObjects([getDefaultReplaceObject(), getTimeReplaceObject(), {"%n": name}])));
				}
				user.setNickname(fr, "Automatically accepted as "+name+(bot.formatDate ? " at "+bot.formatDate() : ""));
				delete friendRequests[user.name][fr];
			});
			// user.chatMessage(fr, "Hey there! You got accepted by the bot.");
		} else {
			//cancel or 'ignore'
			if (settings["autoaccept_cancel_lowlvl"]) {
				aFriendRequests[user.name][fr] = "-";
				user.removeFriend(fr);
				delete friendRequests[user.name][fr];
			} else {
				//do nothing
				aFriendRequests[user.name][fr] = "~";
			}
		}
		// addToFriendFile(user.name, fr, aFriendRequests[user.name][fr]);
		updateFriendFile();
	});
}

function checkForFriendRequests(user) {
	if (!settings["autoaccept"]) {
		return;
	}
	var autoaccept_min_lvl = (user.opts || {}).autoaccept_min_lvl;
	if (autoaccept_min_lvl < 0) {
		return;
	}
	var friends = user.myFriends;
	for (var i in friends) {
		if (friends[i] == SteamUser.EFriendRelationship.RequestRecipient) {
			if (!friendRequests[user.name]) {
				friendRequests[user.name] = {};
			}
			if (!friendRequests[user.name][i]) {
				friendRequests[user.name][i] = true;
				checkFriendRequest(user, i);
				if (settings["singleFriendAccept"]) {
					return true;
				}
			}
		}
	}
}

function checkNewFriends(user, op) {
	var name = (user || {}).name || user;
	if (!aFriendRequests[name]) {
		op("No friend requests found for "+bot.prepareNameForOutput(name));
		return;
	}
	for (var frid in aFriendRequests[name]) {
		var state = aFriendRequests[name][frid];
		if (state == "+") {
			msg = "was accepted by the bot";
		} else if (state == "~") {
			// msg = "was ignored by the bot. You may judge if he's worthy to be on your friend list";
			// msg = "was ignored by the bot";
			msg = "(OPEN FRIEND REQUEST)";
		} else if (state == "-") {
			msg = "was denied by the bot";
		} else {
			msg = "has no valid request state";
		}
		var clm = settings["newfriends_chatlink_mode"] || settings["newfriends_chatlink"];
		var lnk = ((clm == 1 || (clm == 2 && state == "+")) ? "steam://friends/message/" : "http://steamcommunity.com/profiles/")+frid;
		op(bot.prepareNameForOutput(name)+": "+lnk+" "+msg);
	}
}

function cards(user, op) {
	if (!user.cardCheckRunning) {
		cardCheck(user, function(user, cardApps) {
			for (var i = 0; i < cardApps.length; i++) {
				var str = JSON.stringify(cardApps[i]);
				op(user.name+": "+str);
			}
		}, true);
	}
}

function checkCards(user, op) {
	op = op || function(){};
	if (!Cheerio || !request) {
		bot.debug("cards", "cheerio or request not loaded");
		return;
	}
	if (user.cardCheckRunning && user.cardCheckStart + user.getOpt("cardCheckTimeout") * 1000 <= +new Date) {
		bot.debug("cards", "Card check timeout exceeded for "+bot.prepareNameForOutput(user.name)+", resending request...");
		user.cardCheckRunning = false;
	}
	if (user.cardCheckRunning) {
		bot.debug("cardsExt", "already a card check running on "+bot.prepareNameForOutput(user.name));
		return;
	}
	if (!user.idlingCards()) {
		bot.debug("cardsExt", bot.prepareNameForOutput(user.name)+" isn't idling cards");
		return;
	}
	var lastCheck = user.lastCheck || 0;
	var lastDiff = (+new Date) - lastCheck;
	var delay = user.newItems ? user.getOpt("cardCheckMinDelay") : (user.getOpt("cardCheckDelay") || settings["cardCheckDelay"] || (5 * 60));
	if (lastDiff < delay * 1000) {
		bot.debug("cardsExt", "still in delay for "+bot.prepareNameForOutput(user.name));
		return;
	}
	var f = function(u, cardApps) {
		bot.debug("cards", "received card apps on "+bot.prepareNameForOutput(user.name));
		user.newItems = false;
		if (cardApps.length <= 0) {
			user.currentCardApps = [];
			user.allCardApps = cardApps;
			// if (u.badgePageHashes) {
				// bot.debug("cards", "Badge page hash object found for "+u.name);//, u.badgePageHashes);
			// } else {
				// bot.debug("cards", "No badge page hash found for "+u.name);
			// }
			// bot.debug("cards", u.firstGameOnPage);
			if (u.firstGameOnPage && user.firstGameOnPage[u.cardPage - 1] && user.firstGameOnPage[u.cardPage - 1] === user.firstGameOnPage[u.cardPage]) {
			// if (u.badgePageHashes && user.badgePageHashes[u.cardPage - 1] && user.badgePageHashes[u.cardPage - 1] === user.badgePageHashes[u.cardPage]) {
				// bot.debug("cards", "current page ("+u.cardPage+") has the same hash as page "+(u.cardPage-1)+", jumping back to page 1");
				bot.debug("cards", "current page ("+u.cardPage+") has the same first app as page "+(u.cardPage-1)+", jumping back to page 1");
				u.cardPage = 1;
				u.firstGameOnPage = {};
			} else {
				bot.debug("cards", "current page ("+u.cardPage+") empty, jumping to page "+(u.cardPage+1));
				u.cardPage++;
			}
			return;
		}
		var cardIdleReachCardTimeFirst = u.getOpt("cardIdleReachCardTimeFirst");
		var cardIdleMultiHours = u.getOpt("cardIdleMultiHours");
		var ca = cardApps.concat();
		//sort here
		if (true) {
			while (true) {
				var change = false;
				for (var i = 0; i < ca.length - 1; i++) {
					var pre = ca[i];
					var nxt = ca[i + 1];
					if (cardIdleReachCardTimeFirst ? (pre["playtime"] > nxt["playtime"]) : (pre["playime"] < nxt["playtime"])) {
						ca[i] = nxt;
						ca[i + 1] = pre;
						change = true;
					}
				}
				if (!change) {
					break;
				}
			}
		}
		if (ca.length > u.getOpt("maxGames")) {
			ca.splice(u.getOpt("maxGames"), Infinity);
		}
		if (!cardIdleReachCardTimeFirst || !cardIdleMultiHours) {
			ca.splice(1, Infinity);
		}
		var cas;
		if (true) {
			cas = [];
			for (var i = 0; i < ca.length; i++) {
				cas.push(ca[i].appid);
			}
		} else {
			cas = ca.map(function(x){return x.appid});
		}
		bot.debug("cards", "card apps to idle for "+bot.prepareNameForOutput(user.name)+": ", cas);
		user.currentCardApps = cas;
		user.allCardApps = cardApps;
	};
	user.cardCheckStart = +new Date;
	cardCheck(user, f);
}

function cardCheck(user, callback, keepLastCheck) {
	if (!Cheerio || !request) {
		return false;
	}
	var g_Jar = request.jar();
	var g_Page = user.cardPage;
	if (!user.appOwnershipCached && !user.getOpt("cardIdleNoOwnershipCheck")) {
		bot.debug("cards", bot.prepareNameForOutput(user.name)+" not ready for card idling, app ownership not cached yet");
		return false;
	}
	if (!user.cookies && !bot.getSetting("cardsWebLogOnEveryTime")) {
		bot.debug("cards", bot.prepareNameForOutput(user.name)+" not ready for card idling, no cookies found");
		return false;
	}
	if (!user.licenses) {
		bot.debug("cards", bot.prepareNameForOutput(user.name)+" not ready for card idling, no licenses found");
		return false;
	}
	if (!user.picsCache || !user.picsCache.packages) {
		bot.debug("cards", bot.prepareNameForOutput(user.name)+" not ready for card idling, no picsCache found");
		return false;
	}
	user.cardCheckRunning = true;
	if (!keepLastCheck) {
		user.lastCheck = +new Date;
	}
	var f = function(sessionID, cookies) {
		cookies.forEach(function(cookie) {
			g_Jar.setCookie(cookie, "https://steamcommunity.com");
		});
		var rq = request.defaults({"jar": g_Jar});
		if (!keepLastCheck) {
			user.lastCheck = +new Date;
		}
		bot.debug("cards", "now sending request for badge page "+g_Page+" on acc "+bot.prepareNameForOutput(user.name));
		rq("https://steamcommunity.com/my/badges/?p="+g_Page, function(err, response, body) {
			user.cardCheckRunning = false;
			if (err || response.statusCode != 200) {
				// op("Couldn't request badge page: "+(err||"HTTP error "+response.statusCode));
				if (!keepLastCheck) {
					user.lastCheck = (+new Date) - user.getOpt("cardCheckDelay") * 1000 + user.getOpt("cardCheckFailDelay") * 1000; //could also do this with the param tho
				}
				bot.debug("cards", "badge request for "+bot.prepareNameForOutput(user.name)+" failed, returned "+(err ? "error" : "status code " + response.statusCode));
				return false;
			}
			if (bot.writebadgepage) {
				try {
					var fn = "./badges_"+user.name+"_"+processStr(":%Y-%m-%d_%H-%M-%S")+".html";
					fs.writeFileSync(fn, body);
					bot.debug("cards", "successfully wrote the badge page for "+bot.prepareNameForOutput(user.name)+" to a file");
				} catch(err) {
					bot.debug("cards", "error writing the badge page for "+bot.prepareNameForOutput(user.name)+" to a file");
				}
			}
			bot.debug("cards", "badge request for "+bot.prepareNameForOutput(user.name)+" arrived, now parsing...");
			if (!keepLastCheck) {
				user.lastCheck = +new Date;
			}
			var ownedPackages;
			if (!user.getOpt("cardIdleNoOwnershipCheck")) {
				try {
					ownedPackages = user.licenses.map(function(license) {
						var pkg = user.picsCache.packages[license.package_id].packageinfo;
						pkg.time_created = license.time_created;
						pkg.payment_method = license.payment_method;
						return pkg;
					}).filter(function(pkg) {
						return !(pkg.extended && pkg.extended.freeweekend);
					});
				} catch(err) {
					return false;
				}
			} else {
				ownedPackages = [];
			}
			var $_ = Cheerio.load(body);
			if (!user.firstGameOnPage) {
				user.firstGameOnPage = {};
			}
			if (!user.badgePageHashes) {
				user.badgePageHashes = {};
			}
			if (md5) { //disabled due to steam sending different pages no matter how many requests we make :/
				// user.badgePageHashes[g_Page] = md5(body);
				// bot.debug("cards", "Saved md5 hash "+user.badgePageHashes[g_Page]+" for badge page "+g_Page+" on "+user.name+", found "+$_(".badge_row").length+" .badge_row elements");
			}
			/*
			var brlen = $_(".badge_row").length;
			if (!user.badgeRowLengths) {
				user.badgeRowLengths = {};
			}
			user.badgeRowLengths[g_Page] = brlen; //*/
			// bot.debug("cards", user.name+" has a badge row length of "+$_(".badge_row").length+" on badge page "+g_Page);
			var infolines = $_(".progress_info_bold");
			// bot.debug("cards", infolines.length+" infolines on page "+g_Page+" on "+user.name);
			var cardApps = [];
			for (var i = 0; i < infolines.length; i++) {
				// var match = $_(infolines[i]).text().(/(\d+) card drops? remaining/);
				var match = $_(infolines[i]).text().match(/(\d+)/);
				var br = $_(infolines[i]).closest('.badge_row');
				var ael = br.find('.badge_title_playgame a');
				var href = ael.attr('href');
				var bro = br.find(".badge_row_overlay");
				var broh = bro.attr("href");
				
				var idm = href ? href.match(/steam:\/\/run\/(\d+)/) : null;
				var appid = (idm ? idm[1] : href);
				
				// bot.debug("cards", ael.html(), href, idm, appid, parseInt(appid), user.picsCache.apps.hasOwnProperty(appid), user.firstGameOnPage[g_Page]);
				// var appid2 = broh.match(/^https?:\/\/(?:www\.)?steamcommunity\.com\/(?:.*)\/gamecards\/(?:\d+)\/?$/);
				var appid2 = broh.match(/\/gamecards\/(\d+)\/?$/);
				appid2 = appid2 ? appid2[1] : null;
				if (appid2 && parseInt(appid2) && user.picsCache.apps.hasOwnProperty(appid2) && !user.firstGameOnPage[g_Page]) {
					user.firstGameOnPage[g_Page] = parseInt(appid2);
					bot.debug("cards", "set first game on page "+g_Page+" for "+bot.prepareNameForOutput(user.name)+" to "+appid2);
				}
				// for (var i in ael) {
					// op(i+" "+typeof ael[i]);
				// }
				// op(""+br.html());
				// op(""+ael.html());
				// op(""+ael.attr("href"));
				// return;
				// continue;
				// op(typeof ael + ael);
				// op(typeof href + href);
				if (!match || !href) {
					continue;
				}
				// var overlay = br.find(".badge_row_overlay");
				// if (!overlay) {
					// continue;
				// }
				
				
				
				//check if app is owned, idm
				if(!user.picsCache.apps.hasOwnProperty(appid)) {
					continue;
				}
				
				var newlyPurchased = false;
				var lastPkg;
				// Find the package(s) in which we own this app
				ownedPackages.filter(function(pkg) {
					return pkg.appids && pkg.appids.indexOf(appid) != -1;
				}).forEach(function(pkg) {
					var timeCreatedAgo = Math.floor(Date.now() / 1000) - pkg.time_created;
					if(timeCreatedAgo < (60 * 60 * 24 * 14) && [Steam.EPaymentMethod.ActivationCode, Steam.EPaymentMethod.GuestPass, Steam.EPaymentMethod.Complimentary].indexOf(pkg.payment_method) == -1) {
						newlyPurchased = true;
					}
					lastPkg = pkg;
				});
				
				var playtime = br.find(".badge_title_stats").html().match(/(\d+\.\d+)/);
				if (!playtime) {
					playtime = 0.0;
				} else {
					playtime = parseFloat(playtime[1], 10);
					if (isNaN(playtime)) {
						playtime = 0.0;
					}
				}
				
				var dropsLeft = 0;
				
				if (match && match[1] && parseInt(match[1])) {
					dropsLeft = parseInt(match[1]);
					// op(match[1]+" cards in "+appid+" with a playtime of "+(playtime)+"h");
				}
				var gameObj = {};
				gameObj.appid = parseInt(appid);
				gameObj.dropsLeft = parseInt(dropsLeft);
				gameObj.playtime = parseFloat(playtime);
				gameObj.time_created = (lastPkg ? lastPkg.time_created : 0);
				gameObj.newlyPurchased = newlyPurchased;
				var onBlacklist = user.getOptComb("games_blacklist").indexOf(gameObj.appid) > -1;
				if (onBlacklist) {
					//ignore message?
				}
				if (dropsLeft > 0 && !onBlacklist) {
					cardApps.push(gameObj);
				}
			}
			bot.debug("cards", "finished parsing badge page for "+bot.prepareNameForOutput(user.name)+", found "+cardApps.length+" game"+(cardApps.length == 1 ? "" : "s"));
			if (callback) {
				callback(user, cardApps);
			}
		});
	}
	var f2 = function() {
		user.hasLoggedOnListener = false;
		if (bot.getSetting("cardsWebLogOnEveryTime")) {
			user.once("webSession", f);
			user.webLogOn();
		} else {
			f(user.sessionID, user.cookies);
		}
	}
	if (user.hasLoggedOnListener) {
		return;
	}
	if (!user.steamID) {
		user.once("loggedOn", f2);
		user.hasLoggedOnListener = true;
	} else {
		f2();
	}
}

function checkCardsCmd(user, op) {
	if (true) { //for testing
		cards(user, op);
		return;
	}
	op = op || function(){};
	var g_Jar = request.jar();
	var g_Page = 1;
	if (!user.cookies) {
		return;
	}
	user.cookies.forEach(function(cookie) {
		g_Jar.setCookie(cookie, "https://steamcommunity.com");
	});
	var rq = request.defaults({"jar": g_Jar});
	rq("https://steamcommunity.com/my/badges/?p="+g_Page, function(err, response, body) {
		if (err || response.statusCode != 200) {
			op("Couldn't request badge page: "+(err||"HTTP error "+response.statusCode));
			return;
		}
		try {
			var file = "/var/www/html/badges_"+user.name+".html";
			// fs.writeFileSync(file, body);
			// op("Successfully wrote the body to "+file);
		} catch(err) {
			// op("An error occured while writing to the file");
			return;
		}
		var ownedPackages = user.licenses.map(function(license) {
			var pkg = user.picsCache.packages[license.package_id].packageinfo;
			pkg.time_created = license.time_created;
			pkg.payment_method = license.payment_method;
			return pkg;
		}).filter(function(pkg) {
			return !(pkg.extended && pkg.extended.freeweekend);
		});
		var $_ = Cheerio.load(body);
		var infolines = $_(".progress_info_bold");
		for (var i = 0; i < infolines.length; i++) {
			// var match = $_(infolines[i]).text().(/(\d+) card drops? remaining/);
			var match = $_(infolines[i]).text().match(/(\d+)/);
			var br = $_(infolines[i]).closest('.badge_row');
			var ael = br.find('.badge_title_playgame a');
			var href = ael.attr('href');
			// for (var i in ael) {
				// op(i+" "+typeof ael[i]);
			// }
			// op(""+br.html());
			// op(""+ael.html());
			// op(""+ael.attr("href"));
			// return;
			// continue;
			// op(typeof ael + ael);
			// op(typeof href + href);
			if (!match || !href) {
				continue;
			}
			// var overlay = br.find(".badge_row_overlay");
			// if (!overlay) {
				// continue;
			// }
			
			var idm = href ? href.match(/steam:\/\/run\/(\d+)/) : null;
			var appid = (idm ? idm[1] : href);
			
			//check if app is owned, idm
			if(!user.picsCache.apps.hasOwnProperty(appid)) {
				continue;
			}
			
			var newlyPurchased = false;
			var lastPkg;
			// Find the package(s) in which we own this app
			ownedPackages.filter(function(pkg) {
				return pkg.appids && pkg.appids.indexOf(appid) != -1;
			}).forEach(function(pkg) {
				var timeCreatedAgo = Math.floor(Date.now() / 1000) - pkg.time_created;
				if(timeCreatedAgo < (60 * 60 * 24 * 14) && [Steam.EPaymentMethod.ActivationCode, Steam.EPaymentMethod.GuestPass, Steam.EPaymentMethod.Complimentary].indexOf(pkg.payment_method) == -1) {
					newlyPurchased = true;
				}
				lastPkg = pkg;
			});
			
			var playtime = br.find(".badge_title_stats").html().match(/(\d+\.\d+)/);
			if (!playtime) {
				playtime = 0.0;
			} else {
				playtime = parseFloat(playtime[1], 10);
				if (isNaN(playtime)) {
					playtime = 0.0;
				}
			}
			
			var dropsLeft = 0;
			
			if (match && match[1] && parseInt(match[1])) {
				dropsLeft = parseInt(match[1]);
				op(match[1]+" cards in "+appid+" with a playtime of "+(playtime)+"h");
			}
		}
	});
}

function parsePeriod(period) {
	var re = /[1-9][0-9]*[hHmMsS]/g;
	var mults = [
		{
			mult: 1,
			id: ["s", "S"]
		},
		{
			mult: 60,
			id: ["m", "M"]
		},
		{
			mult: 60*60,
			id: ["h", "H"]
		}
	];
	var pep = null;
	var sec = 0;
	var p = period;
	// var c = 0;
	while (pep = re.exec(p)) {
		// pep = re.exec(p);
		// console.log(c, pep, re, p);
		if (!pep) {
			break;
		}
		var re1 = /([1-9][0-9]*)([sSmMhH])/;
		var res = re1.exec(pep);
		var num = res[1];
		var muls = res[2];
		var mult = 1;
		for (var i = 0; i < mults.length; i++) {
			if (mults[i]["id"].includes(muls)) {
				mult = mults[i]["mult"];
				break;
			}
		}
		sec = sec + mult * parseInt(num);
		// c++;
		// if (c >= 499) {
			// return null;
		// }
	}
	return sec;
}

function checkAlarms() {
	var curDate = new Date();
	var curTime = curDate.getTime();
	for (var user in alarms) {
		for (var sid64 in alarms[user]) {
			var ualarms = alarms[user][sid64];
			var tr = false;
			for (var i in ualarms) {
				var ualarm = ualarms[i];
				var time = ualarm["time"];
				var desc = ualarm["desc"];
				if (time < curTime) {
					if (users[user]) {
						var msg = "Your alarm was triggered";
						if (desc) {
							msg = msg + ": "+desc;
						}
						users[user].chatMessage(sid64, msg);
					}
					tr = true;
				}
			}
			while (tr) {
				var c = false;
				for (var i in ualarms) {
					var ualarm = ualarms[i];
					var time = ualarm["time"];
					var desc = ualarm["desc"];
					if (time < curTime) {
						c = true;
						ualarms.splice(i, 1);
						break;
					}
				}
				if (!c) {
					break;
				}
			}
			alarms[user][sid64] = ualarms;
		}
	}
}

function addAlarm(user, sid, str, msg) {
	var sid64 = sid.getSteamID64();
	if (!alarms[user]) {
		alarms[user] = {};
	}
	if (!alarms[user][sid64]) {
		alarms[user][sid64] = [];
	}
	var curDate = new Date();
	var re_total = /^([0-1]?[0-9]|2[0-4]):([0-5]?[0-9])$/;
	var re_period = /^(([1-9][0-9]*)[hH])?(([1-9][0-9]*)[mM])?(([1-9][0-9]*)[sS])?$/;
	var re_period2 = /^\S*$/;
	var altime = 0;
	if (re_total.exec(str)) {
		var today = new Date(curDate.toDateString());
		var tomorrow = today.addDays(1);
		var todtime = new Date(today.toDateString() + " " + str);
		var tomtime = new Date(tomorrow.toDateString() + " " + str);
		if (todtime.getTime() < curDate.getTime()) {
			altime = tomtime.getTime();
		} else {
			altime = todtime.getTime();
		}
	} else if (re_period.exec(str) && re_period2.exec(str)) {
		var p = parsePeriod(str);
		altime = curDate.getTime() + (p * 1000);
	} else {
		return false;
	}
	var ualarms = alarms[user][sid64];
	if (ualarms.length >= settings["maximum_alarms"]) {
		return false;
	}
	var obj = {time: altime, desc: msg, id: Math.floor(Math.random() * Math.pow(10, 5))};
	ualarms.push(obj);
	alarms[user][sid64] = ualarms;
	return obj;
}

function updateOnlineStatus(name) {
	var user;
	if ((typeof name) == "string") {
		user = users[name];
	} else {
		user = name;
	}
	user.setPersona(user.isOnline && SteamUser.Steam.EPersonaState.Online || SteamUser.Steam.EPersonaState.Offline);
}

function tick() {
	var frLevelChecked = false;
	for (var i in users) {
		if (!users[i].initialised()) {
			continue;
		}
		if (users[i].idlingCards()) {
			checkCards(users[i]); //only check if currently idling cards	
		}
		idle(users[i], users[i].curIdling);
		// users[i].setPersona(users[i].isOnline && SteamUser.Steam.EPersonaState.Online || SteamUser.Steam.EPersonaState.Offline);
		updateOnlineStatus(i);
		if (!settings["singleFriendAccept"] || !frLevelChecked) {
			var r = checkForFriendRequests(users[i]);
			if (r && settings["singleFriendAccept"]) {
				frLevelChecked = true;
			}
		}
	}
	checkAlarms();
}

function login(name, pw, authcode, secret, games, online, callback, opts) {
	var user = new SteamUser();
	
	var firstLoginTrigger = true;
	var killPrepared = false;
	
	ac = authcode || SteamTotp.getAuthCode(secret || "");
	
	if (!secret && !authcode) {
		ac = "";
	}
	ac = SteamTotp.getAuthCode("");
	
	user.cardPage = 1;
	
	user.loggedIn = false;
	 
	user.on("error", function(err) {
		if (err == "Error: InvalidPassword") {
			if (!user.loggedIn) {
				console.log("Invalid password entered for "+bot.prepareNameForOutput(name));
				if (opts.keep_login && bot.hasLoginKey(name)) {
					bot.removeLoginKey(name);
				}
				user.logOff();
				if (callback) {
					callback();
				}
			} else {
				console.log("Invalid password entered for "+bot.prepareNameForOutput(name)+" although already being logged in...");
			}
		} else {
			console.log("An error occured...");
			console.log(err);
		}
	});
	 
	user.on("disconnected", function() {
		if (!killPrepared) {
			console.log(name+" lost connection");
		}
	});
	
	user.on("steamGuard", function(domain, callback) {
		console.log("Steam Guard code needed from email ending in "+domain);
		console.log("get code now...");
	});
	
	var logOnObj = {
		accountName: name,
		password: (opts.keep_login && bot.hasLoginKey(name)) ? null : pw
	};
	
	if (opts.keep_login) {
		logOnObj.rememberPassword = true;
		if (bot.hasLoginKey(name)) {
			logOnObj.loginKey = bot.getLoginKey(name);
		}
	}
	
	user.logOn(logOnObj);
	
	var loggedOn = function() {
		user.name = name;
		if (user.lastUIMode) {
			user.setUIMode(user.lastUIMode);
		}
		updateOnlineStatus(name);
		user.curIdling = user.curIdling || games || [221410];
		idle(user, user.curIdling);
		user.loggedIn = true;
	}
	 
	user.on("webSession", function(sessionID, cookies) {
		if (!bot.getSetting("cardsWebLogOnEveryTime")) {
			user.sessionID = sessionID;
			user.cookies = cookies;
		}
		if (firstLoginTrigger) {
			console.log("Logged in!");
			users[name] = user;
			user.opts = opts;
			user.isOnline = toBool(online);
			loggedOn();
			firstLoginTrigger = false;
			if (callback) {
				callback();
			}
			try {
				user.setOption("enablePicsCache", true);
			} catch(err) {
				//delay?
				console.log("Error setting enablePicsCache option, expect some things to not work properly");
			}
		}
	});
	
	user.on("loggedOn", function() {
		if (!firstLoginTrigger) {
			console.log("Reconnected with "+name);
			loggedOn();
		}
	});
	
	user.on("playingState", function(blocked, playingApp) {
		bot.debug("info", "playingState|"+user.name+"|"+(blocked ? "true" : "false")+"|"+(playingApp ? playingApp : 0));
		user.playingStateBlocked = blocked;
	});
	
	user.prepareKill = function() {
		killPrepared = true;
	}
	
	user.once("appOwnershipCached", function() {
		// console.log("Cached app ownership for "+user.name);
		user.appOwnershipCached = true;
	});
	
	user.on("loginKey", function(key) {
		bot.setLoginKey(name, key);
	});
	
	user.on("newItems", function(count) {
		if (!user.initialised()) {
			return;
		}
		user.newItems = true;
		bot.debug("cards", "new items arrived on "+bot.prepareNameForOutput(user.name)+", trying to check cards...");
		checkCards(user);
	});
	
	user.on("newComments", function(count, myItems, discussions) {
		
	});
	
	user.on("tradeRequest", function(steamID, respond) {
		
	});
	
	user.on("tradeOffers", function(count) {
		
	});
	
	user.on("user", function(sid, userdata) {
		
	});
	
	user.on("friendMessageEcho", function(sid, msg) {
		// console.log(user.name+" sent '"+msg+"' to "+sid.getSteamID64());
		//suppress afk message for the next 5 minutes or so (cfg)
		if (!msgsSent[user.name]) {
			msgsSent[user.name] = {};
		}
		// msgsSent[user.name][sid.getSteamID64()] = +new Date;
		msgsSent[user.name][sid.getSteamID64()] = (new Date()).getTime();
	});
	
	user.on("friendMessage", function onFriendMessageHandler(sid, msg) {
		if (!user.steamID) {
			bot.error("Message received on account without steam id - "+bot.prepareNameForOutput(user.name));
			return;
		}
		var sid64 = sid.getSteamID64();
		// user.chatMessage(sid, "Your steamid64: "+sid64);
		// user.chatMessage(sid, reverseString(msg));
		var authorized = false;
		// var wl = settings["cmd_whitelist"];
		var userIds = [];
		for (var i in users) {
			if (users[i].steamID) {
				userIds.push(users[i].steamID.getSteamID64());
			}
		}
		// bot.debug("redirect", userIds);
		var wl = user.getOpt("cmd_whitelist");
		if (!wl || !(wl instanceof Array)) {
			wl = [];
		}
		// if (wl.includes(sid64) || wl.includes(sid.getSteam3RenderedID()) || wl.includes(sid.getSteam2RenderedID(true)) || wl.includes(sid.getSteam2RenderedID())) {
		if (sidMatch(wl, sid) || (user.getOpt("steamcmd_autoauth") && sidMatch(userIds, sid))) {
			authorized = true;
		}
		// bot.debug("cmdAuth", typeof wl, wl, typeof sid, sid, authorized);
		var publicCommandExecuted = false;
		var r;
		try {
			r = checkForPublicCommand(sid, msg, user, name, authorized);
		} catch(err) {
			var e = {};
			e.err = err;
			e.where = "checkForPublicCommand";
			e.calls = bot.resolveCallStack(onFriendMessageHandler, true);
			bot.registerError(e);
		}
		if (r) {
			publicCommandExecuted = true;
		}
		var privateCommandExecuted = false;
		if (!publicCommandExecuted) {
			if (authorized) {
				// user.chatMessage(sid, "I obey your commands, master!");
				if (msg.substr(0, 1) === "!") {
					cmd = msg.substr(1);
					var p = parseCommand(cmd);
					var f = function(msg) {
						// user.chatMessage(sid, msg);
						user.chatMessage(sid, Array.prototype.slice.apply(arguments).map(x => x.toString()).join(" "));
					};
					var extra = {};
					extra["from"] = {};
					extra["to"] = {};
					extra["to"]["acc"] = user.name;
					extra["to"]["sid"] = user.sid;
					extra["from"]["sid"] = sid;
					for (var i in users) {
						if (users[i].steamID && users[i].steamID.getSteamID64() === sid.getSteamID64()) {
							extra["from"]["acc"] = i;
						}
					}
					try {
						privateCommandExecuted = runCommand(p, null, f, "steam", extra);
					} catch(err) {
						f("An error occured while executing the command: "+err);
					}
				}
			} else {
				// user.chatMessage(sid, "You shall not pass.");
			}
		}
		// console.log("Checking redirection", user.redirectTo, sid);
		// console.log("matching redirectTo");
		// bot.debug("redirect", typeof user.redirectTo, user.redirectTo, msg);
		if (true) {
			if (user.redirectTo && !publicCommandExecuted && !privateCommandExecuted && msg.substr(0, 1) != "!" && user.steamID !== user.redirectTo && user.steamID.getSteamID64() !== user.redirectTo && !sidMatch(user.redirectTo, sid, (typeof user.redirectTo) !== "string") && !sidMatch(userIds, sid)) {
				user.getPersonas([sid], function(personas) {
					
					var sid64 = sidToSID64(sid);
					// console.log(user.redirectTo, personas, personas[sid64]);
					try {
						var rmsg = "Message from "+((personas[sid64] || {})["player_name"] || "Unknown")+" ["+sid64+"]: "+msg;
						if ((["console"]).includes(user.redirectTo)) {
							bot.log(rmsg);
						} else {
							user.chatMessage(user.redirectTo, rmsg);
						}
					} catch(err) {
						//printing the error message will spam the console when misconfiguring the redirection, so we'll just ignore it (subject to change)
					}
				});
			}
		} else {
			if (!publicCommandExecuted && !privateCommandExecuted && msg.substr(0, 1) != "!" && !sidMatch(userIds, sid)) {
				var redTo = user.redirectTo;
				if (!(redTo instanceof Array)) {
					redTo = [redTo];
				}
				redTo = redTo.filter(x => {
					return x && user.steamID !== x && user.steamID.getSteamID64() !== x && !sidMatch(x, sid, (typeof x) !== "string");
				});
				if (redTo.length > 0) {
					user.getPersonas([sid], function(personas) {
						
						var sid64 = sidToSID64(sid);
						// console.log(user.redirectTo, personas, personas[sid64]);
						try {
							var rmsg = "Message from "+((personas[sid64] || {})["player_name"] || "Unknown")+" ["+sid64+"]: "+msg;
							// if ((["console"]).includes(user.redirectTo)) {
								// bot.log(rmsg);
							// } else {
								// user.chatMessage(user.redirectTo, rmsg);
							// }
							for (var i = 0; i < redTo.length; i++) {
								if ((["console"]).includes(redTo[i])) {
									bot.log(rmsg);
								} else if ((["buffer"]).includes(redTo[i])) {
									//TODO: implement msg buffer
								} else {
									user.chatMessage(redTo[i], rmsg);
								}
							}
						} catch(err) {
							//printing the error message will spam the console when misconfiguring the redirection, so we'll just ignore it (subject to change)
						}
					});
				}
			}
		}
		if (!afkMsgsSent[user.name]) {
			afkMsgsSent[user.name] = {};
		}
		if (!msgsSent[user.name]) {
			msgsSent[user.name] = {};
		}
		var last = afkMsgsSent[user.name][sid64] || 0;
		var lastMsg = msgsSent[user.name][sid64] || 0;
		// bot.debug("afk", typeof user.afkMsg, user.afkMsg, last, lastMsg, msg);
		if (msg.substr(0, 1) !== "!" && ((typeof user.afkMsg) == "string" || user.afkMsg instanceof Array) && (new Date()).getTime() - (/*settings["afkmsg_delay"]*/user.getOpt("afkmsg_delay") * 1000) > last && (new Date()).getTime() - (/*settings["afkmsg_suppress_time"]*/user.getOpt("afkmsg_suppress_time") * 1000) > lastMsg && !sidMatch(user.getOpt("afk_blacklist"), sid)) {
			var f = false;
			for (var i in users) {
				// bot.debug("afkExt", typeof users[i].steamID, users[i].steamID, typeof sid, sid);
				// console.log("matching logged in user");
				if (sidMatch(users[i].steamID, sid, true)) {
					f = true;
					break;
				}
			}
			if (!f) {
				f = sidMatch(wl, sid);
			}
			if (!f) {
				afkMsgsSent[user.name][sid64] = (new Date()).getTime();
				if (user.afkMsg instanceof Array) {
					for (var i = 0; i < user.afkMsg.length; i++) {
						user.chatMessage(sid, user.afkMsg[i]);
					}
				} else {
					user.chatMessage(sid, user.afkMsg);
				}
			}
		}
	});
}

function onErr(err) {
	console.log(err);
	return 1;
}
//key or ['name']: acc name
//['password']: password to use for login [NOT RECOMMENDED]
//['pw_index']: pw index
//['online']: whether to be displayed as online
//['games']: array containing game ids
//['secret']: secret for generating auth codes [NOT TESTED, CURRENTLY DISABLED]
//['keep_login']: keep a login key [NOT RECOMMENDED, NOT FULLY TESTED]
var pws = {};
var games = [730];
var settingsfile = "idleset.json";
var accfile = "idleaccs.json";
var game_presets_file = "idlegp.json";
var game_presets = {
	cs: [
		10,
		80,
		240,
		730
	],
	stop: [],
	idling: ["~Idling~"],
	clock: [":%H:%M"],
	steam4linux: [221410],
	cards: [":cards"], //used for idling cards, maybe remove array later?
	cards_backup: {idle: [":cards"], backup: ["steam4linux"]}
};
bot.game_presets = game_presets;
var accs = {
};
bot.accs = accs;
settings = {
	autologin: true, //whether to login every account on startup
	cmd: true, //whether to display a command line after logging in every account (only valid if autologin is true)
	tick_delay: 10, //idle checking delay in seconds
	cmd_whitelist: [],
	logout_via_chat: false,
	offline_via_chat: false,
	online_via_chat: false,
	maximum_alarms: 10,
	public_chat_bot: true,
	autoaccept: true, //whether to automatically accept friend requests, has to be turned on for every account by setting autoaccept_min_lvl to 0 or higher
	time_special: [
		{
			h: [4, 16],
			m: [20],
			msg: "Time 2 blaze!"
		},
		{
			h: [13],
			m: [37],
			msg: "Time 4 h4x"
		},
		{
			h: [3, 15],
			m: [36],
			msg: "It's 3:36!"
		}
	],
	autoaccept_cancel_lowlvl: false,
	customcmds: {
		github: "https://github.com/PixLSteam/SteamIdleNodeJS",
		owner: "PixL owns me and all",
		help: [
			"\n =============== > All Bot Commands < =============== \n Here is a list with all Bot commands. \n \n ~~~~~~~~~~~~~~~ > Steam ID features < ~~~~~~~~~~~~~~~ \n 1. !id <steam url>: to get every Steam 64id. \n 2. !sid: to get your own Steam id. \n 3. !sid64: to get ur own Steam 64id. \n \n ~~~~~~~~~~~~~ > Clock / Date features < ~~~~~~~~~~~~~~~ \n 1. !time: to get the current time. \n 2. !date: to get the current date. \n 3. !alarm <time | delay> \"<description>\": to set an alarm (max. {set:maximum_alarms}). \n 4. !alarm list: to show all alarms. \n 5. !alarm remove <id>: to remove an alarm. \n 6. !alarm clear: to remove all alarms. \n \n ~~~~~~~~~~~~~~~ > Fun features < ~~~~~~~~~~~~~~~~~~ \n 1. !coin: to flip a coin. \n 2. !dice [<sides>]: to throw a dice. \n 3. !8ball [<your question>]: to ask 8ball something. \n ============================================"
		],
		nemo: "http://www.steamcommunity.com/profiles/76561198063245159",
		pixl: "http://www.steamcommunity.com/profiles/76561198135386775",
		bot: "I'm a bot, bleep bloop"
	},
	afk_defaultmsg: "Hey there! I'm currently afk, try again later",
	afkmsg_delay: 5, //delay in seconds
	newfriends_chatlink_mode: 2,
	display_time: false,
	afkmsg_suppress_time: 300, //afkmsg suppress time (by own msg)
	singleFriendAccept: true, //accept max 1 friend per cycle
	friendSaveFile: "./autofriend.json",
	cardIdleMultiHours: false, //idle multiple games simultaneously until they reach 2H, currently disabled
	cardIdleReachCardTimeFirst: false, //whether to idle all games up to 2H before trying to get cards, currently disabled
	maxGames: 30, //max games to idle at once per account
	cardCheckDelay: 5 * 60,
	cardCheckFailDelay: 10,
	cardCheckMinDelay: 60,
	cardsWebLogOnEveryTime: true,
	afk_blacklist: [], //steam ids to ignore for afk message
	cardCheckTimeout: 60,
	steamcmd_autoauth: true, //whether to allow admin cmds from own accounts, ignoring whitelist for them
	cardIdleNoOwnershipCheck: false,
	enableAdvancedAccountSelection: true,
	alias_enable: true,
	alias_casesensitive: false,
	namechange_instant: true,
	mckay_anonstats_optout: false, //automatically opt out of https://github.com/DoctorMcKay/node-stats-reporter
	w2p_idledelay: 60 * 1000 //idle delay for !w2p in ms
};
bot.settings = settings;
function loadSettings(display_output) {
	try {
		fs.accessSync(settingsfile, fs.constants ? fs.constants.R_OK : fs.R_OK);
		var setdata = fs.readFileSync(settingsfile);
		try {
			var pdata = JSON.parse(setdata);
			if (!(pdata instanceof Object)) {
				throw Error("Parsed JSON is not an object");
			}
			for (var i in pdata) {
				if (pdata[i] instanceof Object && !(pdata[i] instanceof Array) && settings[i] instanceof Object && !(settings[i] instanceof Array)) {
					for (var i2 in pdata[i]) {
						settings[i][i2] = pdata[i][i2];
					}
				} else {
					settings[i] = pdata[i];
				}
			}
		} catch(err) {
			if (display_output) {
				console.log("Couldn't parse settings file: "+err);
			} else {
				return false;
			}
		}
	} catch(err) {
		if (display_output) {
			console.log("No settings file['"+settingsfile+"'] found, skipping...");
		} else {
			return false;
		}
	}
	return true;
}
loadSettings(true);
try {
	fs.accessSync(accfile, fs.constants ? fs.constants.R_OK : fs.R_OK);
} catch (err) {
	console.log("Couldn't read account file '"+accfile+"'");
	return 1;
}
var data = fs.readFileSync(accfile);
try {
	var pdata = JSON.parse(data);
	if (!(pdata instanceof Object)) {
		throw Error("Parsed JSON is not an object");
	}
	accs = pdata;
	bot.accs = accs;
} catch(err) {
	// console.log(err);
	console.log("Couldn't parse account file: "+err);
	// console.log(data);
	return 1;
}
function loadGamePresets(display_output) {
	try {
		fs.accessSync(game_presets_file, fs.constants ? fs.constants.R_OK : fs.R_OK);
		var gpdata = fs.readFileSync(game_presets_file);
		try {
			var pdata = JSON.parse(gpdata);
			if (!(pdata instanceof Object)) {
				throw Error("Parsed JSON is not an object");
			}
			for (var i in pdata) {
				game_presets[i] = pdata[i];
			}
		} catch(err) {
			if (display_output) {
				console.log("Couldn't parse game presets file: "+err);
			} else {
				return false;
			}
		}
	} catch(err) {
		if (display_output) {
			console.log("No game presets file['"+game_presets_file+"'] found, skipping...");
		} else {
			return false;
		}
	}
	return true;
}
loadGamePresets(true);
loadFriendFile();

bot.help = {};
bot.help.admin = { //help for commands
	idle: {
		params: [
			{
				name: "acc",
				type: "account",
				multipleAccs: true,
				supportsAdvSelection: true,
				optional: true,
				defVal: "all accounts"
			},
			{
				name: "games",
				type: "multiple",
				types: {
					number: {
						input: "game id"
					},
					string: {
						input: [
							"List of game ids separated by ','",
							"Game preset name"
						]
					}
				},
				optional: true,
				defVal: "stop idling"
			}
		],
		hide: false
	},
	afk: {
		params: [
			{
				name: "acc",
				type: "account",
				multipleAccs: true,
				supportsAdvSelection: false,
				optional: true,
				defVal: "all accounts"
			},
			{
				name: "afk msg",
				type: "string",
				input: "Afk message",
				optional: true,
				defVal: "default afk message"
			}
		]
	},
	uimode: {
		params: [
			{
				name: "acc",
				type: "account",
				multipleAccs: true,
				supportsAdvSelection: false,
				optional: true,
				defVal: "all accounts"
			},
			{
				name: "ui mode",
				type: "string",
				optional: true,
				defVal: "no change",
				input: "+<uimode> to add, -<uimode> to remove"
			}
		]
	}
}

var accids = [];
for (var i in accs) {
	accids.push(i);
}
function gamesVarToArray(v) {
	if ((typeof v) == "string") {
		if (game_presets[v]) {
			return game_presets[v];
		}
		return [v];
	}
	return v;
}
function accGetOpts(i) {
	var obj = {
		autoaccept_min_lvl: (accs[i]["autoaccept_min_lvl"] == undefined || accs[i]["autoaccept_min_lvl"] == null ? -1 : accs[i]["autoaccept_min_lvl"]),
		games_blacklist: (accs[i]["games_blacklist"] ? ((typeof (accs[i]["games_blacklist"])) === "string" ? (accs[i]["games_blacklist"].match(/^\d+(,\d+)*$/) ? accs[i]["games_blacklist"].split(",").map(function(x){return parseInt(x)}) : (parseInt(accs[i]["games_blacklist"]) ? [parseInt(accs[i]["games_blacklist"])] : [])) : (accs[i]["games_blacklist"] instanceof Array ? accs[i]["games_blacklist"].filter(function(x){return !isNaN(parseInt(x))}).map(function(x){return parseInt(x)}) : 	[])) : [])
	};
	for (var ix in accs[i]) {
		if (accs[i].hasOwnProperty(ix) && !obj.hasOwnProperty(ix) && !obj[ix]) {
			obj[ix] = accs[i][ix];
		}
	}
	return obj;
}
function doAccId(index) {
	if (index >= accids.length) {
		if (settings["cmd"]) {
			openCMD();
		}
		return;
	}
	var i = accids[index];
	var name = accs[i]["name"] || i;
	var pwi = accs[i]["pw_index"];
	var authcode = null;
	if (pwi == undefined) {
		pwi = null;
	}
	var d = accs[i];
	var secret = accs[i]["secret"];
	var games = gamesVarToArray(accs[i]["games"]);
	var online = accs[i]["online"];
	var f = function(err, result) {
		if (err) {
			onErr(err);
			if (err == "Error: canceled") {
				if (callback) {
					callback();
				}
			}
			return 1;
		}
		if (pwi) {
			pws[pwi] = result.password;
		}
		login(name, result.password, authcode, secret, games, online, function() {doAccId(index + 1);}, accGetOpts(i));
	}
	if ((pwi && pws[pwi]) || d["password"] || (accGetOpts(i).keep_login && bot.hasLoginKey(i))) {
		console.log("Found existing login data for "+bot.prepareNameForOutput(name));
		f(0, {password: (pwi && pws[pwi]) ? pws[pwi] : d["password"]});
	} else {
		console.log("Requesting password for "+bot.prepareNameForOutput(name));
		prompt.get({properties: {password: {hidden: true, replace: "*"}}}, f);
	}
}
function loopReplace(str, o, n) {
	var os = null;
	var s = str;
	while (os !== s) {
		os = s;
		s = s.replace(o, n);
	}
	return s;
}
function trimSpaces(str) {
	return /^\s*((\S.*\S|\S)?)\s*$/.exec(str)[1];
}
bot.emulateCommand = function emulateCommand(cmd, opt = {}) {
	var p = parseCommand(trimSpaces(cmd));
	var log = [];
	var f = function() {
		log.push(arguments);
	}
	var cb = function() {
		//do nothing?
	}
	try {
		runCommand(p, cb, f, opt["via"] || "emulation", {});
	} catch(err) {
		//register error
		var e = {};
		e.err = err;
		e.where = "runCommand";
		// e.calls = ["emulateCommand"];
		// e.calls = e.calls.concat(bot.resolveCallStack(bot.emulateCommand, true));
		e.calls = bot.resolveCallStack(bot.emulateCommand, true);
		bot.registerError(e);
	}
	return {
		log: log
	};
}
function openCMD() {
	var next = openCMD;
	prompt.get({properties:{cmd:{message: "Enter command", description: "Command"}}}, function(err, result) {
		if (err) {
			// console.log(typeof err+":"+err);
			// for (var i in err) {
				// console.log(i+":"+typeof err[i]+(":"+err[i]));
			// }
			if (err == "Error: canceled") {
				console.log("NOTICE: To exit, type 'exit'");
				next();
				return;
			} else {
				onErr(err);
			}
			// onErr(err); //don't want to print the error message
			// next();
			// console.log("onErr triggered");
			return 1;
		}
		// var p = parseCommand(trimSpaces(loopReplace(result.cmd, "  ", " ")));
		var p = parseCommand(trimSpaces(result.cmd));
		try {
			// runCommand(p, next, console.log, "cmd");
			runCommand(p, next, getDefaultOutput(), "cmd");
		} catch(err) {
			//register error
			console.log("Error running command: "+err);
			next();
		}
		// next();
	});
}
function parseCommand(cmd, ext, opt) {
	if (!ext) {
		var args = [];
		var i = 0;
		var q = "";
		var la = 0;
		var ia = false;
		while (i <= cmd.length) {
			i += 1;
			if (i >= cmd.length) {
				break;
			}
			var c = cmd[i];
			if (c == "'" || c == '"') {
				if (ia) {
					if (q == c && (i >= cmd.length - 1 || ([" "]).indexOf(cmd[i + 1]) > -1)) {
						ia = false;
						q = "";
						// console.log(1, "'"+a+"'", i, la);
						var a = cmd.substr(la + 1, i - la - 1);
						args.push(a);
					}
				} else {
					ia = true;
					q = c;
					la = i;
				}
				continue;
			}
			if ((c == " " && !ia) || i == cmd.length - 1) {
				var a = cmd.substr(la, i - la);
				if (i == cmd.length - 1) {
					a = cmd.substr(la);
				}
				var sl = a[0];
				var sr = a[a.length - 1];
				// console.log("2.1", "'"+a+"'", sl, sr, i, la);
				if (!((sl == "'" || sl == '"') && sl == sr)) {
					// console.log("2.2", "'"+a+"'");
					var sO = true;
					for (var si = 0; si < a.length; si++) {
						if (a[si] !== " ") {
							sO = false;
							break;
						}
					}
					if (!sO) {
						args.push(a);
					}
				}
				la = i + 1;
			}
		}
		// console.log("end", i, la);
		return args;
	} else { //TODO: EXT PARSE (NEW CLASS FOR OUTPUT?[PROB GONNA USE ARRAY AS LONG AS DASH OPTS ARE NOT IMPLEMENTED])
		var out = [];
		var ccmd = 0;
		var mult;
		if (opt && opt["multiple"] !== null && opt["multiple"] !== undefined) { //prob gonna ignore this
			mult = opt["multiple"] ? true : false;
		}
		var args = [];
		var i = 0; //current index
		var q = ""; //last quotation mark used
		var la = 0; //start of current command part
		var ia = false; //in quotation marks
		var ds = ""; //dashString
		var fq = true; //firstQuote (quotation marks)
		while (i <= cmd.length) {
			i += 1;
			if (i >= cmd.length) {
				break;
			}
			var c = cmd[i];
			if (c == "'" || c == '"') {
				if (ia) {
					if (q == c) {
						ia = false;
						q = "";
						// console.log(1, "'"+a+"'", i, la);
						var a = cmd.substr(la + 1, i - la - 1);
						// console.log("pushing1 '"+a+"' to ccmd: "+ccmd);
						args.push(a);
						la = i + 1;
					}
				} else {
					ia = true;
					q = c;
					if (ds.length > 0 && fq) {
						
					} else {
						la = i;
					}
					fq = false;
				}
				continue;
			}
			if (i == la) {
				ds = "";
				fq = true;
			}
			if (c == "-" && (i == la || (i - 1 == la && cmd[i - 1] == "-"))) {
				var dd = (i - 1 == la && cmd[i - 1] == "-");
				if (dd) {
					ds = "--";
				} else {
					ds = "-";
				}
			}
			if ((c == " " && !ia) || i == cmd.length - 1 || (c == ";" && !ia)) {
				var a = cmd.substr(la, i - la);
				if (i == cmd.length - 1) {
					a = cmd.substr(la);
				}
				var sl = a[0];
				var sr = a[a.length - 1];
				// console.log("2.1", "'"+a+"'", sl, sr, i, la);
				if (!((sl == "'" || sl == '"') && sl == sr)) {
					// console.log("2.2", "'"+a+"'");
					var sO = true;
					for (var si = 0; si < a.length; si++) {
						if (a[si] !== " " && a[si] !== ";") {
							sO = false;
							break;
						}
					}
					if (!sO) {
						// console.log("pushing2 '"+a+"' to ccmd: "+ccmd, i, la, cmd.substr(la, i - la), cmd.length, i == cmd.length - 1);
						args.push(a);
					}
				}
				la = i + 1;
				if (i >= cmd.length - 1 || (c == ";" && !ia)) {
					// console.log("finished command "+ccmd, args);
					if (args.length > 0) {
						out[ccmd] = args;
						args = [];
						ccmd++;
					}
				}
			}
		}
		// console.log("end", i, la);
		return out;
	}
}
function runCommand(cmd, callback, output, via, extra) { //via: steam, cmd
	var op = output;
	if (!(op instanceof Function)) {
		op = getDefaultOutput();
	}
	users = users ? users : bot.users; //workaround for users somehow being undefined
	accs = accs ? accs : bot.accs;
	if (cmd[0] == "login") {
		var acc = bot.aliasToAcc(cmd[1]);
		if (via === "steam") {
			op("Logging in via steam chat is not possible");
			if (callback) {
				return callback();
			} else {
				return true;
			}
		}
		try {
			if (!acc) {
				throw SIJSError("No account provided");
			}
			// console.log(accs, bot.accs);
			// console.log(users, bot.users);
			//login w/ acc...
			if (!accs[acc]) {
				throw SIJSError("Account not in database");
			}
			if (users[acc]) {
				throw SIJSError("Account is already logged in");
			}
			var d = accs[acc];
			var name = acc || d["name"];
			var pwi = d["pw_index"];
			var authcode = null;
			if (pwi == undefined) {
				pwi = null;
			}
			var secret = d["secret"];
			var games = gamesVarToArray(d["games"]);
			var online = d["online"];
			var f = function(err, result) {
				if (err) {
					onErr(err);
					if (err == "Error: canceled") {
						if (callback) {
							callback();
						}
					}
					return 1;
				}
				if (pwi) {
					pws[pwi] = result.password;
				}
				login(name, result.password, authcode, secret, games, online, callback, accGetOpts(acc));
			}
			if ((pwi && pws[pwi]) || d["password"] || (accGetOpts(name).keep_login && bot.hasLoginKey(name))) {
				op("Found existing login data for "+bot.prepareNameForOutput(name));
				f(0, {password: (pwi && pws[pwi]) ? pws[pwi] : d["password"]});
			} else {
				op("Requesting password for "+bot.prepareNameForOutput(name));
				prompt.get({properties: {password: {hidden: true, replace: "*"}}}, f);
			}
			return;
		} catch(err) {
			// op(err);
			// op(err.lineNumber);
			// op(err.stack);
			op("Error logging in: "+(err.lineNumber?("["+err.lineNumber+"] "):"")+err);
			if (callback) {
				return callback();
			} else {
				return true;
			}
		}
	}
	if (cmd[0] == "logout") {
		var acc = bot.aliasToAcc(cmd[1]);
		if (via === "steam" && !settings["logout_via_chat"]) {
			op("Logging out via steam chat is disabled");
			if (callback) {
				return callback();
			} else {
				return true;
			}
		}
		try {
			if (!acc) {
				//logout every acc
				for (var i in users) {
					users[i].prepareKill();
					users[i].logOff();
					// users[i] = null;
					delete users[i];
				}
			} else {
				//logout acc
				if (!users[acc]) {
					throw Error(bot.prepareNameForOutput(acc)+" currently isn't logged in");
				}
				users[acc].prepareKill();
				users[acc].logOff();
				delete users[acc];
			}
		} catch(err) {
			op("An error occured: "+err);
		}
		if (callback) {
			return callback();
		} else {
			return true;
		}
	}
	if (cmd[0] == "online") {
		var user = bot.aliasToAcc(cmd[1]);
		if (via === "steam" && !settings["online_via_chat"]) {
			op("Switching to online mode via steam chat is disabled");
			if (callback) {
				return callback();
			} else {
				return true;
			}
		}
		try {
			if (!user || user == "all" || user == "*") {
				for (var i in users) {
					users[i].isOnline = true;
					updateOnlineStatus(i);
				}
			} else {
				if (!users[user]) {
					throw Error(bot.prepareNameForOutput(user)+" currently isn't logged in");
				}
				users[user].isOnline = true;
				updateOnlineStatus(user);
			}
		} catch(err) {
			op("An error occured: "+err);
		}
		if (callback) {
			return callback();
		} else {
			return true;
		}
	}
	if (cmd[0] == "offline") {
		var user = bot.aliasToAcc(cmd[1]);
		if (via === "steam" && !settings["offline_via_chat"]) {
			op("Switching to offline mode via steam chat is disabled");
			if (callback) {
				return callback();
			} else {
				return true;
			}
		}
		try {
			if (!user || user == "all" || user == "*") {
				for (var i in users) {
					users[i].isOnline = false;
					updateOnlineStatus(i);
				}
			} else {
				if (!users[user]) {
					throw Error(bot.prepareNameForOutput(user)+" currently isn't logged in");
				}
				users[user].isOnline = false;
				updateOnlineStatus(user);
			}
		} catch(err) {
			op("An error occured: "+err);
		}
		if (callback) {
			return callback();
		} else {
			return true;
		}
	}
	if (cmd[0] == "accounts") {
		for (var i in users) {
			if (bot.getSetting("debug_replacename")) {
				op(bot.prepareNameForOutput(i));
			} else {
				op(i);
			}
		}
		if (callback) {
			return callback();
		} else {
			return;
		}
	}
	if (cmd[0] == "uimode") {
		var m = 3;
		if (m === 1) {
			var acc = bot.aliasToAcc(cmd[1]);
			var uim = cmd[2];
			if (!acc || acc == "*" || acc == "all") {
				acc = null;
			}
			if (!uim && acc && !users[acc]) {
				uim = acc;
				acc = null;
			}
			var modematch =
			{
			// [
				[SteamUser.EClientUIMode.None]:
				[
					"none",
					"off",
					"desktop",
					"client",
					"0"
				],
				[SteamUser.EClientUIMode.BigPicture]:
				[
					"bigpicture",
					"big_picture",
					"bp",
					"1"
				],
				[SteamUser.EClientUIMode.Mobile]:
				[
					"mobile",
					"phone",
					"smartphone",
					"2"
				],
				[SteamUser.EClientUIMode.Web]:
				[
					"web",
					"www",
					"browser",
					"3"
				]
			// ];
			};
			// for (var i in modematch) {
				// modematch[parseInt(i)] = modematch[i];
				// delete modematch[i];
			// }
			var ms = 
			{
			// [
				[SteamUser.EClientUIMode.None]:
				"Desktop",
				[SteamUser.EClientUIMode.BigPicture]:
				"Big Picture",
				[SteamUser.EClientUIMode.Mobile]:
				"Mobile",
				[SteamUser.EClientUIMode.Web]:
				"Web"
			// ];
			};
			var m;
			var f = false;
			// console.log(modematch);
			for (var i in modematch) {
				// console.log("match", i, modematch[i], uim);
				if (modematch[i].includes(uim || false)) {
					// console.log("found", i, uim);
					f = true;
					m = i;
					break;
				}
			}
			if (!f) {
				// console.log("no match in array, setting to none");
				m = SteamUser.EClientUIMode.None;
			}
			var mn = parseInt(m);
			// console.log("setting to", m, typeof m);
			if (!acc) {
				for (var i in users) {
					users[i].setUIMode(mn);
					users[i].lastUIMode = mn;
					op("Set ui mode for "+i+" to "+ms[m]);
				}
			} else {
				try {
					if (!users[acc]) {
						throw Error(acc+" currently isn't logged in");
					}
					users[acc].setUIMode(mn);
					users[acc].lastUIMode = mn;
					op("Set ui mode for "+acc+" to "+ms[m]);
				} catch(err) {
					op("An error occured: "+err);
				}
			}
			if (callback) {
				return callback();
			} else {
				return true;
			}
		} else if(m === 2) {
			var acc = bot.aliasToAcc(cmd[1]);
			var uim = cmd[2];
			if (!acc || acc == "*" || acc == "all") {
				acc = null;
			}
			if (!uim && acc && !users[acc]) {
				uim = acc;
				acc = null;
			}
			var modematch = {
				0: [
					"none",
					"off",
					"desktop",
					"client",
					"0"
				],
				4: [
					"gold",
					"golden",
					"yellow"
				],
				256: [
					"web",
					"www",
					"browser",
					"3",
					"256"
				],
				512: [
					"mobile",
					"phone",
					"smartphone",
					"2",
					"512"
				],
				1024: [
					"bp",
					"big_picture",
					"bigpicture",
					"1",
					"1024"
				],
				2048: [
					"vr",
					"virtual_reality",
					"virtualreality",
					"vive",
					"htc_vive",
					"htcvive"
				]
			};
			var input = [];
			var mods = ["+", "-", "="];
			var lastMod = "=";
			var lastI = -1;
			if (mods.includes(uim.substr(0, 1))) {
				lastMod = uim.substr(0, 1);
				uim = uim.substr(1);
				// lastI = 0;
			}
			for (var i = 0; true; i++) {
				if (i >= uim.length || mods.includes(uim.substr(i, 1))) {
					var modestr = uim.substr(lastI + 1, i - lastI - 1);
					input.push({mod: lastMod, modestr: modestr});
					if (i >= uim.length) {
						break;
					}
				}
				if (mods.includes(uim.substr(i, 1))) {
					lastI = i;
					lastMod = uim.substr(i, 1);
				}
			}
			// for (var i in input) {
				// op(input[i]["mod"]+" "+input[i]["modestr"]);
			// }
			var firstI = 0;
			for (var i = 0; i < input.length; i++) {
				if (input[i]["mod"] === "=") {
					firstI = i;
				}
			}
			var appaccs = {};
			if (acc) {
				try {
					if (!users[acc]) {
						throw Error(acc+" currently isn't logged in");
					}
					appaccs[acc] = users[acc];
				} catch(err) {
					op("An error occured: "+err);
					if (callback) {
						return callback();
					} else {
						return;
					}
				}
			} else {
				appaccs = users;
			}
			for (var u in appaccs) {
				var user = appaccs[u];
				var m = user.personaStateFlags || 0;
				for (var i = firstI; i < input.length; i++) {
					var num = 0;
					var match = false;
					if (parseInt(input[i]["modestr"]) && false) {
						num = parseInt(input[i]["modestr"]);
						match = true;
					} else {
						for (var i2 in modematch) {
							if (modematch[i2].includes(input[i]["modestr"])) {
								match = true;
								num = i2;
							}
						}
					}
					if (input[i]["mod"] === "=" && match) {
						m = num;
					} else if(input[i]["mod"] === "+" && match) {
						m = m | num;
					} else if(input[i]["mod"] === "-" && match) {
						m = (m | num) - num;
					} else {
						m = m;
					}
				}
				user.personaStateFlags = m;
				updateOnlineStatus(user);
			}
			if (callback) {
				return callback();
			} else {
				return;
			}
		} else if (m === 3) {
			var acc = bot.aliasToAcc(cmd[1]);
			var uim = cmd[2];
			if (!acc || acc == "*" || acc == "all") {
				acc = null;
			}
			if (!uim && acc && !users[acc]) {
				uim = acc;
				acc = null;
			}
			if (!uim) {
				uim = "";
			}
			var modematch = {
				0: [
					"none",
					"off",
					"desktop",
					"client",
					"0"
				],
				"uimode:3": [
					"web",
					"www",
					"browser",
					"3",
					"256"
				],
				"uimode:2": [
					"mobile",
					"phone",
					"smartphone",
					"2",
					"512"
				],
				1024: [
					"bp",
					"big_picture",
					"bigpicture",
					"1",
					"1024"
				],
				2048: [
					"vr",
					"virtual_reality",
					"virtualreality",
					"vive",
					"htc_vive",
					"htcvive"
				]
			};
			// modematch["uimode:0"] = modematch[0];
			var input = [];
			var mods = ["+", "-", "="];
			var lastMod = "=";
			var lastI = -1;
			if (mods.includes(uim.substr(0, 1))) {
				lastMod = uim.substr(0, 1);
				uim = uim.substr(1);
				// lastI = 0;
			}
			for (var i = 0; true; i++) {
				if (uim.length <= 0) {
					break;
				}
				if (i >= uim.length || mods.includes(uim.substr(i, 1))) {
					var modestr = uim.substr(lastI + 1, i - lastI - 1);
					input.push({mod: lastMod, modestr: modestr});
					if (i >= uim.length) {
						break;
					}
				}
				if (mods.includes(uim.substr(i, 1))) {
					lastI = i;
					lastMod = uim.substr(i, 1);
				}
			}
			// for (var i in input) {
				// op(input[i]["mod"]+" "+input[i]["modestr"]);
			// }
			var firstI = 0;
			for (var i = 0; i < input.length; i++) {
				if (input[i]["mod"] === "=") {
					firstI = i;
				}
			}
			var appaccs = {};
			if (acc) {
				try {
					if (!users[acc]) {
						throw Error(acc+" currently isn't logged in");
					}
					appaccs[acc] = users[acc];
				} catch(err) {
					op("An error occured: "+err);
					if (callback) {
						return callback();
					} else {
						return;
					}
				}
			} else {
				appaccs = users;
			}
			for (var u in appaccs) {
				var user = appaccs[u];
				var m = user.personaStateFlags || 0;
				for (var i = firstI; i < input.length; i++) {
					var num = 0;
					var match = false;
					var uimode = false;
					if (parseInt(input[i]["modestr"]) && false) {
						num = parseInt(input[i]["modestr"]);
						match = true;
					} else {
						for (var i2 in modematch) {
							if (modematch[i2].includes(input[i]["modestr"])) {
								match = true;
								num = i2;
							}
						}
					}
					if ((typeof num) == "string" && num.substr(0, "uimode:".length) == "uimode:") {
						uimode = parseInt(num.substr("uimode:".length));
					}
					if (input[i]["mod"] === "=" && match) {
						if (parseInt(num) == 0) {
							m = 0;
							user.lastUIMode = 0;
							user.setUIMode(0);
						} else if (parseInt(num)) {
							m = num;
							user.lastUIMode = 0;
							user.setUIMode(0);
							//set ui mode to null
						} else if (uimode) {
							m = 0;
							//set ui mode if possible
							user.lastUIMode = parseInt(uimode) || 0;
							user.setUIMode(user.lastUIMode);
						}
					} else if(input[i]["mod"] === "+" && match) {
						if (parseInt(num)) {
							// m = m | num;
							m = num;
						} else if (uimode) {
							//set ui mode
							user.lastUIMode = parseInt(uimode) || 0;
							user.setUIMode(user.lastUIMode);
						}
					} else if(input[i]["mod"] === "-" && match) {
						if (parseInt(num)) {
							m = (m | num) - num;
						} else if (uimode) {
							//remove if same
							if (user.lastUIMode === parseInt(uimode)) {
								user.lastUIMode = 0;
								user.setUIMode(0);
							}
						}
					} else {
						m = m;
					}
				}
				user.personaStateFlags = m;
				updateOnlineStatus(user);
			}
			if (callback) {
				return callback();
			} else {
				return;
			}
		}
	}
	if (cmd[0] == "name") {
		var acc = bot.aliasToAcc(cmd[1]);
		var name = cmd[2];
		if (!acc || acc == "*" || acc == "all") {
			acc = null;
		}
		if (!name && acc && !users[acc]) {
			name = acc;
			acc = null;
		}
		if (!name) {
			op("No name specified");
			if (callback) {
				return callback();
			} else {
				return true;
			}
		}
		if (!acc) {
			for (var i in users) {
				users[i].setPersona(SteamUser.EPersonaState[(users[i].isOnline ? "Online" : "Offline")], name);
				op("Set name for "+bot.prepareNameForOutput(i)+" to '"+name+"'");
			}
		} else {
			try {
				if (!users[acc]) {
					throw Error(bot.prepareNameForOutput(acc)+" currently isn't logged in");
				}
				users[acc].setPersona(SteamUser.EPersonaState[(users[acc].isOnline ? "Online" : "Offline")], name);
				op("Set name for "+bot.prepareNameForOutput(acc)+" to '"+name+"'");
			} catch(err) {
				op("An error occured: "+err);
			}
		}
		if (callback) {
			return callback();
		} else {
			return true;
		}
	}
	if (cmd[0] == "exit") {
		if (via === "steam" && !settings["exit_via_chat"]) {
			op("Exiting via steam chat is disabled");
			if (callback) {
				return callback();
			} else {
				return true;
			}
		}
		//kill script
		process.exit();
		return true;
	}
	if (cmd[0] == "add") {
		if (via === "steam") {
			op("Adding accounts via steam chat is not possible");
			if (callback) {
				return callback();
			} else {
				return true;
			}
		}
		//add user to idleaccs.json
		op("Command 'add' currently isn't supported");
		if (callback) {
			return callback();
		} else {
			return true;
		}
	}
	if (cmd[0] == "idle") {
		var user = bot.aliasToAcc(cmd[1]);
		if (!user || user == "all" || user == "*") {
			user = null;
		}
		var g = cmd[2];
		if (!g) {
			g = [];
		}
		var re = /^([1-9][0-9]*)(,([1-9][0-9]*))*$/;
		if ((typeof g) == "string" && g.match(re)) {
			try {
				g = JSON.parse("["+g+"]");
			} catch(err) {
				g = [];
			}
		}
		var games = gamesVarToArray(g);
		try {
			if (!user || settings["enableAdvancedAccountSelection"]) {
				var u = {};
				if (settings["enableAdvancedAccountSelection"]) {
					var gAccs = getAccs(user, via, extra);
					for (var i = 0; i < gAccs.length; i++) {
						u[gAccs[i]] = users[gAccs[i]];
					}
				} else {
					u = users;
				}
				var c = 0;
				for (var i in u) {
					if (!u.hasOwnProperty(i)) {
						continue;
					}
					c++;
					u[i].curIdling = games;
					idle(u[i], u[i].curIdling);
					var g2 = processGamesArray(games, u[i], true);
					var len = (g2 instanceof Array ? g2.length : 1);
					if (games.length > 0 && games[0] === ":cards") {
						len = "cards";
					}
					op(bot.prepareNameForOutput(i)+" is now idling "+(len === "cards" ? "cards" : len+" game"+(len == 1 ? "" : "s")));
				}
				if (c === 0) {
					op("No account found matching your criteria");
				}
			} else {
				if (!users[user]) {
					throw Error(bot.prepareNameForOutput(user)+" currently isn't logged in");
				}
				users[user].curIdling = games;
				idle(users[user], users[user].curIdling);
				var g2 = processGamesArray(games, users[user]);
				var len = (g2 instanceof Array ? g2.length : 1);
				if (games.length > 0 && games[0] === ":cards") {
					len = "cards";
				}
				op(bot.prepareNameForOutput(user)+" is now idling "+(len === "cards" ? "cards" : len+" game"+(len == 1 ? "" : "s")));
			}
		} catch(err) {
			op("An error occured: "+err);
		}
		if (callback) {
			return callback();
		} else {
			return true;
		}
	}
	if (cmd[0] == "w2p") {
		var acc = cmd[1];
		var accs = [];
		if (!acc) {
			if (via == "steam") {
				accs = getAccs("me", via, extra);
			} else {
				accs = getAccs("*", via, extra);
			}
		} else {
			accs = getAccs(acc, via, extra);
		}
		var u = bot.accsToUsers(accs);
		for (var i = 0; i < u.length; i++) {
			var user = u[i];
			user.idleTimeout(user.getOpt("w2p_idledelay"));
			op(bot.prepareNameForOutput(user.name)+" stopped idling for "+(user.getOpt("w2p_idledelay")/1000)+"s");
		}
		if (callback) {
			return callback();
		} else {
			return true;
		}
	}
	if (cmd[0] == "addfriend") {
		var frid = cmd[2];
		var acc = bot.aliasToAcc(cmd[1]);
		if (!frid) {
			frid = acc;
			acc = "*";
		}
		if (!acc || acc == "*" || acc == "all") {
			acc = null;
		}
		if (!frid) {
			op("No friend id specified");
		}
		try {
			if (!acc) {
				var uar = [];
				for (var i in users) {
					uar.push(users[i]);
				}
				var f = function(index) {
					if (index >= uar.length) {
						/* //comment to prevent double prompt
						if (callback) {
							return callback();
						} else {
							return;
						} //*/
						return;
					}
					var cb = function(){f(index + 1);};
					var user = uar[index];
					user.addFriend(frid, function(err, name) {
						if (err) {
							op("An error occured: "+err);
							cb();
							return;
						}
						op("Successfully added "+name+" ["+frid+"] with account "+bot.prepareNameForOutput(user.name));
						cb();
					});
				};
				f(0);
				return;
			} else {
				var user = users[acc];
				if (!user) {
					throw Error(bot.prepareNameForOutput(acc)+" currently isn't logged in");
				}
				user.addFriend(frid, function(err, name) {
					if (err) {
						// throw Error(err);
						op("An error occured: "+err);
						return;
					}
					op("Successfully added "+name+" ["+frid+"]");
					/* //commenting out to fix double input
					if (callback) {
						return callback();
					} else {
						return;
					} //*/
				});
			}
		} catch(err) {
			op("An error occured: "+err);
		}
		if (callback) {
			return callback();
		} else {
			return true;
		}
	}
	if (cmd[0] == "msg") {
		var msg = cmd[3];
		var frid = cmd[2];
		var acc = bot.aliasToAcc(cmd[1]);
		if (!msg && frid) {
			msg = frid;
			frid = acc;
			acc = "*";
		}
		if (!acc || acc == "*" || acc == "all") {
			acc = null;
		}
		if (!msg) {
			op("No message specified");
		}
		if (!frid) {
			op("No friend id specified");
		}
		try {
			if (!acc) {
				for (var i in users) {
					try {
						users[i].chatMessage(frid, msg);
						op("Message to "+frid+" was sent by "+bot.prepareNameForOutput(i));
					} catch(err) {
						op("An error occured: "+err);
					}
				}
			} else {
				if (!users[acc]) {
					throw Error(bot.prepareNameForOutput(acc)+" currently isn't logged in");
				}
				users[acc].chatMessage(frid, msg);
				op("Message to "+frid+" was sent by "+bot.prepareNameForOutput(acc));
			}
		} catch(err) {
			op("An error occured: "+err);
		}
		if (callback) {
			return callback();
		} else {
			return true;
		}
	}
	if (cmd[0] == "wallet") {
		var acc = bot.aliasToAcc(cmd[1]);
		if (!acc) {
			var total = {};
			for (var i in users) {
				var user = users[i];
				var wal = user.wallet;
				if (wal) {
					if (!wal.hasWallet) {
						op(bot.prepareNameForOutput(i)+" doesn't have a wallet");
					} else {
						var bal = wal.balance;
						var cur = wal.currency;
						if (!total[cur]) {
							total[cur] = 0;
						}
						total[cur] += bal;
						op(bot.prepareNameForOutput(i)+" has a wallet balance of "+formatCurrency(bal, cur));
					}
				} else {
					op("No wallet found for "+bot.prepareNameForOutput(i));
				}
			}
			op("Total:");
			for (var cur in total) {
				var bal = total[cur];
				op("\t"+formatCurrency(bal, cur));
			}
		} else {
			try {
				if (!users[acc]) {
					throw Error(bot.prepareNameForOutput(acc)+" currently isn't logged in");
				}
				var user = users[acc];
				var wal = user.wallet;
				if (wal) {
					if (!wal.hasWallet) {
						op(bot.prepareNameForOutput(acc)+" doesn't have a wallet");
					} else {
						var bal = wal.balance;
						var cur = wal.currency;
						op(bot.prepareNameForOutput(acc)+" has a wallet balance of "+formatCurrency(bal, cur));
					}
				} else {
					op("No wallet found for "+bot.prepareNameForOutput(i));
				}
			} catch(err) {
				op("An error occured: "+err);
			}
		}
		if (callback) {
			return callback();
		} else {
			return true;
		}
	}
	if (cmd[0] == "redirect") {
		//redirectTo
		var acc = bot.aliasToAcc(cmd[1]);
		var to = bot.dictOrAliasToAcc(cmd[2]);
		if (!acc || acc == "*" || acc == "all") {
			acc = null;
		}
		var red2 = to;
		if (red2 && users[red2]) {
			red2 = users[red2].steamID;
		}
		if (!acc) {
			for (var i in users) {
				var user = users[i];
				user.redirectTo = red2;
				if (i === to) {
					user.redirectTo = null;
				}
				if (red2) {
					op("Activated redirection for "+bot.prepareNameForOutput(i));
				} else {
					op("Deactivated redirection for "+bot.prepareNameForOutput(i));
				}
			}
		} else {
			try {
				if (!users[acc]) {
					throw Error(bot.prepareNameForOutput(acc)+" currently isn't logged in");
				}
				var user = users[acc];
				user.redirectTo = red2;
				if (acc === to) {
					user.redirectTo = null;
				}
				if (red2) {
					op("Activated redirection for "+bot.prepareNameForOutput(acc));
				} else {
					op("Deactivated redirection for "+bot.prepareNameForOutput(acc));
				}
			} catch(err) {
				op("An error occured: "+err);
			}
		}
		if (callback) {
			return callback();
		} else {
			return true;
		}
	}
	if (cmd[0] == "newfriends") {
		var cmd1 = cmd[1];
		var acc = bot.aliasToAcc(cmd[2]);
		if (cmd1 == "clear") {
			if (!acc) {
				aFriendRequests = {};
				op("Cleared the friend request history for all accounts");
				updateFriendFile();
			} else {
				try {
					if (!aFriendRequests[acc]) {
						throw Error("No friend requests were found for "+bot.prepareNameForOutput(acc));
					}
					delete aFriendRequests[acc];
					updateFriendFile();
					op("Cleared the friend request history for "+bot.prepareNameForOutput(acc));
				} catch(err) {
					op("An error occured: "+err);
				}
			}
			if (callback) {
				return callback();
			} else {
				return;
			}
		}
		if (true) {//list
			if (!acc) {
				if (cmd1 != "list") {
					acc = bot.aliasToAcc(cmd1);
				}
			}
			if (!acc || acc == "*" || acc == "all") {
				acc = null;
			}
			if (!acc) {
				var ex = false;
				for (var i in aFriendRequests) {
					ex = true;
					checkNewFriends(i, op);
				}
				if (!ex) {
					op("No friend requests found");
				}
			} else {
				checkNewFriends(acc, op);
			}
			if (callback) {
				return callback();
			} else {
				return true;
			}
		}
	}
	if (cmd[0] == "cardstatus") {
		var acc = bot.aliasToAcc(cmd[1]);
		if (!acc || acc == "*" || acc == "all") {
			acc = null;
		}
		var appaccs = {};
		try {
			if (!acc) {
				appaccs = users;
			} else {
				if (!users[acc]) {
					throw Error(bot.prepareNameForOutput(acc)+" currently isn't logged in");
				}
				appaccs[acc] = users[acc];
			}
			for (var i in appaccs) {
				var cardGames = appaccs[i].allCardApps;
				// op(i+": "+JSON.stringify(cardGames));
				var hasCardGames = true;
				if (!cardGames || cardGames.length <= 0) {
					hasCardGames = false;
				}
				var totalCards = 0;
				var totalGames = 0;
				for (var i2 in cardGames) {
					var game = cardGames[i2];
					var drops = game["dropsLeft"];
					if (drops && drops > 0) {
						totalCards += drops;
						totalGames++;
					}
				}
				if (hasCardGames) {
					op(bot.prepareNameForOutput(i)+" has "+totalCards+" card drop"+(totalCards == 1 ? "" : "s")+" remaining in "+totalGames+" game"+(totalGames == 1 ? "" : "s"));
				} else {
					op(bot.prepareNameForOutput(i)+" has no card drops remaining or didn't idle cards before");
				}
			}
		} catch(err) {
			op("An error occured: "+err);
		}
		if (callback) {
			return callback();
		} else {
			return;
		}
	}
	if (cmd[0] == "ext") {
		var ext = cmd[1];
		try {
			if (!ext) {
				throw Error("No extension provided");
			}
			bot.loadExtension(ext, op);
		} catch(err) {
			op("An error occured: "+err);
		}
		if (callback) {
			return callback();
		} else {
			return;
		}
	}
	if (cmd[0] == "state") {
		var states = {
			"gold": 4,
			"golden": 4,
			"all": 1 + 2 + 4 + 8 + 16 + 32 + 64 + 128 + 256 + 512 + 1024 + 2048,
			"web": 256,
			"phone": 512,
			"big_picture": 1024,
			"vr": 2048,
			"memz": 3844
		};
		var acc = bot.aliasToAcc(cmd[1]);
		var state = cmd[2] || 0;
		if (!acc || acc == "*" || acc == "all") {
			acc = null;
		}
		if (states[state]) {
			state = states[state];
		}
		if (!acc) {
			for (var i in users) {
				users[i].personaStateFlags = state;
				updateOnlineStatus(users[i]);
				op("Set persona state flags for "+bot.prepareNameForOutput(i)+" to "+state);
			}
		} else {
			try {
				if (!users[acc]) {
					throw Error(bot.prepareNameForOutput(acc)+" currently isn't logged in");
				}
				users[acc].personaStateFlags = state;
				updateOnlineStatus(users[acc]);
				op("Set persona state flags for "+bot.prepareNameForOutput(acc)+" to "+state);
			} catch(err) {
				op("An error occured: "+err);
			}
		}
		if (callback) {
			return callback();
		} else {
			return;
		}
	}
	if (cmd[0] == "badgepagelength") {
		var acc = bot.aliasToAcc(cmd[1]);
		try {
			throw Error("Command disabled due to breaking the card idling. Edit the script to reenable this command");
			if (!acc) {
				throw Error("No account supplied. This command may not be applied to all accounts at once");
			}
			if (!users[acc]) {
				throw Error(bot.prepareNameForOutput(acc)+" currently isn't logged in");
			}
			var bp = [1, 2, 1337];
			var bpi = 0;
			var f = function() {
				if (bpi >= bp.length) {
					return;
				}
				var cbp = bp[bpi++];
				users[acc].cardPage = cbp;
				cardCheck(users[acc], f, true);
			}
			f();
		} catch(err) {
			op("An error occured: "+err);
		}
		if (callback) {
			return callback();
		} else {
			return;
		}
	}
	if (cmd[0] == "names") {
		try {
			var acc = bot.aliasToAcc(cmd[1]);
			if (!acc) {
				throw Error("No acc supplied");
			}
			if (!users[acc]) {
				throw Error(bot.prepareNameForOutput(acc)+" currently isn't logged in");
			}
			var namesj = cmd[2];
			var names;
			if ((["stop", "off"]).indexOf(namesj.toLowerCase()) > -1) {
				names = [];
			} else {
				names = JSON.parse(namesj);
			}
			var delay;
			if (names.length > 0) {
				delay = cmd[3];
				delay = parseFloat(delay);
				if (isNaN(delay)) {
					throw Error("Invalid delay");
				}
				delay = delay * 1000; //ms
			}
			var iter = Infinity;
			if (names.length > 0 && cmd.length > 4) {
				iter = cmd[4];
				iter = parseFloat(iter);
				if (isNaN(iter) || iter < 1) {
					iter = Infinity;
				}
			}
			var user = users[acc];
			if (user.nameChangeInterval) {
				clearInterval(user.nameChangeInterval);
				user.nameChangeInterval = 0;
			}
			if (names.length > 0) {
				var nextI = 0;
				var iters = 0;
				var f = (function() {
					var name = names[nextI++];
					user.setPersona(SteamUser.EPersonaState[(user.isOnline ? "Online" : "Offline")], name);
					if (nextI >= names.length) {
						nextI = 0;
						iters++;
						if (iters >= iter) {
							clearInterval(user.nameChangeInterval);
							user.nameChangeInterval = 0;
							var defName = user.getAccOpt("name_default");
							var ext = "";
							if (typeof defName == "string") {
								ext = ", changing back to default name after next interval";
							}
							//TODO: use default name setting | DONE?
							op("Automatically stopped changing names on "+bot.prepareNameForOutput(acc)+ext);
							if (typeof defName == "string") {
								var f2 = (function() {
									user.setPersona(SteamUser.EPersonaState[(user.isOnline ? "Online" : "Offline")], defName);
									clearInterval(user.nameChangeInterval);
									user.nameChangeInterval = 0;
								});
								user.nameChangeInterval = setInterval(f2, delay);
							}
							return;
						}
					}
				});
				user.nameChangeInterval = setInterval(f, delay);
				if (bot.getSetting("namechange_instant")) {
					f();
				}
				op("Started changing names on "+bot.prepareNameForOutput(acc));
			} else {
				//
				op("Stopped changing names on "+bot.prepareNameForOutput(acc));
			}
		} catch(err) {
			op("An error occured: "+err);
		}
		if (callback) {
			return callback();
		} else {
			return;
		}
	}
	if (cmd[0] == "opt") {
		var acc = bot.aliasToAcc(cmd[1]);
		if (!acc || acc == "*" || acc == "all") {
			acc = null;
		}
		var appaccs = {};
		try {
			if (!acc) {
				appaccs = users;
			} else {
				if (!users[acc]) {
					throw Error(bot.prepareNameForOutput(acc)+" currently isn't logged in");
				}
				appaccs[acc] = users[acc];
			}
			for (var i in appaccs) {
				var o = appaccs[i].opts;
				var os = JSON.stringify(o);
				op(i+": "+os);
			}
		} catch(err) {
			op("An error occured: "+err);
		}
		if (callback) {
			return callback();
		} else {
			return;
		}
	}
	if (cmd[0] == "optcomb") {
		var acc = bot.aliasToAcc(cmd[1]);
		if (!acc || acc == "*" || acc == "all") {
			acc = null;
		}
		var appaccs = {};
		try {
			if (!acc) {
				appaccs = users;
			} else {
				if (!users[acc]) {
					throw Error(bot.prepareNameForOutput(acc)+" currently isn't logged in");
				}
				// appaccs.push(users[acc]);
				appaccs[acc] = users[acc];
			}
			for (var i in appaccs) {
				var oc = appaccs[i].getOptComb("games_blacklist");
				var ocs = JSON.stringify(oc);
				op(bot.prepareNameForOutput(i)+": "+ocs);
			}
		} catch(err) {
			op("An error occured: "+err);
		}
	}
	if (cmd[0] == "testaccs") {
		var str = bot.aliasToAcc(cmd[1]); //TODO: implement alias in getAccs, remove it here
		var r = getAccs(str);
		op(JSON.stringify(r));
		if (callback) {
			return callback();
		} else {
			return;
		}
	}
	if (cmd[0] == "curidling") {
		var acc = bot.aliasToAcc(cmd[1]);
		try {
			if (!acc) {
				throw Error("No account supplied. This command may not be applied to all accounts at once");
			}
			if (!users[acc]) {
				throw Error(bot.prepareNameForOutput(acc)+" currently isn't logged in");
			}
			var ci = users[acc].curIdling;
			var cis = JSON.stringify(ci);
			op(bot.prepareNameForOutput(acc)+": "+cis);
		} catch(err) {
			op("An error occured: "+err);
		}
		if (callback) {
			return callback();
		} else {
			return;
		}
	}
	if (cmd[0] == "cards") {
		var acc = bot.aliasToAcc(cmd[1]);
		try {
			if (!acc) {
				throw Error("No account supplied. This command may not be applied to all accounts at once");
			}
			if (!users[acc]) {
				throw Error(bot.prepareNameForOutput(acc)+" currently isn't logged in");
			}
			checkCardsCmd(users[acc], op);
		} catch(err) {
			op("An error occured: "+err);
		}
		if (callback) {
			return callback();
		} else {
			return;
		}
	}
	if (cmd[0] == "afk") {
		var acc = bot.aliasToAcc(cmd[1]);
		var msg = cmd[2] || settings["afk_defaultmsg"];
		if (!acc || acc == "*" || acc == "all") {
			acc = null;
		}
		var disable = (["disable", "none", "noafk", "off"]).includes(msg);
		var def = (["on", "default", "def"]).includes(msg);
		var defCheck = {};
		if (def) {
			// msg = settings["afk_defaultmsg"];
			msg = defCheck;
		}
		if ((typeof msg) !== "string" && !(msg instanceof Array) && msg !== defCheck) {
			op("There was an error setting the afk message. The message doesn't seem to be a string or array");
			msg = "I'm afk";
		}
		if (!acc) {
			for (var i in users) {
				users[i].afkMsg = (disable ? null : (msg === defCheck ? users[i].getOpt("afk_defaultmsg") : msg));
				if (disable) {
					op("Disabled afk message for "+bot.prepareNameForOutput(i));
				} else {
					op("Set afk message for "+bot.prepareNameForOutput(i));
				}
			}
		} else {
			try {
				if (!users[acc]) {
					throw Error(bot.prepareNameForOutput(acc)+" currently isn't logged in");
				}
				users[acc].afkMsg = (disable ? null : (msg === defCheck ? users[acc].getOpt("afk_defaultmsg") : msg));
				if (disable) {
					op("Disabled afk message for "+bot.prepareNameForOutput(acc));
				} else {
					op("Set afk message for "+bot.prepareNameForOutput(acc));
				}
			} catch(err) {
				op("An error occured: "+err);
			}
		}
		if (callback) {
			return callback();
		} else {
			return true;
		}
	}
	if ((["admin"]).includes(cmd[0])) {
		op("\n ================== > All Admin Commands < ================= \n Here is a list with all Admin commands. | Info > - Use * to select all Accs \n \n ~~~~~~~~~~~~~~~~~~ > Bot Control features < ~~~~~~~~~~~~~~~~~ \n 1. !idle <user or *> <ID/gp or \"your message\">: to start idling games. \n 2. !idle <user or *>: stop to stop idling. \n 3. !addfriend <user or *> <steamid64>: to add a friend with all or one Acc. \n 4. !newfriends <acc or *>: to see all new automatically accepted friends. \n 5. !newfriends clear <user or *>: to clean the list. \n 6. !redirect <user or *> <steam64id>: to redirect all msgs to an Acc. \n 7. !msg <user or *> <steam64id> <msg>: to send a msg to other users. \n 8. !wallet <user or *>: to see how much money you have. \n 9. !afk <user or *> <on or off>: to automatically send an afk msg. \n 10. !uimode [<user or *>] [<phone, web, big_picture (bp) or desktop>]: to change the ui mode. \n 11. !name [<user or *>] <name>: to change the name. \n 12. !help: to see all public commands. \n ===================================================");
		if (callback) {
			return callback();
		} else {
			return true;
		}
	}
	var helpv = 2;
	var helpcmds = ["help", "ahelp"];
	if ((helpcmds).includes(cmd[0]) && helpv === 1) { //old help, replaced by new system
		op("add <user>: adds a user to the database [CURRENTLY NOT SUPPORTED]");
		op("");
		op("login <user>: login");
		op("");
		op("logout [<user>]: logout with specified user/all users");
		op("");
		op("idle [<user>] [<games>]: idle the specified games with the specified user");
		op("~<user> is the name of the account you want to idle on");
		op("no user, '*' and 'all' will result in all logged in users idling");
		op("~<games> is either a list of game ids (separated with ','),\na game preset or a custom game");
		op("");
		op("addfriend [<user>] <newfriend>: add <newfriend> to your friend list");
		if (callback) {
			return callback();
		} else {
			return true;
		}
	}
	if ((helpcmds).includes(cmd[0]) && helpv === 2) {
		
		if (callback) {
			return callback();
		} else {
			return true;
		}
	}
	if (cmd[0] == "alarms") {
		if (cmd[1] == "json" || true) {
			op(JSON.stringify(alarms));
		} else {
			op(alarms);
		}
		if (callback) {
			return callback();
		} else {
			return true;
		}
	}
	if (cmd[0] == "friends") {
		if (via == "steam") {
			op("Cannot list friends via steam");
			if (callback) {
				return callback();
			} else {
				return true;
			}
		}
		var acc = bot.aliasToAcc(cmd[1]);
		if (!acc || acc == "*" || acc == "all") {
			acc = null;
		}
		if (!acc) {
			for (var i in users) {
				checkFriends(users[i]);
			}
		} else {
			try {
				if (!users[acc]) {
					throw(bot.prepareNameForOutput(acc)+" currently isn't logged in");
				}
				checkFriends(users[acc]);
			} catch(err) {
				op("An error occured: "+err);
			}
		}
		if (callback) {
			return callback();
		} else {
			return true;
		}
	}
	var extCmdExec = false;
	var extCmds = bot.commands.getCommands();
	for (var i in extCmds) {
		if (!extCmds.hasOwnProperty(i)) {
			continue;
		}
		if (cmd[0] == i) {
			extCmdExec = true;
			if (typeof extCmds[i]["func"] == "function") {
				try {
					extCmds[i]["func"](cmd, op, via, extra);
				} catch(err) {
					op("Error while executing command, check console for details");
					console.log(err);
				}
			}
		}
	}
	if (extCmdExec) {
		if (callback) {
			return callback();
		} else {
			return true;
		}
	}
	// throw Error("Unhandled command");
	op("Error: Unhandled command\nEnter 'help' for a list of commands");
	if (callback) {
		callback();
	}
	return false;
}

function checkForPublicCommand(sid, msg, user, name, authed) {
	if (!settings["public_chat_bot"]) {
		return false;
	}
	if (msg.substr(0, 1) !== "!") {
		return false;
	}
	var cmd = parseCommand(msg.substr(1));
	// console.log(cmd[0]);
	if (cmd[0] === "8ball") {
		var poss = [
			"It is certain",
			"It is decidedly so",
			"Without a doubt",
			"Yes, definitely",
			"You may rely on it",
			"As I see it, yes",
			"Most likely",
			// "Outlook good",
			"Yes",
			"Signs point to yes",
			// "Reply hazy try again",
			"Ask again later",
			"Better not tell you now",
			"Cannot predict now",
			"Concentrate and ask again",
			"Don't count on it",
			"My reply is no",
			"My sources say no",
			// "Outlook not so good",
			"Very doubtful",
			"Pretty sure m8"
		];
		var i = Math.floor(Math.random() * poss.length);
		var msgb = poss[i];
		user.chatMessage(sid, "Magic 8ball says: "+msgb);
		return true;
	}
	if (cmd[0] === "alarm") {
		var time = cmd[1];
		if (!time) {
			user.chatMessage(sid, "No time entered");
			return false;
		}
		if (time == "list") {
			if (!alarms[name] || !alarms[name][sid.getSteamID64()] || alarms[name][sid.getSteamID64()].length <= 0) {
				user.chatMessage(sid, "No alarms were found");
			} else {
				for (var i in alarms[name][sid.getSteamID64()]) {
					if (!alarms[name][sid.getSteamID64()].hasOwnProperty(i)) {
						continue;
					}
					var obj = alarms[name][sid.getSteamID64()][i];
					var id = obj["id"];
					var tim = obj["time"];
					var desc = obj["desc"];
					var timd = new Date(tim);
					user.chatMessage(sid, "Alarm "+id+" at "+timd.toSteamDateString()+" "+timd.toSteamTimeString()+": "+desc);
				}
			}
			return true;
		}
		if (time == "rmv" || time == "remove") {
			var rid = cmd[2];
			if (!rid) {
				user.chatMessage(sid, "No alarm id supplied\nFor clearing all alarms, please use '!alarm clear'");
				return true;
			}
			if (!alarms[name] || !alarms[name][sid.getSteamID64()] || alarms[name][sid.getSteamID64()].length <= 0) {
				user.chatMessage(sid, "No alarms were found");
			} else {
				var c = false;
				while (true) {
					c = false;
					for (var i in alarms[name][sid.getSteamID64()]) {
						var obj = alarms[name][sid.getSteamID64()][i];
						var id = obj["id"];
						var tim = obj["time"];
						var desc = obj["desc"];
						if (id == rid) {
							var timd = new Date(tim);
							user.chatMessage(sid, "Alarm "+id+" at "+timd.toSteamDateString()+" "+timd.toSteamTimeString()+" with description '"+desc+"' was removed");
							alarms[name][sid.getSteamID64()].splice(i, 1);
							c = true;
							break;
						}
					}
					if (!c) {
						break;
					}
				}
			}
			return true;
		}
		if (time == "clr" || time == "clear") {
			if (!alarms[name] || !alarms[name][sid.getSteamID64()] || alarms[name][sid.getSteamID64()].length <= 0) {
				user.chatMessage(sid, "No alarms were found");
			} else {
				delete alarms[name][sid.getSteamID64()];
				user.chatMessage(sid, "Cleared all alarms");
			}
			return true;
		}
		var desc = cmd[2];
		if (!desc) {
			desc = "Alarm!";
		}
		var r = addAlarm(name, sid, time, desc);
		if (!r) {
			user.chatMessage(sid, "Error adding alarm");
		} else {
			var aDate = new Date(r["time"]);
			user.chatMessage(sid, "Your alarm ["+r["id"]+"] was set on " + aDate.toSteamDateString() + " " + aDate.toSteamTimeString());
		}
		return true;
	}
	if (cmd[0] === "authed") {
		user.chatMessage(sid, "You are "+(authed ? "" : "not ")+"authed");
		return true;
	}
	if (cmd[0] === "date") {
		user.chatMessage(sid, "Today is "+(new Date()).toSteamDateString());
		return true;
	}
	if (cmd[0] === "time") {
		var curDate = new Date();
		var tmsg = "It's currently "+(curDate).toSteamTimeString();
		var stm = false;
		var stmsgs = settings["time_special"];
		for (var i = 0; i < stmsgs.length; i++) {
			if (!(stmsgs[i] instanceof Object)) {
				continue;
			}
			var hs = stmsgs[i]["h"];
			var ms = stmsgs[i]["m"];
			var smsg = stmsgs[i]["msg"];
			if ((!hs || hs.includes(curDate.getHours())) && (!ms || ms.includes(curDate.getMinutes()))) {
				stm = true;
				tmsg = tmsg + " - " + smsg;
				// tmsg += " ["+i+"]";
				break;
			}
		}
		// tmsg += " - " + JSON.stringify(stmsgs);
		user.chatMessage(sid, tmsg);
		return true;
	}
	if (cmd[0] === "coin") {
		var poss = [
			"Head",
			"Tails"
		];
		var i = Math.floor(Math.random() * poss.length);
		var pi = poss[i];
		user.chatMessage(sid, "Coin Flip Result: "+pi);
		return true;
	}
	if (cmd[0] === "dice") {
		var max = parseInt(cmd[1]) || 6;
		if (max <= 0) {
			max = 6;
		}
		var i = Math.floor(Math.random() * max) + 1;
		user.chatMessage(sid, "Dice ["+max+"] - Throw Result: "+i);
		return true;
	}
	if (cmd[0] === "sid") {
		user.chatMessage(sid, "Your steam id: "+sid.getSteam2RenderedID(true));
		return true;
	}
	if (cmd[0] === "sid64") {
		user.chatMessage(sid, "Your steam id64: "+sid.getSteamID64());
		return true;
	}
	if (cmd[0] === "id") {
		var id = cmd[1];
		if (!id) {
			user.chatMessage(sid, "No ID provided");
			return true;
		}
		var re = /^(?:http(?:s)?:\/\/(?:www\.)?steamcommunity\.com\/id\/)?([a-zA-Z0-9\_\-]*)(?:\/)?$/;
		var rer = re.exec(id);
		if (!rer) {
			user.chatMessage(sid, "Custom URL could not be parsed");
			return true;
		}
		var vanu = rer[1];
		community.getSteamUser(vanu, function(err, cuser) {
			if (err) {
				user.chatMessage(sid, "An error occured: "+err);
				return 1;
			}
			var csid = cuser.steamID;
			user.chatMessage(sid, "SteamID64: "+csid.getSteamID64());
		});
		user.chatMessage(sid, "Requested data for "+id);
		return true;
	}
	if (cmd[0] === "credits") {
		var cr = [
			"",
			"----- CREDITS -----",
			"Code: PixL",
			"Idea: Nemo, PixL",
			"Admin & Public Help: Nemo"
		];
		var str = "";
		var single = true;
		if (single) {
			var c = 0;
			for (var i = 0; i < cr.length; i++) {
				if (c > 0) {
					str = str + "\n" + cr[i];
				} else {
					str = cr[i];
				}
				c = c + 1;
			}
			user.chatMessage(sid, str);
		} else {
			for (var i = 0; i < cr.length; i++) {
				user.chatMessage(sid, cr[i]);
			}
		}
		return true;
	}
	for (var i in settings["customcmds"]) {
		if (cmd[0] == i) {
			var m = settings["customcmds"][i];
			if (!(m instanceof Array)) {
				m = [m];
			}
			for (var i1 = 0; i1 < m.length; i1++) {
				user.chatMessage(sid, processCustomMessage(m[i1]));
			}
			return true;
		}
	}
	var extCmdExec = false;
	var extCmds = bot.commands["public"].getCommands();
	for (var i in extCmds) {
		if (!extCmds.hasOwnProperty(i)) {
			continue;
		}
		if (cmd[0] == i) {
			// var args = arguments.slice();
			var args = Array.prototype.slice.call(arguments);
			args.push(cmd);
			extCmdExec = true;
			if (typeof extCmds[i]["func"] == "function") {
				try {
					extCmds[i]["func"].apply(extCmds[i], args);
				} catch(err) {
					//register error?
					op("Error while executing command, check console for details");
					console.log(err);
				}
			}
		}
	}
	if (extCmdExec) {
		return true;
	}
}

bot.settingsUpdated = function settingsUpdated() { //TODO: provide old settings obj, reset tick interval ONLY IF DELAY CHANGED
	mcKayStatsSettings();
	
	// bot.events.emit(); //emit statsUpdated event
	bot.settings = settings || bot.settings;
}

function mcKayStatsSettings() {
	global._mckay_statistics_opt_out = bot.getSetting("mckay_anonstats_optout") ? true : false;
}

bot.settingsUpdated();

function startTickInterval() {
	var td = settings["tick_delay"];
	if (td <= 0) {
		return 0;
	}
	return setInterval(tick, (td || 10) * 1000); //TODO: upgrade to bot.getSetting
}

bot.loadLoginKeys();

// if (settings["tick_delay"] > 0) {
tickHandle = startTickInterval();
// }

// console.log(getDefaultReplaceObject(), getTimeReplaceObject(), combineObjects([getDefaultReplaceObject(), getTimeReplaceObject()]));
// combineObjects([getDefaultReplaceObject(), getTimeReplaceObject()]);

// var sids = "76561198135386775";
// var sid1 = new SteamID(sids);
// var sid2 = new SteamID(sids);
// console.log(sidMatch(sid1, sid2, true));
// process.exit();
// return;
var cl = console.log;
var ce = console.error;
const toLogFile = function toLogFile() {
	try {
		function dd(n) {
			if (Number(n) < 10) {
				return "0" + n;
			}
			return "" + n;
		}
		var l = true;
		// l = false;
		l = bot.getSetting("debug_logging");
		if (l) {
			var d = new Date();
			var ds = (d.getFullYear() + "-" + dd(d.getMonth() + 1) + "-" + dd(d.getDate())+" "+dd(d.getHours())+":"+dd(d.getMinutes())+":"+dd(d.getSeconds()));
			var str = Array.prototype.slice.apply(arguments).map(x => x.toString()).join(" ");
			fs.writeFileSync("./bot.log", (true ? ds + " | " : "") + str + "\n", {flag: "a"});
		}
	} catch(err) {
		cl("Error writing to log:", err);
	}
};
console.log = function log() {
	toLogFile.apply(null, arguments);
	cl.apply(console, arguments);
};
console.error = function error() {
	toLogFile.apply(null,(["ERROR:"]).concat(Array.prototype.slice.apply(arguments)));
	ce.apply(console, arguments);
};

bot.formatDate = function formatDate(date) {
	var d = date || new Date();
	function dd(n) {
		if (Number(n) < 10) {
			return "0" + n;
		}
		return "" + n;
	}
	var ds = (d.getFullYear() + "-" + dd(d.getMonth() + 1) + "-" + dd(d.getDate())+" "+dd(d.getHours())+":"+dd(d.getMinutes())+":"+dd(d.getSeconds()));
	return ds;
}

timing.stop();
if (process.argv.includes("timing")) {
	timing.printDetails();
}
for (var i = 0; i < process.argv.length; i++) {
	var sS = "debug:";
	if (process.argv[i].substr(0, sS.length) === sS) {
		var dbM = process.argv[i].substr(sS.length);
		var dbMAr = dbM.replace(/[\s\;]/, ",").split(",").filter(function(x) {return typeof x == "string" && x.length > 0;});
		bot.debugModes = dbMAr;
	}
}
if (process.argv.includes("writebadgepage")) {
	bot.writebadgepage = true;
}

process.on("uncaughtException", function(err) {
	var d = new Date();
	function dd(n) {
		if (Number(n) < 10) {
			return "0" + n;
		}
		return "" + n;
	}
	var errs = (true ? (d.getFullYear() + "-" + dd(d.getMonth() + 1) + "-" + dd(d.getDate())+" "+dd(d.getHours())+":"+dd(d.getMinutes())+":"+dd(d.getSeconds())+" | ") : "")+err.toString()+"\n";
	errs += err.stack || "";
	if (err.stack) {
		errs += "\n";
	}
	try {
		fs.writeFileSync("./error.log", errs, {flag: "a"});
		console.log("Uncaught exception. Check error.log for details.");
	} catch(err2) {
		console.log("Uncaught exception. Error while writing to error.log");
		console.log("Writing error:", err2);
		console.log("Uncaught exception:", err);
	}
	try {
		toLogFile.apply(null, [errs]);
	} catch(e) {
		
	}
	try {
		for (let i = 0; i < bot.allowedExceptions.length; i++) {
			let f = (typeof bot.allowedExceptions[i] == "function") ? bot.allowedExceptions : x => (x == bot.allowedExceptions[i]);
			if (f(err)) {
				console.log("Uncaught exception ignored via bot.allowedExceptions");
				return;
			}
		}
	} catch(err) {
		
	}
	console.log("Exiting...");
	process.exit(1);
});

// undefined(); //intentionally causing an exception

if (settings["autologin"]) {
	doAccId(0);
} else {
	openCMD();
}

String.prototype.replaceMultiple = function(findreplace) {
	return this.replace(new RegExp("(" + Object.keys(findreplace).map(function(i){return i.replace(/[.?*+^$[\]\\(){}|-]/g, "\\$&")}).join("|") + ")", "g"), function(s){ return findreplace[s]});
}
