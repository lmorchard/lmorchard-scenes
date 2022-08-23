import { BaseElement, html, createElement, $, $$ } from "../web_modules/dom.js";

const MAX_CONTROLLER_PING_AGE = 10000;
const CONTROLLER_CLEANUP_PERIOD = 5000;

window.addEventListener('DOMContentLoaded', (event) => {
  setInterval(cleanupDefunctControllers, CONTROLLER_CLEANUP_PERIOD);
});

function getOrCreateControl({ uid }) {
  const eid = `player-${uid}`;
  let el = $(`#${eid}`);
  if (!el) {
    const { youtubeShufflePlaylists = {} } = nodecg.bundleConfig;
    el = Object.assign(
      createElement('player-control'),
      { id: eid, uid, lastPing: Date.now(), playlistChoices: youtubeShufflePlaylists }
    )
    $("#player-controls").appendChild(el);
  }
  return el;
}

function cleanupDefunctControllers() {
  for (const el of $$("#player-controls player-control")) {
    if (!el.lastPing || Date.now() - el.lastPing < MAX_CONTROLLER_PING_AGE) continue;
    el.remove();
  }
}

nodecg.listenFor("ytshuffle.load", (data) => {
  getOrCreateControl(data);
});

nodecg.listenFor("ytshuffle.unload", (data) => {
  const el = getOrCreateControl(data);
  if (el) el.remove();
});

nodecg.listenFor("ytshuffle.ping", (data) => {
  const el = getOrCreateControl(data);
  const { info } = data;
  Object.assign(el, {
    lastPing: Date.now(),
    playerInfo: info,
    playlistId: info.playlistId,
  })
});

nodecg.listenFor("ytshuffle.update", (data) => {
  const el = getOrCreateControl(data);
  const { info, state, stateName } = data;
  Object.assign(el, {
    lastPing: Date.now(),
    playerInfo: info,
    playlistId: info.playlistId,
    state,
    stateName,
  })
});

class PlayerControlElement extends BaseElement {
  static template = html`
    <div>
      <div style="margin: 0.25em 0">
        <button class="play">▶️</button>
        <button class="pause">⏸️</button>
        <button class="next">⏭️</button>
        <button class="shuffle">🔀</button>
        <span class="uid"></span>
        <span class="playState"></span>
      </div>
      <div style="margin: 0.25em 0">
        <select class="playlists"></select>
        <button class="loadPlaylist">⬆️</button>
      </div>
      <p class="title" style="font-size: 0.8em; margin: 1em 1em;"></p>
    </div>
  `;

  static get observedProperties() {
    return ["uid", "lastPing", "playerInfo", "stateName", "playlistId", "playlistChoices"];
  }

  connectedCallback() {
    const self = this;
    const { uid } = this;
    this.updateElements({
      ".play": { ">click": () => nodecg.sendMessage("ytshuffle.play", { uid }) },
      ".pause": { ">click": () => nodecg.sendMessage("ytshuffle.pause", { uid }) },
      ".next": { ">click": () => nodecg.sendMessage("ytshuffle.next", { uid }) },
      ".shuffle": { ">click": () => nodecg.sendMessage("ytshuffle.random", { uid }) },
      ".loadPlaylist": {
        ">click": () => {
          const playlistId = self.$(".playlists").value;
          nodecg.sendMessage("ytshuffle.loadplaylist", { uid, playlistId });
        }
      }
    });
  }

  propChanged_playlistChoices(newValue) {
    this.updateElements({
      ".playlists": {
        "children": Object
          .entries(newValue)
          .map(([playlistId, description]) => createElement("option", {
            value: playlistId,
            textContent: description,
            selected: playlistId === this.playlistId,
          }))
      },
    });
  }

  propChanged_playlistId(newValue) {
    this.updateElements({
      ".playlists": { value: newValue }
    });
  }

  render() {
    const { uid, lastPing, playerInfo, stateName, playlistChoices } = this.props;
    const title = playerInfo && playerInfo.videoData && playerInfo.videoData.title;

    const playStateIcon = {
      "unstarted": "⛔",
      "ended": "🔚",
      "playing": "▶️",
      "paused": "⏸️",
      "buffering": "💭",
      "cued": "🤔",
    };

    this.updateElements({
      ".uid": uid,
      ".lastPing": lastPing,
      ".playState": playStateIcon[stateName] || stateName,
      ".title": title,
    });
  }
}

customElements.define("player-control", PlayerControlElement);
