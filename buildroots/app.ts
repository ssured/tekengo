import { html, render } from "lit-html";
import { action, autorun, observable, observe } from "mobx";
import { computedFn } from "mobx-utils";
import "../styling";
import {
  decodeObject,
  encodeObject,
  knownObjects,
  loadJSON,
  open,
  requestedHashes,
  stableStringify,
} from "../merkledag";
import { JSONObject } from "../utils/hash";
import { sha256 } from "../utils/sha256";

const ws = new WebSocket("ws://" + location.hostname + ":8788");

const sendMessage = new Promise<(hash: string) => void>((res) => {
  ws.addEventListener("open", () => res((hash) => ws.send(hash)));
});

ws.onmessage = (e) => {
  const stringified = e.data as string;
  try {
    const obj = JSON.parse(stringified);
    console.log(">>>", sha256(stringified), stringified);
    if (typeof obj === "object" && obj && !Array.isArray(obj)) {
      loadJSON(stringified);
    }
  } catch (e) {
    console.error({ wsError: e });
  }
};

observe(knownObjects, async (change) => {
  if (change.type === "add") {
    console.log("send to server", change.newValue);
    (await sendMessage)(change.newValue);
  }
});

observe(requestedHashes, (change) => {
  if (change.type === "add") {
    console.log("request", change.newValue);

    (async () => {
      (await sendMessage)(JSON.stringify(change.newValue));
    })();

    // setTimeout(() => {
    //   const encoded = encodeObject({
    //     b: { c: { a: ["asd}"] } },
    //     ref: ["ref", "ref2"],
    //   });
    //   console.log(encoded);
    // }, 500);
  }
});

// const hashObject = (o: JSONObject): EncodedJSONObjectRef =>
//   sha256(stringify(o));

// const stringify = (o: JSONObject): string => stableStringify(encodeObject(o));

const state = observable.object({
  x: 0,
  y: 0,
});

const startSha =
  // "470b58955244ad649c01fe62be7e0ebe7950f113999e748c500b7481d2351ffa";
  loadJSON(
    stableStringify(
      encodeObject({
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        day: new Date().getDate(),
      })
    )
  );
console.log({ startSha });

const template = computedFn(
  (state: { year: number; month: number; day: number }) => {
    const { year } = state;

    return html`
      <h1>${year}</h1>
      <input
        type="number"
        value=${"" + year}
        @change=${(e: Event & { target: HTMLInputElement }) =>
          (state.year = e.target.valueAsNumber)}
      />
      <pre>
${JSON.stringify(
          decodeObject({
            b: [
              "6907c51a284e8c84a0a86d160d34fddc6867f1f9533ca7c4d1f56b0cf1ebfcd7",
            ],
          }),
          null,
          2
        )}</pre
      >
      <pre>${JSON.stringify(Array.from(requestedHashes))}</pre>
      <pre>${JSON.stringify(state)}</pre>
    `;
  }
);

// setTimeout(
autorun(function mainLoop() {
  const state = open(startSha) as any;
  render(template(state), document.getElementById("approot")!);
});
// 5000
// );

console.log("started", Date.now());

document.body.addEventListener(
  "mousemove",
  action((e: MouseEvent) => {
    state.x = e.clientX;
    state.y = e.clientY;
  })
);
