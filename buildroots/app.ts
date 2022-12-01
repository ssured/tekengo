import { html, render } from "lit-html";
import { action, autorun, observable, observe } from "mobx";
import { computedFn } from "mobx-utils";
import { knownObjects, loadJSON, open, requestedHashes } from "../merkledag";
import "../styling";
import { sha256 } from "../utils/sha256";
import full from "../db/full";

const byId = Object.fromEntries(full.map((item) => [item.id, item]));

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
  }
});

const rootHash = observable.box(
  sessionStorage.start ||
    (sessionStorage.start = loadJSON({
      today: {
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        day: new Date().getDate(),
      },
      x: 0,
      y: 0,
      byId,
    }))
);

type rootState = {
  prev?: rootState;
  today: { year: number; month: number; day: number };
  x: number;
  y: number;
  byId: typeof byId;
};

const explore = computedFn((node: any) => {
  return html`${typeof node} ${Array.isArray(node)}
    <pre>
${JSON.stringify(
        // [...new Set(Object.values(node).map((item) => item.type))],
        [...Object.keys(node)],
        null,
        2
      )}</pre
    > `;
});

const template = computedFn((state: ReturnType<typeof getState>) => {
  const { today, _, __ } = state;
  const { x = 0, y = 0 } = state;
  // console.log({ today, p: (today as any)?.[PATH] });

  return html`
    ${explore(state.byId)}
    <h3>Prev: ${state.prev?.today?.year}</h3>

    <h1>
      ${today?.year}
      <input
        type="number"
        value=${"" + today?._.year}
        @change=${(e: Event & { target: HTMLInputElement }) =>
          today
            ? (today._.year = e.target.valueAsNumber)
            : console.log("no today")}
      />${today?._.year} ${x},${_.x}
    </h1>

    <input
      type="number"
      value=${"" + today?._.year}
      @change=${(e: Event & { target: HTMLInputElement }) =>
        today
          ? (today._.year = e.target.valueAsNumber)
          : console.log("no today")}
    />

    <button @click=${() => _.x++}>${x}</button>

    <pre>__=${JSON.stringify(__)}</pre>

    <button @click=${() => __ && updateState(__)} ?disabled=${!__}>
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
