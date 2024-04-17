# Meshtastic Bot

A very basic bot that connects to a Meshtastic device over Bluetooth and replies to direct messages.

## Commands

`ping`: replies with `pong`

## How to use?

```
npm install
node index.js
```

## TODO

- Support HTTP connections to Linux Native. Need to do some patching to `fetch` to allow self-signed certs.
- Support serial connections for nodes connected directly to machine running the bot code.
