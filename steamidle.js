var SteamUser = require("steam-user");
var SteamTotp = require("steam-totp");

var SteamCommunity = require("steamcommunity");
var community = new SteamCommunity();

var prompt = require("prompt");
var fs = require("fs");

prompt.start();

var users = {};

var alarms = {};

function reverseString(str) {
	var s = "";
	for (var i = str.length; i--; i >= 0) {
		s = s + str[i];
	}
	return s;
}

Date.prototype.addDays = function(days)
{
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
	return console.log;
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

function processStr(str) {
	var g = str;
	if ((typeof g) == "string" && g.substr(0, 1) == ":") { //clock
		g = g.substr(1);
		var d = new Date();
		g = g.replaceMultiple({"%%": "%", "%H": doubleDigit(d.getHours()), "%M": doubleDigit(d.getMinutes()), "%S": doubleDigit(d.getSeconds()), "%Y": doubleDigit(d.getFullYear()), "%m": doubleDigit(d.getMonth() + 1), "%d": doubleDigit(d.getDate()), "%y": doubleDigit(d.getFullYear() - Math.floor(d.getFullYear() / 100) * 100)});
		while (g.search("%rd") >= 0) {
			g = g.replace("%rd", Math.floor(Math.random() * 10));
		}
		while (g.search("%rD") >= 0) {
			g = g.replace("%rD", Math.floor(Math.random() * 9) + 1);
		}
	}
	return g;
}

function processGame(game) {
	var g = game;
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
	return processStr(m);
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

function processGamesArray(games) {
	if ((typeof games) == "string" || (typeof games) == "number") {
		return processGame(games);
	}
	var r = [];
	for (var i = 0; i < games.length; i++) {
		r.push(processGame(games[i]));
	}
	return r;
}

function idle(user, games) {
	user.gamesPlayed(processGamesArray(games));
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

function checkFriendRequest(user, fr) {
	var autoaccept_min_lvl = (user.opts || {}).autoaccept_min_lvl;
	user.getSteamLevels([fr], function(results) {
		var ulvl = results[fr];
		if (autoaccept_min_lvl >= 0 && autoaccept_min_lvl <= ulvl) {
			//accept
			user.addFriend(fr);
			user.chatMessage(fr, "Hey there! You got accepted by the bot.");
		} else {
			//cancel or 'ignore'
			if (settings["autoaccept_cancel_lowlvl"]) {
				user.removeFriend(fr);
			} else {
				//do nothing
			}
		}
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
			}
		}
	}
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
	ualarms.push({time: altime, desc: msg});
	alarms[user][sid64] = ualarms;
	return altime;
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
	for (var i in users) {
		idle(users[i], users[i].curIdling);
		// users[i].setPersona(users[i].isOnline && SteamUser.Steam.EPersonaState.Online || SteamUser.Steam.EPersonaState.Offline);
		updateOnlineStatus(i);
		checkForFriendRequests(users[i]);
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
	 
	user.on("error", function(err) {
		console.log("An error occured..."); 
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
		user.opts = opts;
		updateOnlineStatus(name);
		user.curIdling = user.curIdling || games || [221410];
		idle(user, user.curIdling);
	}
	 
	user.on("webSession", function() {
		if (firstLoginTrigger) {
			console.log("Logged in!");
			users[name] = user;
			user.isOnline = toBool(online);
			loggedOn();
			firstLoginTrigger = false;
			if (callback) {
				callback();
			}
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
	
	user.on("loginKey", function(key) {
		
	});
	
	user.on("newItems", function(count) {
		
	});
	
	user.on("newComments", function(count, myItems, discussions) {
		
	});
	
	user.on("tradeRequest", function(steamID, respond) {
		
	});
	
	user.on("user", function(sid, userdata) {
		
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
		if (wl.includes(sid64) || wl.includes(sid.getSteam3RenderedID()) || wl.includes(sid.getSteam2RenderedID(true)) || wl.includes(sid.getSteam2RenderedID())) {
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
					privateCommandExecuted = runCommand(p, null, f, "steam");
				}
			} else {
				// user.chatMessage(sid, "You shall not pass.");
			}
		}
		if (user.redirectTo && !publicCommandExecuted && !privateCommandExecuted && msg.substr(0, 1) != "!" && user.steamID !== user.redirectTo && user.steamID.getSteamID64() !== user.redirectTo) {
			user.getPersonas([sid], function(personas) {
				
				var sid64 = sidToSID64(sid);
				// console.log(user.redirectTo, personas, personas[sid64]);
				user.chatMessage(user.redirectTo, "Message from "+((personas[sid64] || {})["player_name"] || "Unknown")+" ["+sid64+"]: "+msg);
			});
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
	steam4linux: [221410]
};
var accs = {
};
var settings = {
	autologin: true, //whether to login every account on startup
	cmd: true, //whether to display a command line after logging in every account (only valid if autologin is true)
	tick_delay: 10, //idle checking delay in seconds
	cmd_whitelist: [],
	logout_via_chat: false,
	offline_via_chat: false,
	online_via_chat: false,
	maximum_alarms: 10,
	public_chat_bot: true,
	autoaccept: true, //whether to automatically accept friend requests, has to be turned on for every account by setting autoaccept_min_lvl to 0 or higher[CURRENTLY NOT SUPPORTED DUE TO MISSING EVENT/METHODS]
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
		github: "https://github.com/PixLSteam/SteamIdleNodeJS"
	}
};
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
		console.log("Couldn't parse settings file: "+err);
	}
} catch(err) {
	console.log("No settings file['"+settingsfile+"'] found, skipping...");
}
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
		console.log("Couldn't parse game presets file: "+err);
	}
} catch(err) {
	console.log("No game presets file['"+game_presets_file+"'] found, skipping...");
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
		login(name, result.password, authcode, secret, games, online, function() {doAccId(index + 1);}, {autoaccept_min_lvl: (accs[i]["autoaccept_min_lvl"] == undefined || accs[i]["autoaccept_min_lvl"] == null ? -1 : accs[i]["autoaccept_min_lvl"])});
	}
	if (pwi && pws[pwi]) {
		console.log("Found existing password for "+name);
		f(0, {password: pws[pwi]});
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
			runCommand(p, next, console.log, "cmd");
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
				login(name, result.password, authcode, secret, games, online, callback, {autoaccept_min_lvl: (accs[acc]["autoaccept_min_lvl"] == undefined || accs[acc]["autoaccept_min_lvl"] == null ? -1 : accs[acc]["autoaccept_min_lvl"])});
			}
			if (pwi && pws[pwi]) {
				op("Found existing password for "+name);
				f(0, {password: pws[pwi]});
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
			op("Adding accounts via steam chat is disabled");
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
					op(i+" is now idling "+games.length+" game"+(games.length == 1 ? "" : "s"));
				}
			} else {
				if (!users[user]) {
					throw Error(user+" currently isn't logged in");
				}
				users[user].curIdling = games;
				idle(users[user], users[user].curIdling);
				op(user+" is now idling "+games.length+" game"+(games.length == 1 ? "" : "s"));
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
					} catch(err) {
						op("An error occured: "+err);
					}
				}
			} else {
				if (!users[acc]) {
					throw Error(acc+" currently isn't logged in");
				}
				users[acc].chatMessage(frid, msg);
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
						op(i+" has a wallet balance of "+SteamUser.formatCurrency(bal, cur));
					}
				} else {
					op("No wallet found for "+i);
				}
			}
			op("Total:");
			for (var cur in total) {
				var bal = total[cur];
				op("\t"+SteamUser.formatCurrency(bal, cur));
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
						op(acc+" has a wallet balance of "+SteamUser.formatCurrency(bal, cur));
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
	if (cmd[0] == "help") {
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
		user.chatMessage(sid, msgb);
		return true;
	}
	if (cmd[0] === "alarm") {
		var time = cmd[1];
		if (!time) {
			user.chatMessage(sid, "No time entered");
			return false;
		}
		var desc = cmd[2];
		if (!desc) {
			desc = "Alarm!";
		}
		var r = addAlarm(name, sid, time, desc);
		if (!r) {
			user.chatMessage(sid, "Error adding alarm");
		} else {
			var aDate = new Date(r);
			user.chatMessage(sid, "Your alarm was set on " + aDate.toDateString() + " " + aDate.toTimeString());
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
		var re = /^(?:http(?:s)?:\/\/(?:www\.)?steamcommunity\.com\/id\/)?([a-zA-Z0-9]*)(?:\/)?$/;
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
	setInterval(tick, (settings["tick_delay"] || 10) * 1000);
}

if (settings["autologin"]) {
	doAccId(0);
} else {
	openCMD();
}

String.prototype.replaceMultiple = function(findreplace) {
	return this.replace(new RegExp("(" + Object.keys(findreplace).map(function(i){return i.replace(/[.?*+^$[\]\\(){}|-]/g, "\\$&")}).join("|") + ")", "g"), function(s){ return findreplace[s]});
}
