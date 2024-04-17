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

// FIXME: ignoring uncaught exception, caused by "Packet x of type packet timed out"...
process.on("uncaughtException", (e) => {
    console.error("Ignoring uncaught exception", e);
})

// create ble client
const client = new Client();
const connection = client.createBleConnection();

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
