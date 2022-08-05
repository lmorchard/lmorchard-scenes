var player;
var playlistArray;
var playListArrayLength;
var maxNumber;
var playlistId;
var urlParams;
var uid;

var pingTimer;

const PING_INTERVAL = 5000;

function main() {
  urlParams = new URLSearchParams(window.location.search);
  uid = urlParams.get("uid") || genuid();
  playlistId = urlParams.get('list') || 'PLDUwhtLxLHMBrQgt3S56GDCtwEbZ57RBe';

  setupPlayer(playlistId);

  const onlyThisPlayer = (cb) => (data) => {
    if (player && data.uid === uid) return cb(data);
  }
  nodecg.listenFor("ytshuffle.play", onlyThisPlayer(() => player.playVideo()));
  nodecg.listenFor("ytshuffle.pause", onlyThisPlayer(() => player.pauseVideo()));
  nodecg.listenFor("ytshuffle.next", onlyThisPlayer(() => player.nextVideo()));
  nodecg.listenFor("ytshuffle.random", onlyThisPlayer(() => playRandomVideo()));
  nodecg.listenFor("ytshuffle.loadplaylist", onlyThisPlayer(({ playlistId }) => {
    player.stopVideo();
    player.loadPlaylist({
      list: playlistId,
      listType: "playlist"
    });
    setTimeout(() => playRandomVideo(), 500);
  }));

  nodecg.sendMessage("ytshuffle.load", { uid });
  pingTimer = window.setInterval(ping, PING_INTERVAL);
}

function setupPlayer(playlistId) {
  player = new YT.Player('player', {
    playerVars: { autoplay: 1, controls: 0 },
    width: urlParams.get('width') || '640',
    height: urlParams.get('height') || '480',
    events: {
      onStateChange: onPlayerStateChange,
      onReady: (event) => {
        player.loadPlaylist({
          listType: 'playlist',
          list: playlistId,
        });
        player.setShuffle(true);
      },
    },
  });
}

function playRandomVideo() {
  playlistArray = player.getPlaylist();
  playListArrayLength = playlistArray.length;
  maxNumber = playListArrayLength;
  NewNumber = newRandomNumber();
  player.playVideoAt(newRandomNumber());
}

function genuid() {
  return (performance.now().toString(36) + Math.random().toString(36)).replace(/\./g, "");
};

function getPlayerInfo() {
  return player ? player.playerInfo : null;
}

function ping() {
  nodecg.sendMessage("ytshuffle.ping", { uid, info: getPlayerInfo() });
}

function unload() {
  if (pingTimer) {
    cancelInterval(pingTimer);
    pingTimer = null;
  }
  nodecg.sendMessage("ytshuffle.unload", { uid });
}

var firstLoad = true;

const playState = {
  "-1": "unstarted",
  "0": "ended",
  "1": "playing",
  "2": "paused",
  "3": "buffering",
  "5": "cued",
};

function onPlayerStateChange(event) {
  const stateName = playState["" + event.data];
  const info = getPlayerInfo();
  nodecg.sendMessage("ytshuffle.update", { uid, state: event.data, stateName, info });

  if (event.data == YT.PlayerState.ENDED) {
    player.playVideoAt(newRandomNumber());
  } else {
    if (firstLoad && event.data == YT.PlayerState.PLAYING) {
      firstLoad = false;
      playRandomVideo();
    }
    if (event.data == YT.PlayerState.PLAYING) {
      if (info) {
        const { videoData, videoUrl } = info;
        if (videoData) {
          const { title } = videoData;
          document.getElementById("caption").textContent = title;
          nodecg.sendMessageToBundle('twitch.chat.say', 'twitch-connect', {
            message: `Now playing: ${title} ${videoUrl}`
          });
        }
      }
    }
  }
}

var oldNumber = 0;
var NewNumber = 0;
function newRandomNumber() {
  oldNumber = NewNumber;
  NewNumber = Math.floor(Math.random() * maxNumber);
  if (NewNumber == oldNumber) {
    newRandomNumber();
  } else {
    return NewNumber;
  }
}

Object.assign(window, { main, unload });
