
# Discord-semux-tip-bot

Bot created for Semux discord channel. 
Bot use semux.js, so you need to run local node or another opened Semux node.

**Bot can:**
* tip discord users in SEM. 
* check balance on Sem address.
* withdraw SEM to any address.
* create a unique new address for each user.
* shows list of the most active donators.
* shows list of the most luckiest receivers.
* show semux stats
* shows all commands.


## How to run
### Change configs
* Change config-bot.json file. 
* Add your semux username and password for api.
* Add bot token (it will generate here - <https://discordapp.com/developers/applications/me>)
* Add or change prefix, you can use "!","/","$" or any another string.
### Run bot
* Run semux node
* Clone the sourse code `git clone https://github.com/speedrunner911/semux-tip-bot`
* Open semux-tip-bot folder `cd semux-tip-bot`
* Install all dependecies with `npm install`
* Create new model `sequelize db:migrate`
* Run bot `node index.js`
	
