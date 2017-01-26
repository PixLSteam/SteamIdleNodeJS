Date.prototype.myTimeString = Date.prototype.toTimeString;

var settings = {};

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
	op = console.log;
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
var fs = require("fs");timing.step("fs loaded");

prompt.start();

SteamUser.prototype.initialised = function initialised() {
	return this.loggedIn;
}

SteamUser.prototype.idlingCards = function idlingCards() {
	return this.curIdling && this.curIdling.indexOf(":cards") > -1;
}

SteamUser.prototype.getOpt = function getOpt(opt) {
	if (this.opts) {
		if (([null, undefined]).indexOf(this.opts[opt]) <= -1) {
			return this.opts[opt];
		}
	}
	if (([null, undefined]).indexOf(settings[opt]) <= -1) {
		return settings[opt];
	}
	return null;
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
}

SteamUser.prototype.getPersonaStateFlags = function() {
	if (this.personaStateFlags && parseInt(this.personaStateFlags)) {
		return parseInt(this.personaStateFlags);
	}
	return 0;
}

SteamUser.prototype.setPersona = function(state, name) {
	var user = this;
	this._send(SteamUser.EMsg.ClientChangeStatus, {
		"persona_state": state,
		"persona_state_flags": user.getPersonaStateFlags(),
		"player_name": name
	});
};

function empty(obj) {
	for (var i in obj) {
		if (obj.hasOwnProperty(i)) {
			return true;
		}
	}
	return false;
}

function clone(obj) {
	var r = {};
	for (var i in obj) {
		if (obj.hasOwnProperty(i)) {
			r[i] = obj[i];
		}
	}
	return r;
}

var tickHandle;

var users = {};

var alarms = {};

var bot = {};
global.bot = bot;
bot.users = users;
bot.alarms = alarms;
bot.log = function log() {
	var ar = settings.display_time ? [(new Date()).toTimeString()] : [];
	console.log.apply(console, ar.concat(Array.prototype.slice.call(arguments)));
}
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

