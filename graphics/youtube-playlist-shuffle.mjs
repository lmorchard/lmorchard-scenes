var player;
var playlistArray;
var playListArrayLength;
var maxNumber;
var playlistId;
var urlParams;
var uid;

var pingTimer;

function main() {
  uid = genuid();

  urlParams = new URLSearchParams(window.location.search);
  playlistId = urlParams.get('list') || 'PLDUwhtLxLHMBrQgt3S56GDCtwEbZ57RBe';

  player = new YT.Player('player', {
    playerVars: { autoplay: 1, controls: 0 },
    width: urlParams.get('width') || '640',
    height: urlParams.get('height') || '480',
    events: {
      onReady: (event) => {
        player.loadPlaylist({
          listType: 'playlist',
          list: playlistId,
        });
      },
      onStateChange: onPlayerStateChange,
    },
  });

  nodecg.listenFor("videoPlay", ({ uid: messageUid }) => {
    if (!player || messageUid !== uid) return;
    player.playVideo();
  });

  nodecg.listenFor("videoPause", ({ uid: messageUid }) => {
    if (!player || messageUid !== uid) return;
    player.pauseVideo();
  });

  nodecg.listenFor("videoNext", ({ uid: messageUid }) => {
    if (!player || messageUid !== uid) return;
    player.nextVideo();
  });

  nodecg.listenFor("videoRandom", ({ uid: messageUid }) => {
    if (!player || messageUid !== uid) return;
    playRandomVideo();
  });

  nodecg.sendMessage("load", { uid });
  pingTimer = window.setInterval(ping, 1000);
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
  nodecg.sendMessage("ping", { uid, info: getPlayerInfo() });
}

function unload() {
  nodecg.sendMessage("unload", { uid });
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
  nodecg.sendMessage("update", { uid, state: event.data, stateName, info });

  if (event.data == YT.PlayerState.ENDED) {
    player.playVideoAt(newRandomNumber());
  } else {
    if (firstLoad && event.data == YT.PlayerState.PLAYING) {
      firstLoad = false;
      playRandomVideo();
    }
    if (event.data == YT.PlayerState.PLAYING) {
      nodecg.sendMessageToBundle('twitch.chat.say', 'twitch-connect', {
        message: `Now playing: ${info.videoData.title}`
      });
    }
  }
}

Object.assign(window, { main, unload });
