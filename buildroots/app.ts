import { html, render } from "lit-html";
import { action, computed, autorun, observable, observe } from "mobx";
import { computedFn } from "mobx-utils";
import "../styling";
import {
  encodeObject,
  knownObjects,
  loadJSON,
  open,
  requestedHashes,
  stableStringify,
  nextObjects,
  PATHS,
} from "../merkledag";
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
  sessionStorage.start ||
    (sessionStorage.start = loadJSON(
      stableStringify(
        encodeObject({
          today: {
            year: new Date().getFullYear(),
            month: new Date().getMonth() + 1,
            day: new Date().getDate(),
          },
          x: 0,
          y: 0,
        })
      )
    ))
);

const nextSha = computed(
  () => nextObjects[rootHash.get()] as string | undefined
);

const persist = action(() => {
  const next = nextSha.get();
  if (!next) return;
  delete nextObjects[rootHash.get()];
  rootHash.set(next);
  sessionStorage.start = next;
});

const template = computedFn(
  (state: {
    today?: { year: number; month: number; day: number };
    x?: number;
    y?: number;
  }) => {
    const { today } = state;
    const { x = 0, y = 0 } = state;

    return html`
      <pre>state: ${typeof state} ${JSON.stringify({ ...state })}</pre>
      <pre>paths: ${today && JSON.stringify((today as any)[PATHS])}</pre>
      <h1>${today?.year} ${x},${y}</h1>
      <input
        type="number"
        value=${"" + today?.year}
        @change=${(e: Event & { target: HTMLInputElement }) => (
          console.log(
            "change",
            e.target.valueAsNumber,
            typeof state.today,
            state.today
          ),
          state.today
            ? (state.today.year = e.target.valueAsNumber)
            : console.log("no today")
        )}
      />
      <button @click=${() => (state.x = x + 1)}>${x}</button>
      <button @click=${() => persist()}>Save ${nextSha.get() || "-"}</button>
      <pre>${JSON.stringify(Array.from(requestedHashes))}</pre>
      <pre>${JSON.stringify(nextObjects)}</pre>
      <pre>${JSON.stringify(state)}</pre>
    `;
  }
);

// setTimeout(
autorun(function mainLoop() {
  const state = open(rootHash.get()) as any;
  render(template(state), document.getElementById("approot")!);
});
// 5000
// );

console.log("started", Date.now());

// document.body.addEventListener(
//   "mousemove",
//   action((e: MouseEvent) => {
//     state.x = e.clientX;
//     state.y = e.clientY;
//   })
// );
