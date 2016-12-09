var SteamUser = require("steam-user");
var SteamTotp = require("steam-totp");

var prompt = require("prompt");
var fs = require("fs");

prompt.start();

var users = {};

function login(name, pw, authcode, secret, games, online, callback) {
	var user = new SteamUser();
	
	var firstLoginTrigger = true;
	
	ac = authcode || SteamTotp.getAuthCode(secret || "");
	
	if (!secret && !authcode) {
		ac = "";
	}
	ac = SteamTotp.getAuthCode("");
	 
	 user.on("error", function(err) {
		console.log("An error occured..."); 
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
		user.setPersona(online && SteamUser.Steam.EPersonaState.Online || SteamUser.Steam.EPersonaState.Offline)
		user.gamesPlayed(games || [221410]);
	}
	 
	user.on("webSession", function() {
		console.log("Logged in!");
		users[name] = user;
		loggedOn();
		firstLoginTrigger = false;
	    if (callback) {
			callback();
		}
	});
	
	user.on("loggedOn", function() {
		if (!firstLoginTrigger) {
			console.log("Reconnected with "+name);
			loggedOn();
		}
	});
	
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
var accfile = "idleaccs.json";
var game_presets_file = "idlegp.json";
var game_presets = {
	cs: [
		10,
		80,
		240,
		730
	]
};
var accs = {
	smf316: {
		pw_index: 1,
		games: games,
		online: true
	}
};
try {
	fs.accessSync(accfile, fs.constants.R_OK);
} catch (err) {
	console.log("Couldn't read account file '"+accfile+"'");
	return 1;
}
var data = fs.readFileSync(accfile);
try {
	pdata = JSON.parse(data);
	if (!(pdata instanceof Object)) {
		throw Error("Parsed JSON is not an object");
	}
	accs = pdata;
} catch(err) {
	console.log(err);
	console.log("Couldn't parse account file: "+err);
	console.log(data);
	return 1;
}
var accids = [];
for (var i in accs) {
	accids.push(i);
}
function doAccId(index) {
	if (index >= accids.length) {
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
	var games = accs[i]["games"];
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
doAccId(0);
