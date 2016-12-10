var SteamUser = require("steam-user");
var SteamTotp = require("steam-totp");

var prompt = require("prompt");
var fs = require("fs");

prompt.start();

var users = {};

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

function processGame(game) {
	g = game;
	// console.log(typeof g, g);
	if ((typeof g) == "string" && g.substr(0, 1) == ":") { //clock
		g = g.substr(1);
		var d = new Date();
		g = g.replaceMultiple({"%%": "%", "%H": doubleDigit(d.getHours()), "%M": doubleDigit(d.getMinutes()), "%S": doubleDigit(d.getSeconds())});
		while (g.search("%rd") >= 0) {
			g = g.replace("%rd", Math.floor(Math.random() * 10));
		}
		while (g.search("%rD") >= 0) {
			g = g.replace("%rD", Math.floor(Math.random() * 9) + 1);
		}
	}
	return g;
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
	}
}

function login(name, pw, authcode, secret, games, online, callback) {
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
	clock: [":%H:%M"]
};
var accs = {
};
var settings = {
	autologin: true, //whether to login every account on startup
	cmd: true, //whether to display a command line after logging in every account (only valid if autologin is true)
	tick_delay: 10 //idle checking delay in seconds
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
			settings[i] = pdata[i];
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
		login(name, result.password, authcode, secret, games, online, function() {doAccId(index + 1);});
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
			runCommand(p, next);
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
function runCommand(cmd, callback) {
	if (cmd[0] == "login") {
		var acc = cmd[1];
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
			login(name, result.password, authcode, secret, games, online, callback);
		}
		if (pwi && pws[pwi]) {
			console.log("Found existing password for "+name);
			f(0, {password: pws[pwi]});
		} else {
			console.log("Requesting password for "+name);
			prompt.get({properties: {password: {hidden: true, replace: "*"}}}, f);
		}
		return;
	}
	if (cmd[0] == "logout") {
		var acc = cmd[1];
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
			console.log("An error occured: "+err);
		}
		if (callback) {
			return callback();
		} else {
			return;
		}
	}
	if (cmd[0] == "online") {
		var user = cmd[1];
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
			console.log("An error occured: "+err);
		}
		if (callback) {
			return callback();
		} else {
			return;
		}
	}
	if (cmd[0] == "offline") {
		var user = cmd[1];
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
			console.log("An error occured: "+err);
		}
		if (callback) {
			return callback();
		} else {
			return;
		}
	}
	if (cmd[0] == "exit") {
		//kill script
		process.exit();
		return;
	}
	if (cmd[0] == "add") {
		//add user to idleaccs.json
		console.log("Command 'add' currently isn't supported");
		if (callback) {
			return callback();
		} else {
			return;
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
				}
			} else {
				if (!users[user]) {
					throw Error(user+" currently isn't logged in");
				}
				users[user].curIdling = games;
				idle(users[user], users[user].curIdling);
			}
		} catch(err) {
			console.log("An error occured: "+err);
		}
		if (callback) {
			return callback();
		} else {
			return;
		}
	}
	if (cmd[0] == "help") {
		console.log("add <user>: adds a user to the database");
		console.log("");
		console.log("login <user>: login");
		console.log("");
		console.log("logout [<user>]: logout with specified user/all users");
		console.log("");
		console.log("idle [<user>] [<games>]: idle the specified games with the specified user");
		console.log("~<user> is the name of the account you want to idle on");
		console.log("no user, '*' and 'all' will result in all logged in user idling");
		console.log("~<games> is either a list of game ids (separated with ','),\na game preset or a custom game");
		return callback();
	}
	// throw Error("Unhandled command");
	console.log("Error: Unhandled command\nEnter 'help' for a list of commands");
	callback();
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
