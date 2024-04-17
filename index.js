import fetch from "node-fetch";
import * as https from "https";
import { webcrypto } from "node:crypto";
import { bluetooth } from "webbluetooth";
import {
    Client,
} from "@meshtastic/js";

// FIXME: meshtastic.js requires crypto and navigator.bluetooth, but they don't exist in nodejs, so we will supply them
globalThis.crypto = webcrypto;
globalThis.navigator = {
    bluetooth: bluetooth,
};

// FIXME: replacing global fetch, so we can use an https agent to ignore self-signed ssl certs used in meshtastic linux native devices
globalThis.fetch = async (url, options) => {
    return fetch(url, {
        ...options,
        agent: new https.Agent({
            rejectUnauthorized: false,
        }),
    });
};

// FIXME: ignoring uncaught exception, caused by "Packet x of type packet timed out"...
process.on("uncaughtException", (e) => {
    console.error("Ignoring uncaught exception", e);
})

// create ble client
const client = new Client();
const connection = client.createBleConnection();
// const connection = client.createHttpConnection();

// listen for received text messages
connection.events.onMessagePacket.subscribe(async (data) => {
    try {

        // ignore messages that were not sent to us
        if(data.to !== connection.myNodeInfo?.myNodeNum){
            return;
        }

        // ignore messages that aren't direct
        if(data.type !== "direct"){
            return;
        }

        // get received message text
        const text = data.data;

        // handle ping
        if(text === "ping"){
            await connection.sendText("pong", data.from, false);
        }

    } catch(e) {
        // ignore error handling message
        console.error(e);
    }
});

// connect to ble device by name
await connection.connect({
    deviceFilter: {
        filters: [
            {
                name: "LIAM_e4c4",
            },
        ],
    },
});

// // connect to meshtastic device over http
// await connection.connect({
//     address: "10.1.0.249",
//     tls: true,
// });
