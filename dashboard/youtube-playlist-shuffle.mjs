window.addEventListener('DOMContentLoaded', (event) => {
  console.log("YTPS READY.");
});

const $ = id => document.getElementById(id);
const $$ = (sel, node = document) => node.querySelector(sel);
const $$$ = (sel, node = document) => node.querySelectorAll(sel);

const controlId = uid => `player-${uid}`;

function getOrCreateControl({ uid }) {
  const eid = controlId(uid);
  let el = $(eid);
  if (!el) {
    el = document.createElement('player-control');
    el.id = eid;
    el.uid = uid;
    $("player-controls").appendChild(el);
  }
  return el;
}

nodecg.listenFor("load", (data) => {
  getOrCreateControl(data);
});

nodecg.listenFor("unload", (data) => {
  const el = getOrCreateControl(data);
  if (el) el.remove();
});

nodecg.listenFor("ping", (data) => {
  const el = getOrCreateControl(data);
  const { info } = data;
  Object.assign(el, {
    lastPing: Date.now(),
    playerInfo: info,
  })
});

nodecg.listenFor("update", (data) => {
  const el = getOrCreateControl(data);
  const { info, state, stateName } = data;
  Object.assign(el, {
    lastPing: Date.now(),
    playerInfo: info,
    state,
    stateName,
  })
});

class PlayerControlElement extends HTMLElement {
  constructor() {
    self = super();
    this.props = {};
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = html`
      <div>
        Player <span class="uid"></span>
        <br>
        <button class="play">Play</button>
        <button class="pause">Pause</button>
        <button class="next">Next</button>
        <button class="shuffle">Shuffle</button>
        <br>
        <span class="title"></span> (<span class="stateName"></span>)
      </div>
    `;
    this.$$(".play").addEventListener("click", () => this.play());
    this.$$(".pause").addEventListener("click", () => this.pause());
    this.$$(".next").addEventListener("click", () => this.next());
    this.$$(".shuffle").addEventListener("click", () => this.shuffle());
  }
  connectedCallback() {
    this.render();
  }
  $$(sel) {
    return $$(sel, this.shadowRoot);
  }
  setProp(name, value) {
    this.props[name] = value;
    this.render();
  }
  set uid(newValue) {
    this.setProp("uid", newValue);
  }
  set lastPing(newValue) {
    this.setProp("lastPing", newValue);
  }
  set playerInfo(newValue) {
    this.setProp("playerInfo", newValue);
  }
  set stateName(newValue) {
    this.setProp("stateName", newValue);
  }
  attributeChangedCallback(name, oldValue, newValue) {
    this.render();
  }
  render() {
    const root = this.shadowRoot;
    const { uid, lastPing, playerInfo, stateName } = this.props;

    this.$$(".uid").innerHTML = uid;
    if (playerInfo) {
      const { videoData } = playerInfo;
      if (videoData) {
        const { title } = videoData;
        this.$$(".title").innerHTML = title;
      }
    }
    this.$$(".stateName").innerHTML = stateName;
  }
  play() {
    nodecg.sendMessage("videoPlay", { uid: this.props.uid });
  }
  pause() {
    nodecg.sendMessage("videoPause", { uid: this.props.uid });
  }
  next() {
    nodecg.sendMessage("videoNext", { uid: this.props.uid });
  }
  shuffle() {
    nodecg.sendMessage("videoRandom", { uid: this.props.uid });
  }
}
customElements.define("player-control", PlayerControlElement);

const html = (strings, ...values) =>
  strings.reduce(
    (result, string, idx) =>
      result
      + string
      + (values[idx] ? values[idx] : ""),
    ""
  );