bot.getSettings = function getSettings() {
	return clone(settings);
}
bot.getSetting = function getSetting(set) {
	var v = settings[set];
	if (typeof v == "object") {
		if (v == null) {
			return null;
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
	return v;
}

bot.loadExtensions = function loadExtensions() {
	
}
bot.loadExtension = function loadExtension(ext) {
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
		var kek = require(fstr);
		console.log(kek);
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
}

bot.debugModes = [];
bot.getDebugModes = function getDebugModes() {
	return bot.debugModes.concat();
}
bot.debug = function debug(mode) {
	// op = op || getDefaultOutput();
	var op = getDefaultOutput();
	if (bot.getDebugModes().includes("*") || bot.getDebugModes().includes(mode)) {
		// op(msg);
		var c = 0;
		op.apply(null, ["DEBUG|"+mode].concat(Array.prototype.slice.call(arguments).filter(function(x) {return c++ > 0;})));
	}
}

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
	var match = [sid2, sid2.getSteamID64(), sid2.getSteam2RenderedID(), sid2.getSteam2RenderedID(true), sid2.getSteam3RenderedID()];
	if (!sid1) {
		return false;
	}
	if (!(sid1 instanceof Array)) {
		sid1 = [sid1];
	}
	// console.log("postar", sid1, sid2);
	for (var i in sid1) {
		var match1 = [sid1[i]];
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

function formatCurrency(bal, cur) {
	var cc = {
		USD: {
			"char": "$",
			dp: 2
		},
		EUR: {
			"char": "€",
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

function processGame(game, user) {
	var g = game;
	var re = /^\d+$/;
	var g2 = g;
	if (typeof g2 === "string" && g2.match(re)) {
		g2 = parseInt(g2);
	}
	// console.log(user.name, typeof g2, g2, JSON.stringify(user.getOptComb("games_blacklist")), user.getOptComb("games_blacklist").indexOf(g2));
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
		return r;
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

function processGamesArray(games, user) {
	if ((typeof games) == "string" || (typeof games) == "number") {
		return processGame(games, user);
	}
	var r = [];
	for (var i = 0; i < games.length; i++) {
		var g = processGame(games[i], user);
		if (g instanceof Array) {
			r = r.concat(g);
		} else {
			r.push(g);
		}
	}
	r = r.filter(function(x){return ([null, undefined]).indexOf(x) < 0;});
	if (user && (r.length > user.getOpt("maxGames"))) {
		r.splice(user.getOpt("maxGames"));
	}
	return r;
}

function idle(user, games) {
	user.gamesPlayed(processGamesArray(games, user));
}

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
		fs.accessSync(settings["friendSaveFile"], fs.constants.R_OK);
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
		if (autoaccept_min_lvl >= 0 && autoaccept_min_lvl <= ulvl) {
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
		op("No friend requests found for "+name);
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
		op(name+": "+lnk+" "+msg);
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
	if (user.cardCheckRunning) {
		bot.debug("cardsExt", "already a card check running on "+user.name);
		return;
	}
	if (!user.idlingCards()) {
		bot.debug("cardsExt", user.name+" isn't idling cards");
		return;
	}
	var lastCheck = user.lastCheck || 0;
	var lastDiff = (+new Date) - lastCheck;
	var delay = user.newItems ? user.getOpt("cardCheckMinDelay") : (user.getOpt("cardCheckDelay") || settings["cardCheckDelay"] || (5 * 60));
	if (lastDiff < delay * 1000) {
		bot.debug("cardsExt", "still in delay for "+user.name);
		return;
	}
	var f = function(u, cardApps) {
		bot.debug("cards", "received card apps on "+user.name);
		user.newItems = false;
		if (cardApps.length <= 0) {
			user.currentCardApps = [];
			user.allCardApps = cardApps;
			if (u.badgePageHashes) {
				bot.debug("cards", "Badge page hash object found for "+u.name, u.badgePageHashes);
			} else {
				bot.debug("cards", "No badge page hash found for "+u.name);
			}
			if (u.badgePageHashes && user.badgePageHashes[u.cardPage - 1] && user.badgePageHashes[u.cardPage - 1] === user.badgePageHashes[u.cardPage]) {
				bot.debug("cards", "current page ("+u.cardPage+") has the same hash as page "+(u.cardPage-1)+", jumping back to page 1");
				u.cardPage = 1;
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
		var cas = [];
		for (var i = 0; i < ca.length; i++) {
			cas.push(ca[i].appid);
		}
		bot.debug("cards", "card apps to idle for "+user.name+": ", cas);
		user.currentCardApps = cas;
		user.allCardApps = cardApps;
	};
	cardCheck(user, f);
}

function cardCheck(user, callback, keepLastCheck) {
	if (!Cheerio || !request) {
		return false;
	}
	var g_Jar = request.jar();
	var g_Page = user.cardPage;
	if (!user.appOwnershipCached) {
		bot.debug("cards", user.name+" not ready for card idling, app ownership not cached yet");
		return false;
	}
	if (!user.cookies && !bot.getSetting("cardsWebLogOnEveryTime")) {
		bot.debug("cards", user.name+" not ready for card idling, no cookies found");
		return false;
	}
	if (!user.licenses) {
		bot.debug("cards", user.name+" not ready for card idling, no licenses found");
		return false;
	}
	if (!user.picsCache || !user.picsCache.packages) {
		bot.debug("cards", user.name+" not ready for card idling, no picsCache found");
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
		bot.debug("cards", "now sending request for badge page "+g_Page+" on acc "+user.name);
		rq("https://steamcommunity.com/my/badges/?p="+g_Page, function(err, response, body) {
			user.cardCheckRunning = false;
			if (err || response.statusCode != 200) {
				// op("Couldn't request badge page: "+(err||"HTTP error "+response.statusCode));
				if (!keepLastCheck) {
					user.lastCheck = (+new Date) - user.getOpt("cardCheckDelay") * 1000 + user.getOpt("cardCheckFailDelay") * 1000; //could also do this with the param tho
				}
				bot.debug("cards", "badge request for "+user.name+" failed, returned "+(err ? "error" : "status code " + response.statusCode));
				return false;
			}
			if (bot.writebadgepage) {
				try {
					var fn = "./badges_"+user.name+"_"+processStr(":%Y-%m-%d_%H-%M-%S")+".html";
					fs.writeFileSync(fn, body);
					bot.debug("cards", "successfully wrote the badge page for "+user.name+" to a file");
				} catch(err) {
					bot.debug("cards", "error writing the badge page for "+user.name+" to a file");
				}
			}
			bot.debug("cards", "badge request for "+user.name+" arrived, now parsing...");
			if (!keepLastCheck) {
				user.lastCheck = +new Date;
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
			if (!user.badgePageHashes) {
				user.badgePageHashes = {};
			}
			if (md5) {
				user.badgePageHashes[g_Page] = md5(body);
				bot.debug("cards", "Saved md5 hash "+user.badgePageHashes[g_Page]+" for badge page "+g_Page+" on "+user.name);
			}
			/*
			var brlen = $_(".badge_row").length;
			if (!user.badgeRowLengths) {
				user.badgeRowLengths = {};
			}
			user.badgeRowLengths[g_Page] = brlen; //*/
			// bot.debug("cards", user.name+" has a badge row length of "+$_(".badge_row").length+" on badge page "+g_Page);
			var infolines = $_(".progress_info_bold");
			var cardApps = [];
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
					// op(match[1]+" cards in "+appid+" with a playtime of "+(playtime)+"h");
				}
				var gameObj = {};
				gameObj.appid = parseInt(appid);
				gameObj.dropsLeft = parseInt(dropsLeft);
				gameObj.playtime = parseFloat(playtime);
				gameObj.time_created = (lastPkg ? lastPkg.time_created : 0);
				gameObj.newlyPurchased = newlyPurchased;
				if (dropsLeft > 0) {
					cardApps.push(gameObj);
				}
			}
			bot.debug("cards", "finished parsing badge page for "+user.name+", found "+cardApps.length+" game"+(cardApps.length == 1 ? "" : "s"));
			if (callback) {
				callback(user, cardApps);
			}
		});
	}
	if (bot.getSetting("cardsWebLogOnEveryTime")) {
		user.once("webSession", f);
		user.webLogOn();
	} else {
		f(user.sessionID, user.cookies);
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
			console.log("Invalid password entered for "+name);
			user.logOff();
			if (callback) {
				callback();
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
	
	user.logOn({
		accountName: name,
		password: pw
	});
	
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
			user.setOption("enablePicsCache", true);
		}
	});
	
	user.on("loggedOn", function() {
		if (!firstLoginTrigger) {
			console.log("Reconnected with "+name);
			loggedOn();
		}
	});
	
	user.prepareKill = function() {
		killPrepared = true;
	}
	
	user.once("appOwnershipCached", function() {
		// console.log("Cached app ownership for "+user.name);
		user.appOwnershipCached = true;
	});
	
	user.on("loginKey", function(key) {
		
	});
	
	user.on("newItems", function(count) {
		if (!user.initialised()) {
			return;
		}
		user.newItems = true;
		bot.debug("cards", "new items arrived on "+user.name+", trying to check cards...");
		checkCards(user);
	});
	
	user.on("newComments", function(count, myItems, discussions) {
		
	});
	
	user.on("tradeRequest", function(steamID, respond) {
		
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
	
	user.on("friendMessage", function(sid, msg) {
		var sid64 = sid.getSteamID64();
		// user.chatMessage(sid, "Your steamid64: "+sid64);
		// user.chatMessage(sid, reverseString(msg));
		var authorized = false;
		var wl = settings["cmd_whitelist"];
		if (!wl || !(wl instanceof Array)) {
			wl = [];
		}
		// if (wl.includes(sid64) || wl.includes(sid.getSteam3RenderedID()) || wl.includes(sid.getSteam2RenderedID(true)) || wl.includes(sid.getSteam2RenderedID())) {
		if (sidMatch(wl, sid)) {
			authorized = true;
		}
		var publicCommandExecuted = false;
		var r = checkForPublicCommand(sid, msg, user, name);
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
						user.chatMessage(sid, msg);
					};
					try {
						privateCommandExecuted = runCommand(p, null, f, "steam");
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
		if (user.redirectTo && !publicCommandExecuted && !privateCommandExecuted && msg.substr(0, 1) != "!" && user.steamID !== user.redirectTo && user.steamID.getSteamID64() !== user.redirectTo && !sidMatch(user.redirectTo, sid, (typeof user.redirectTo) !== "string")) {
			user.getPersonas([sid], function(personas) {
				
				var sid64 = sidToSID64(sid);
				// console.log(user.redirectTo, personas, personas[sid64]);
				try {
					user.chatMessage(user.redirectTo, "Message from "+((personas[sid64] || {})["player_name"] || "Unknown")+" ["+sid64+"]: "+msg);
				} catch(err) {
					//printing the error message will spam the console when misconfiguring the redirection, so we'll just ignore it (subject to change)
				}
			});
		}
		if (!afkMsgsSent[user.name]) {
			afkMsgsSent[user.name] = {};
		}
		if (!msgsSent[user.name]) {
			msgsSent[user.name] = {};
		}
		var last = afkMsgsSent[user.name][sid64] || 0;
		var lastMsg = msgsSent[user.name][sid64] || 0;
		if (msg.substr(0, 1) !== "!" && ((typeof user.afkMsg) == "string" || user.afkMsg instanceof Array) && (new Date()).getTime() - (settings["afkmsg_delay"] * 1000) > last && (new Date()).getTime() - (settings["afkmsg_suppress_time"] * 1000) > lastMsg) {
			var f = false;
			for (var i in users) {
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
//['keep_login']: keep a login key [FUTURE VERSION, NOT RECOMMENDED]
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
	cards: [":cards"] //used for idling cards, maybe remove array later?
};
var accs = {
};
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
		pixl: "http://www.steamcommunity.com/profiles/76561198135386775"
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
	cardsWebLogOnEveryTime: true
};
function loadSettings(display_output) {
	try {
		fs.accessSync(settingsfile, fs.constants.R_OK);
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
	fs.accessSync(accfile, fs.constants.R_OK);
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
} catch(err) {
	// console.log(err);
	console.log("Couldn't parse account file: "+err);
	// console.log(data);
	return 1;
}
function loadGamePresets(display_output) {
	try {
		fs.accessSync(game_presets_file, fs.constants.R_OK);
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
	for (var ix in i) {
		if (i.hasOwnProperty(ix) && !obj.hasOwnProperty(ix) && !obj[ix]) {
			obj[ix] = i[ix];
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
	var secret = accs[i]["secret"];
	var games = gamesVarToArray(accs[i]["games"]);
	var online = accs[i]["online"];
	var f = function(err, result) {
		if (err) {
			onErr(err);
			return 1;
		}
		if (pwi) {
			pws[pwi] = result.password;
		}
		login(name, result.password, authcode, secret, games, online, function() {doAccId(index + 1);}, accGetOpts(i));
	}
	if ((pwi && pws[pwi]) || d["password"]) {
		console.log("Found existing password for "+name);
		f(0, {password: (pwi && pws[pwi]) ? pws[pwi] : d["password"]});
	} else {
		console.log("Requesting password for "+name);
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
function openCMD() {
	var next = openCMD;
	prompt.get({properties:{cmd:{message: "Enter command", description: "Command"}}}, function(err, result) {
		if (err) {
			onErr(err);
			// next();
			return 1;
		}
		var p = parseCommand(trimSpaces(loopReplace(result.cmd, "  ", " ")));
		try {
			// runCommand(p, next, console.log, "cmd");
			runCommand(p, next, getDefaultOutput(), "cmd");
		} catch(err) {
			console.log("Error running command: "+err);
			next();
		}
		// next();
	});
}
function parseCommand(cmd) {
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
				if (q == c) {
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
				args.push(a);
			}
			la = i + 1;
		}
	}
	// console.log("end", i, la);
	return args;
}
function runCommand(cmd, callback, output, via) { //via: steam, cmd
	var op = output;
	if (!(op instanceof Function)) {
		op = getDefaultOutput();
	}
	if (cmd[0] == "login") {
		var acc = cmd[1];
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
				throw Error("No account provided");
			}
			//login w/ acc...
			if (!accs[acc]) {
				throw Error("Account not in database");
			}
			if (users[acc]) {
				throw Error("Account is already logged in");
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
					return 1;
				}
				if (pwi) {
					pws[pwi] = result.password;
				}
				login(name, result.password, authcode, secret, games, online, callback, accGetOpts(acc));
			}
			if ((pwi && pws[pwi]) || d["password"]) {
				op("Found existing password for "+name);
				f(0, {password: (pwi && pws[pwi]) ? pws[pwi] : d["password"]});
			} else {
				op("Requesting password for "+name);
				prompt.get({properties: {password: {hidden: true, replace: "*"}}}, f);
			}
			return;
		} catch(err) {
			op("Error logging in: "+err);
			if (callback) {
				return callback();
			} else {
				return true;
			}
		}
	}
	if (cmd[0] == "logout") {
		var acc = cmd[1];
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
					throw Error(user+" currently isn't logged in");
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
		var user = cmd[1];
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
					throw Error(user+" currently isn't logged in");
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
		var user = cmd[1];
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
					throw Error(user+" currently isn't logged in");
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
			op(i);
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
			var acc = cmd[1];
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
			var acc = cmd[1];
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
			var acc = cmd[1];
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
		var acc = cmd[1];
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
				op("Set name for "+i+" to '"+name+"'");
			}
		} else {
			try {
				if (!users[acc]) {
					throw Error(acc+" currently isn't logged in");
				}
				users[acc].setPersona(SteamUser.EPersonaState[(users[acc].isOnline ? "Online" : "Offline")], name);
				op("Set name for "+acc+" to '"+name+"'");
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
		var user = cmd[1];
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
			if (!user) {
				for (var i in users) {
					users[i].curIdling = games;
					idle(users[i], users[i].curIdling);
					var g2 = processGamesArray(games, users[i]);
					var len = (g2 instanceof Array ? g2.length : 1);
					if (games.length > 0 && games[0] === ":cards") {
						len = "cards";
					}
					op(i+" is now idling "+(len === "cards" ? "cards" : len+" game"+(len == 1 ? "" : "s")));
				}
			} else {
				if (!users[user]) {
					throw Error(user+" currently isn't logged in");
				}
				users[user].curIdling = games;
				idle(users[user], users[user].curIdling);
				var g2 = processGamesArray(games, users[user]);
				var len = g2.length;
				if (games.length > 0 && games[0] === ":cards") {
					len = "cards";
				}
				op(user+" is now idling "+(len === "cards" ? "cards" : len+" game"+(len == 1 ? "" : "s")));
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
	if (cmd[0] == "addfriend") {
		var frid = cmd[2];
		var acc = cmd[1];
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
						if (callback) {
							return callback();
						} else {
							return;
						}
					}
					var cb = function(){f(index + 1);};
					var user = uar[index];
					user.addFriend(frid, function(err, name) {
						if (err) {
							op("An error occured: "+err);
							cb();
							return;
						}
						op("Successfully added "+name+" ["+frid+"] with account "+user.name);
						cb();
					});
				};
				f(0);
				return;
			} else {
				var user = users[acc];
				if (!user) {
					throw Error(acc+" currently isn't logged in");
				}
				user.addFriend(frid, function(err, name) {
					if (err) {
						throw Error(err);
						return;
					}
					op("Successfully added "+name+" ["+frid+"]");
					if (callback) {
						return callback();
					} else {
						return;
					}
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
		var acc = cmd[1];
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
						op("Message to "+frid+" was sent by "+i);
					} catch(err) {
						op("An error occured: "+err);
					}
				}
			} else {
				if (!users[acc]) {
					throw Error(acc+" currently isn't logged in");
				}
				users[acc].chatMessage(frid, msg);
				op("Message to "+frid+" was sent by "+acc);
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
		var acc = cmd[1];
		if (!acc) {
			var total = {};
			for (var i in users) {
				var user = users[i];
				var wal = user.wallet;
				if (wal) {
					if (!wal.hasWallet) {
						op(i+" doesn't have a wallet");
					} else {
						var bal = wal.balance;
						var cur = wal.currency;
						if (!total[cur]) {
							total[cur] = 0;
						}
						total[cur] += bal;
						op(i+" has a wallet balance of "+formatCurrency(bal, cur));
					}
				} else {
					op("No wallet found for "+i);
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
					throw Error(acc+" currently isn't logged in");
				}
				var user = users[acc];
				var wal = user.wallet;
				if (wal) {
					if (!wal.hasWallet) {
						op(acc+" doesn't have a wallet");
					} else {
						var bal = wal.balance;
						var cur = wal.currency;
						op(acc+" has a wallet balance of "+formatCurrency(bal, cur));
					}
				} else {
					op("No wallet found for "+i);
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
		var acc = cmd[1];
		var to = cmd[2];
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
					op("Activated redirection for "+i);
				} else {
					op("Deactivated redirection for "+i);
				}
			}
		} else {
			try {
				if (!users[acc]) {
					throw Error(acc+" currently isn't logged in");
				}
				var user = users[acc];
				user.redirectTo = red2;
				if (acc === to) {
					user.redirectTo = null;
				}
				if (red2) {
					op("Activated redirection for "+acc);
				} else {
					op("Deactivated redirection for "+acc);
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
		var acc = cmd[2];
		if (cmd1 == "clear") {
			if (!acc) {
				aFriendRequests = {};
				op("Cleared the friend request history for all accounts");
				updateFriendFile();
			} else {
				try {
					if (!aFriendRequests[acc]) {
						throw Error("No friend requests were found for "+acc);
					}
					delete aFriendRequests[acc];
					updateFriendFile();
					op("Cleared the friend request history for "+acc);
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
					acc = cmd1;
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
		var acc = cmd[1];
		if (!acc || acc == "*" || acc == "all") {
			acc = null;
		}
		var appaccs = {};
		try {
			if (!acc) {
				appaccs = users;
			} else {
				if (!users[acc]) {
					throw Error(acc+" currently isn't logged in");
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
					op(i+" has "+totalCards+" card drop"+(totalCards == 1 ? "" : "s")+" remaining in "+totalGames+" game"+(totalGames == 1 ? "" : "s"));
				} else {
					op(i+" has no card drops remaining or didn't idle cards before");
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
			bot.loadExtension(ext);
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
		var acc = cmd[1];
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
				op("Set persona state flags for "+i+" to "+state);
			}
		} else {
			try {
				if (!users[acc]) {
					throw Error(acc+" currently isn't logged in");
				}
				users[acc].personaStateFlags = state;
				updateOnlineStatus(users[acc]);
				op("Set persona state flags for "+acc+" to "+state);
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
		var acc = cmd[1];
		try {
			throw Error("Command disabled due to breaking the card idling. Edit the script to reenable this command");
			if (!acc) {
				throw Error("No account supplied. This command may not be applied to all account at once");
			}
			if (!users[acc]) {
				throw Error(acc+" currently isn't logged in");
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
	if (cmd[0] == "optcomb") {
		var acc = cmd[1];
		if (!acc || acc == "*" || acc == "all") {
			acc = null;
		}
		var appaccs = {};
		try {
			if (!acc) {
				appaccs = users;
			} else {
				if (!users[acc]) {
					throw Error(acc+" currently isn't logged in");
				}
				// appaccs.push(users[acc]);
				appaccs[acc] = users[acc];
			}
			for (var i in appaccs) {
				var oc = appaccs[i].getOptComb("games_blacklist");
				var ocs = JSON.stringify(oc);
				op(i+": "+ocs);
			}
		} catch(err) {
			op("An error occured: "+err);
		}
	}
	if (cmd[0] == "curidling") {
		var acc = cmd[1];
		try {
			if (!acc) {
				throw Error("No account supplied. This command may not be applied to all accounts at once");
			}
			if (!users[acc]) {
				throw Error(acc+" currently isn't logged in");
			}
			var ci = users[acc].curIdling;
			var cis = JSON.stringify(ci);
			op(acc+": "+cis);
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
		var acc = cmd[1];
		try {
			if (!acc) {
				throw Error("No account supplied. This command may not be applied to all accounts at once");
			}
			if (!users[acc]) {
				throw Error(acc+" currently isn't logged in");
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
		var acc = cmd[1];
		var msg = cmd[2] || settings["afk_defaultmsg"];
		if (!acc || acc == "*" || acc == "all") {
			acc = null;
		}
		var disable = (["disable", "none", "noafk", "off"]).includes(msg);
		var def = (["on", "default", "def"]).includes(msg);
		if (def) {
			msg = settings["afk_defaultmsg"];
		}
		if ((typeof msg) !== "string" && !(msg instanceof Array)) {
			op("There was an error setting the afk message. The message doesn't seem to be a string or array");
			msg = "I'm afk";
		}
		if (!acc) {
			for (var i in users) {
				users[i].afkMsg = (disable ? null : msg);
				if (disable) {
					op("Disabled afk message for "+i);
				} else {
					op("Set afk message for "+i);
				}
			}
		} else {
			try {
				if (!users[acc]) {
					throw Error(acc+" currently isn't logged in");
				}
				users[acc].afkMsg = (disable ? null : msg);
				if (disable) {
					op("Disabled afk message for "+acc);
				} else {
					op("Set afk message for "+acc);
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
		op("\n ================== > All Admin Commands < ================= \n Here is a list with all Admin commands. | Info > - Use * to select all Acc's \n \n ~~~~~~~~~~~~~~~~~~ > Bot Control features < ~~~~~~~~~~~~~~~~~ \n 1. !idle <user or *> <ID/gp or \"your message\">: to start idling games. \n 2. !idle <user or *>: stop to stop idling. \n 3. !addfriend <user or *> <steamid64>: to add a friend with all or one Acc. \n 4. !newfriends <acc or *>: to see all new automatically accepted friends. \n 5. !newfriends clear <user or *>: to clean the list. \n 6. !redirect <user or *> <steam64id>: to redirect all msgs to an Acc. \n 7. !msg <user or *> <steam64id> <msg>: to send a msg to other users. \n 8. !wallet <user or *>: to see how much money you have. \n 9. !afk <user or *> <on or off>: to automatically send an afk msg. \n 10. !uimode [<user or *>] [<phone, web, big_picture (bp) or desktop>]: to change the ui mode. \n 11. !name [<user or *>] <name>: to change the name. \n 12. !help: to see all public commands. \n ===================================================");
		if (callback) {
			return callback();
		} else {
			return true;
		}
	}
	if ((["help", "ahelp"]).includes(cmd[0])) {
		op("add <user>: adds a user to the database");
		op("");
		op("login <user>: login");
		op("");
		op("logout [<user>]: logout with specified user/all users");
		op("");
		op("idle [<user>] [<games>]: idle the specified games with the specified user");
		op("~<user> is the name of the account you want to idle on");
		op("no user, '*' and 'all' will result in all logged in user idling");
		op("~<games> is either a list of game ids (separated with ','),\na game preset or a custom game");
		op("");
		op("addfriend [<user>] <newfriend>: add <newfriend> to your friend list");
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
		var acc = cmd[1];
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
					throw(acc+" currently isn't logged in");
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
	// throw Error("Unhandled command");
	op("Error: Unhandled command\nEnter 'help' for a list of commands");
	if (callback) {
		callback();
	}
	return false;
}

function checkForPublicCommand(sid, msg, user, name) {
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
					var obj = alarms[name][sid.getSteamID64()][i];
					var id = obj["id"];
					var tim = obj["time"];
					var desc = obj["desc"];
					var timd = new Date(tim);
					user.chatMessage(sid, "Alarm "+id+" at "+timd.toDateString()+" "+timd.toTimeString()+": "+desc);
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
							user.chatMessage(sid, "Alarm "+id+" at "+timd.toDateString()+" "+timd.toTimeString()+" with description '"+desc+"' was removed");
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
			user.chatMessage(sid, "Your alarm ["+r["id"]+"] was set on " + aDate.toDateString() + " " + aDate.toTimeString());
		}
		return true;
	}
	if (cmd[0] === "date") {
		user.chatMessage(sid, "Today is "+(new Date()).toDateString());
		return true;
	}
	if (cmd[0] === "time") {
		var curDate = new Date();
		var tmsg = "It's currently "+(curDate).toTimeString();
		var stm = false;
		var stmsgs = settings["time_special"];
		for (var i in stmsgs) {
			if (!(stmsgs[i] instanceof Object)) {
				continue;
			}
			var hs = stmsgs[i]["h"];
			var ms = stmsgs[i]["m"];
			var smsg = stmsgs[i]["msg"];
			if ((!hs || hs.includes(curDate.getHours())) && (!ms || ms.includes(curDate.getMinutes()))) {
				stm = true;
				tmsg = tmsg + " - " + smsg;
				break;
			}
		}
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
}

if (settings["tick_delay"] > 0) {
	tickHandle = setInterval(tick, (settings["tick_delay"] || 10) * 1000);
}

// console.log(getDefaultReplaceObject(), getTimeReplaceObject(), combineObjects([getDefaultReplaceObject(), getTimeReplaceObject()]));
// combineObjects([getDefaultReplaceObject(), getTimeReplaceObject()]);

// var sids = "76561198135386775";
// var sid1 = new SteamID(sids);
// var sid2 = new SteamID(sids);
// console.log(sidMatch(sid1, sid2, true));
// process.exit();
// return;

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

if (settings["autologin"]) {
	doAccId(0);
} else {
	openCMD();
}

String.prototype.replaceMultiple = function(findreplace) {
	return this.replace(new RegExp("(" + Object.keys(findreplace).map(function(i){return i.replace(/[.?*+^$[\]\\(){}|-]/g, "\\$&")}).join("|") + ")", "g"), function(s){ return findreplace[s]});
}
