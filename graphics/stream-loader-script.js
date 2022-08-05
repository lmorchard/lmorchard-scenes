const BORDER = { w: 125, h: 80 };
const NUM_LAYERS = 2;
const COLOR_TIME_RANGE = { min: 750, max: 3000 };
const BAR_HEIGHT_RANGE = { min: 10, max: 100 };
const DY_RANGE = { min: 0.01, max: 0.1 };
const MAX_STATUS_TIME = 7 * 1000;
const UPDATE_PERIOD = 1000 / 30;

let content, canvas, ctx;
let updateTimer, lastUpdate, currStatusTime;
let particles, bgParticle;
let currTimer, maxTimer;
let endMessage;

function init() {
  const urlParams = new URLSearchParams(window.location.search);
  endMessage = urlParams.get("end") || null;
  maxTimer = 1000 * (parseInt(urlParams.get("timer")) || 600);

  if (endMessage) {
    document.body.classList.remove("timer");
    document.body.classList.add("end");
    $$("endMessage").innerHTML = endMessage;
  }
  
  $$("title").innerHTML = urlParams.get("title") || "Now loading...";
  
  currTimer = 0;
  currStatusTime = 0;
  
  content = $$("content");
  canvas = $$("main");
  ctx = canvas.getContext("2d");
  resize();
  
  initParticles();
  pickStatusMessage();
  
  lastUpdate = Date.now();
  setTimeout(update, UPDATE_PERIOD);
  window.requestAnimationFrame(draw);
  clean();
}

function update() {
  const currentUpdate = Date.now();
  const deltaT = currentUpdate - lastUpdate;
  lastUpdate = currentUpdate;

  currTimer += deltaT;
  particles.forEach(particle => updateParticle(particle, deltaT));

  updateStatusMessage(deltaT);
  
  setTimeout(update, UPDATE_PERIOD);  
}

function draw() {
  resize();

  $$("timer").innerHTML = formatTimer(Math.max(0.0, maxTimer - currTimer));
  
  $$("statusMessage").style.opacity = `${Math.min(1.0, 0.1 + Math.abs(Math.sin(currTimer / 1000)))}`;
  
  bgParticle.h = canvas.height;

  content.style.marginLeft =
    content.style.marginRight = `${BORDER.w}px`;
  content.style.marginTop =
    content.style.marginBottom = `${BORDER.h}px`;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  particles.forEach(particle => drawParticle(particle, ctx));

  ctx.clearRect(BORDER.w, BORDER.h, canvas.width - BORDER.w * 2, canvas.height - BORDER.h * 2);
  
  window.requestAnimationFrame(draw); 
}

function resize() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}

function clean() {
  particles = particles.filter(particle => particle.live);
  setTimeout(clean, 1000);
}

function pickStatusMessage() {
  document.getElementById("statusMessage").innerHTML = pick(statusMessages);
}

function updateStatusMessage(deltaT) {
  currStatusTime += deltaT;
  if (currStatusTime >= MAX_STATUS_TIME) {
    currStatusTime = 0;
    pickStatusMessage();
  }
}

function initParticles() {
  particles = [];
  
  bgParticle = createParticle({ direction: 0 });
  particles.push(bgParticle);

  for (let cnt = 0; cnt < NUM_LAYERS; cnt++) {
    let y = 0;
    let direction = 1;
    while (y < canvas.height) {
      direction = 0 - direction;
      const particle = createParticle({ direction });
      particle.y = y;
      y += particle.h;
      particles.push(particle);
    }  
  }
}

const createParticle = (props = {}) => Object.assign({
  live: true,
  color: null,
  prevColor: pickColor(), 
  nextColor: pickColor(),
  maxColorTime: pickRange(COLOR_TIME_RANGE),
  colorTime: 0,
  y: 0,
  direction: 1,
  dy: pickRange(DY_RANGE),
  h: pickRange(BAR_HEIGHT_RANGE),
}, props);

