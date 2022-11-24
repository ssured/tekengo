import { html, render } from "lit-html";
import { action, autorun, observable, observe } from "mobx";
import { computedFn } from "mobx-utils";
import {
  knownObjects,
  loadJSON,
  open,
  PATH,
  requestedHashes,
  encodeValue,
} from "../merkledag";
import "../styling";
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

const rootHash = observable.box(
  sessionStorage.start
  // ||
  //   (sessionStorage.start = loadJSON({
  //     today: {
  //       year: new Date().getFullYear(),
  //       month: new Date().getMonth() + 1,
  //       day: new Date().getDate(),
  //     },
  //     x: 0,
  //     y: 0,
  //   }))
);

type rootState = {
  prev?: rootState;
  today: { year: number; month: number; day: number };
  x: number;
  y: number;
};

const template = computedFn((state: ReturnType<typeof getState>) => {
  const { today, _ } = state;
  const { x = 0, y = 0 } = state;
  // console.log({ today, p: (today as any)?.[PATH] });

  return html`
    <h3>Prev: ${state.prev?.today?.year}</h3>

    <h1>${today?.year} ${today?._.year} ${x},${state._.x}</h1>

    <input
      type="number"
      value=${"" + today?.year}
      @change=${(e: Event & { target: HTMLInputElement }) =>
        today
          ? (today._.year = e.target.valueAsNumber)
          : console.log("no today")}
    />

    <button @click=${() => state._.x++}>${x}</button>

    <button
      @click=${() => state.__ && updateState(state.__)}
      ?disabled=${!state.__}
    >
      SAVE STATE
    </button>
  `;
});

const getState = () => open<rootState>(rootHash.get());
const setState = (nextSha: string) => {
  rootHash.set(nextSha);
  sessionStorage.start = nextSha;
};

const updateState = action((nextValue: rootState) => {
  setState(
    loadJSON({
      ...nextValue,
      prev: getState(),
      date: new Date().toISOString(),
      author: "Sjoerd",
    })
  );
});

autorun(function mainLoop() {
  render(template(getState()), document.getElementById("approot")!);
});

console.log("started", Date.now());

// document.body.addEventListener(
//   "mousemove",
//   action((e: MouseEvent) => {
//     state.x = e.clientX;
//     state.y = e.clientY;
//   })
// );
