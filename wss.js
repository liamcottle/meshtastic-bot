import fetch from "node-fetch";
import * as https from "https";
import { webcrypto } from "node:crypto";
import { bluetooth } from "webbluetooth";
import { WebSocket, WebSocketServer } from "ws";
import {
    Client, Types, Protobuf,
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
});

// create websocket server
const wss = new WebSocketServer({
    port: 8080,
});

// create meshtastic http client
const client = new Client();
const connection = client.createHttpConnection();

// exit when meshtastic client disconnects or tries to reconnect, as events don't seem to come through after reconnect
connection.events.onDeviceStatus.subscribe((status) => {
    if(status === Types.DeviceStatusEnum.DeviceDisconnected || status === Types.DeviceStatusEnum.DeviceReconnecting){
        console.log("Exiting, as disconnect/reconnect doesn't seem to work properly...");
        process.exit(1);
    }
});

// handle new websocket connections
wss.on('connection', (ws) => {

    // handle received messages
    ws.on('message', (message) => {
        try {

            // parse received message as json
            const data = JSON.parse(message);

            // handle ToRadio packets received from websocket clients
            if(data.type === "to_radio"){
                if(data.raw){
                    // send ToRadio packet as raw protobuf to meshtasticd
                    connection.sendRaw(Buffer.from(data.raw, "base64"));
                } else if(data.json) {
                    // send ToRadio packet created from json to meshtasticd
                    connection.sendRaw(Protobuf.Mesh.ToRadio.fromJson(data.json).toBinary());
                }
            }

        } catch(e) {
            console.error("failed to parse websocket message", e);
        }
    });

});

// forward fromRadio packets to all connected websocket clients
connection.events.onFromRadio.subscribe((fromRadio) => {
    wss.clients.forEach((client) => {
        if(client.readyState === WebSocket.OPEN){
            client.send(JSON.stringify({
                type: "from_radio",
                // send raw protobuf as base64 to allow other clients to process any fields unknown to us
                raw: Buffer.from(fromRadio.toBinary()).toString("base64"),
                // send json version of protobuf to allow clients to easily use fields known to us without having to parse protobuf
                json: fromRadio.toJson(),
            }));
        }
    });
});

// connect to meshtasticd running on self via http
await connection.connect({
    address: "127.0.0.1",
    tls: true,
});