function spawnParticle(props) {
  const particle = createParticle(props);
  particle.y = particle.direction > 0
    ? 0 - particle.h
    : canvas.height + particle.h;
  particles.push(particle);
}

function updateParticle(particle, deltaT) {
  if (!particle.live) { return; }
  
  particle.colorTime += deltaT;  
  if (particle.colorTime >= particle.maxColorTime) {
    particle.colorTime = 0;
    particle.maxColorTime = pickRange(COLOR_TIME_RANGE);
    particle.prevColor = particle.color = particle.nextColor;
    particle.nextColor = pickColor();
  }
  
  particle.y += particle.direction * particle.dy * deltaT;
  if (
    (particle.direction < 0 && particle.y <= 0 - particle.h) ||
    (particle.direction > 0 && particle.y >= canvas.height + particle.h)
  ) {
    spawnParticle({ direction: particle.direction });
    particle.live = false;
  }

  particle.color = lerpColor(
    particle.prevColor,
    particle.nextColor,
    particle.colorTime / particle.maxColorTime
  );  
}

function drawParticle(particle, ctx) {
  if (!particle.live || !particle.color) { return; }
  
  ctx.fillStyle = rgbaCSS(particle.color);
  ctx.fillRect(0, particle.y, canvas.width, particle.h);
}

const $$ = id => document.getElementById(id);

const pick = arr => arr[Math.floor(Math.random() * arr.length)];

const pickColor = () => [
  ...pick(Object.values(colors)),
  0.3 + 0.7 * Math.random()
];

const pickRange = ({ min, max }) => min + Math.random() * (max - min);

const lerp = (v0, v1, t) => v0 * (1 - t) + v1 * t;

const lerpColor = (c0, c1, t) =>
  c0.map((c, idx) => lerp(c0[idx], c1[idx], t));

const rgbaCSS = ([r, g, b, a = 1.0]) => `rgba(${r}, ${g}, ${b}, ${a})`;

const timerFactors = [ 1000, 60 * 1000, 60 * 60 * 1000 ];

const formatTimer = duration => {
  var milliseconds = parseInt((duration%1000)/100)
      , seconds = parseInt((duration/1000)%60)
      , minutes = parseInt((duration/(1000*60))%60)
      , hours = parseInt((duration/(1000*60*60))%24);

  hours = (hours < 10) ? "0" + hours : hours;
  minutes = (minutes < 10) ? "0" + minutes : minutes;
  seconds = (seconds < 10) ? "0" + seconds : seconds;

  return hours + ":" + minutes + ":" + seconds + "." + milliseconds;  
};

const colors = Object
  .entries({
    // http://unusedino.de/ec64/technical/misc/vic656x/colors/
    black: "#000000",
    white: "#FFFFFF",
    red: "#68372B",
    cyan: "#70A4B2",
    purple: "#6F3D86",
    green: "#588D43",
    blue: "#352879",
    yellow: "#B8C76F",
    orange: "#6F4F25",
    brown: "#433900",
    ltred: "#9A6759",
    dkgrey: "#444444",
    grey: "#6C6C6C",
    ltgreen: "#9AD284",
    ltblue: "#6C5EB5",
    ltgrey: "#959595",    
  })
  .reduce((acc, [ name, hex ]) => Object.assign({}, acc, {
    [name]: [
      parseInt(hex.substr(1, 2), 16),
      parseInt(hex.substr(3, 2), 16),
      parseInt(hex.substr(5, 2), 16),
    ]
  }), {});

const statusMessages = [
  "Brewing an espresso.",
  "Refilling my water bottle.",
  "Muting my phone.",
  "Petting a cat.",
  "Decrunching.",
  "Re-decrunching.",
  "Hyperventilating.",
  "Rehydrating.",
  "Dehydrating.",
  "Respawning.",
  "Reticulating splines.",
  "Scanning, taping, filing, instantly checking.",
  "Stopping all the downloading.",
  "Blowing on the cartridge.",
];

init();