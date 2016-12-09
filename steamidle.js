var SteamUser = require('steam-user');
var SteamTotp = require('steam-totp');

var prompt = require("prompt");

prompt.start();

function login(name, pw, authcode, secret, games, online, callback) {
	var user = new SteamUser();
	
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
	 
	user.on('webSession', function() {
		console.log('Logged in!');
		user.setPersona(online && SteamUser.Steam.EPersonaState.Online || SteamUser.Steam.EPersonaState.Offline)
		user.gamesPlayed(games || [730]);
	    if (callback) {
			callback();
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
var accs = {
	account: {
		pw_index: 1,
		games: games,
		online: true
	}
};
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
