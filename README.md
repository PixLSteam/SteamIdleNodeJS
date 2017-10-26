# SteamIdleNodeJS
steam idle script using node.js

Dependencies:
* node.js
  * steam-user
  * steam-totp
  * prompt
  * steamcommunity
  * cheerio (optional, needed for card idling)
  * request (optional, needed for card idling)

Changelog (not really updated) & (possible) upcoming features:
- [x] Account Config File (idleaccs.json)
- [x] Game Presets
- [x] In-App command line to control idling
- [x] Clock (":%H:%M")
- [x] Multiple Accounts
- [x] package.json to simply allow usage of `npm install`
- [ ] Option to keep login key
- [ ] Option to use the secret to automatically generate authentication codes

Look at the commit history for a "full" changelog

I'm currently not working on the upcoming features listed above, because I personally think they aren't that important.
Use the issue tracker for feature suggestions or bug reports.

Installation:
* Download the steamidle.js
* Install nodejs and the dependencies listed above ("npm install <module>")
* Create a file named "idleaccs.json" in the same folder as the steamidle.js
 * Learn JSON or take a look at the examples
