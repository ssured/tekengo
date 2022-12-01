import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import sucrase from "@rollup/plugin-sucrase";
import livereload from "rollup-plugin-livereload";
import serve from "rollup-plugin-serve";
import type { RollupOptions } from "rollup";
import { AddressInfo, WebSocketServer, WebSocket } from "ws";
import { Db } from "../db/db";
import { observe } from "mobx";
import { knownObjects, loadJSON, stableStringify } from "../merkledag";
import { sha256 } from "../utils/sha256";

const config: RollupOptions = {
  input: "buildroots/app.ts",
  output: {
    file: "docs/app.js",
  },
  watch: { clearScreen: false },
  plugins: [
    resolve({ extensions: [".ts", ".tsx"] }),
    sucrase({
      exclude: ["node_modules/**"],
      transforms: ["typescript"],
      production: true,
    }),
    livereload({
      delay: 0,
      inject: false,
    }),
    commonjs(),
    serve({
      // https://github.com/thgh/rollup-plugin-serve
      open: false,
      openPage: "/",
      port: "9876",

      // Show server address in console (default: true)
      verbose: false,
      contentBase: ["docs"],

      // Set to true to return index.html (200) instead of error page (404)
      historyApiFallback: true,

      // execute function after server has begun listening
      onListening: function (server) {
        const address = server.address() as AddressInfo;
        const host = address.address === "::" ? "localhost" : address.address;
        // by using a bound function, we can access options as `this`
        const protocol = (this as any).https ? "https" : "http";
        console.log(
          `Server listening at ${protocol}://${host}:${address.port}/`
        );

        startMerkleDAGServer();
      },
    }),
  ],
};

export default config;
function startMerkleDAGServer() {
  const db = new Db();

  const wss = new WebSocketServer({
    port: 8788,
  });

  const sockets = new Set<WebSocket>();

  wss.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));

    socket.on(
      "close",
      observe(knownObjects, (change) => {
        if (change.type === "add") {
          console.log("send to browser", change.name, change.newValue);
          socket.send(change.newValue);
        }
      })
    );

    socket.on("message", (e) => {
      const source = e.toString("utf8");
      console.log(">>>", source);
      const hashOrObject = JSON.parse(source);

      if (
        typeof hashOrObject === "object" &&
        hashOrObject &&
        !Array.isArray(hashOrObject)
      ) {
        const sha = sha256(source);
        if (!(sha in knownObjects)) {
          loadJSON(source);
          db.persist(sha, hashOrObject);
          console.log("stored", sha, source);
        }
        return;
      }

      if (typeof hashOrObject !== "string") {
        console.log("not a string", hashOrObject);
        return;
      }

      if (hashOrObject in knownObjects) {
        console.log(
          "send known to browser",
          hashOrObject,
          knownObjects[hashOrObject]
        );
        socket.send(knownObjects[hashOrObject]);
        return;
      }

      try {
        const result = db.read(hashOrObject);
        if (result) {
          // const encoded = JSON.stringify(result);
          // loadJSON(result);
          // decodeObject(encoded);
          // console.log({ wss: hash, result });
          console.log(
            "send from db to browser",
            hashOrObject,
            stableStringify(result)
          );
          socket.send(stableStringify(result));
        } else {
          console.log("hash not found", hashOrObject);
        }
      } catch (e) {
        console.error("db read failed", e);
      }
    });
  });
}
