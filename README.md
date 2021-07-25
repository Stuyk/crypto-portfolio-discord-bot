# Crypto Portfolio Discord Bot

**What?**

This bot lets your users save their portfolios to a MongoDB database and allows them to add, remove, and track their portfolios based on the initial coin price of when that coin was added.

**Features**

* Get Ticker Price
* Track Portfolio
* Add Coins
* Remove Coins
* Portfolio History
* Privacy Mode
* Periodic Updates for Portfolio in DMs

**Configuration**

This uses environment variables. You either use a `.env` file or pass environment variables in. Here is the current config.

```
DATABASE_URL=''
DATABASE_NAME=''
DISCORD_BOT_TOKEN=''
```

Make sure when you make a Discord bot that you turn on the User Intent stuff.

**Deployment**

You need NodeJS 14+

You need a Discord Bot Token

You need a standalone MongoDB Server

```
npm install
npm run
```

**Development**

```
npm run watch
```
