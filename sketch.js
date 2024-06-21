/*
Notes:
---
The system only work for positive z values at the moment. When z is negative we would have to deal with camera orientation but it is not working for now. See the createObjs function.
*/


// P5 vars
let font;
let cam;

// Dat.gui
let gui;
let params;

// Objects and samples
let objs = [];
let samples = [];
let samplesList;

// Sound objects Class
class SoundObject {
  constructor(coords, url, autostart) {
    this._coords = coords;
    this.url = url;
    this.panner = this.createPanner();
    this.player = this.createPlayer();
    // this.player.autostart = autostart || false;
  }

  createPanner() {
    return new Tone.Panner3D({
      panningModel: 'HRTF',
      positionX: this._coords.x,
      positionY: this._coords.y,
      positionZ: this._coords.z,
    }).toDestination();
  }

  createPlayer() {
    return new Tone.Player({ url: this.url, loop: true }).connect(this.panner);
  }

  update() {
    this.panner.positionX.value = this._coords.x;
    this.panner.positionY.value = this._coords.y;
    this.panner.positionZ.value = this._coords.z;
  }

  get coords() {
    return this._coords;
  }

  set coords(coords) {
    this._coords = coords;
  }
}

// Camera functions
function setListenerOrientation(vector) {
  Tone.Listener.forwardX.value = vector.x;
  Tone.Listener.forwardY.value = vector.y;
  Tone.Listener.forwardZ.value = vector.z;
}

function getCameraOrientation() {
  return {
    x: cam.upX,
    y: cam.upY,
    z: cam.upZ,
  };
}

// Create an array of objects at random positions
function createObjs(count, range, samples, autostart) {
  let objs = [];
  // Create a new array of objects
  for (let i = 0; i < count; i++) {
    const coord = {
      x: random(-range, range),
      y: random(-range, range),
      z: random(0, range),
    };
    objs.push(new SoundObject(coord, samples[i % samples.length], autostart));
  }
  return objs;
}

// Load samples list
async function loadSamplesList(filePath) {
  try {
    const response = await fetch(filePath);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error loading JSON file:', error);
  }
}

// Get prefix from sample path
function getSamplePrefix(samplePath) {
  return samplePath.split('/').slice(-1)[0].split('_')[0];
}

// Select samples
function selectSamples(count = 1, samplesList) {
  let samples = [];

  // Take only 1 Gitarre OR 1 Klavier OR 1 Weitere
  let prefix = null;
  do {
    const n = int(random(0, samplesList.length - 1));
    prefix = getSamplePrefix(samplesList[n]);
    samples[0] = samplesList[n];
  } while (prefix != 'Gitarre' && prefix != 'Klavier' && prefix != 'Weitere');

  // Randomly select the other samples
  while (samples.length < count) {
    const n = int(random(0, samplesList.length - 1));
    prefix = getSamplePrefix(samplesList[n]);
    if (prefix != 'Gitarre' && prefix != 'Klavier' && prefix != 'Weitere') {
      samples.push(samplesList[n]);
    }
  }

  return samples;
}

// P5 functions
function preload() {
  font = loadFont('./assets/inconsolata.ttf');
}

function setup() {
  // Create the canvas and camera
  createCanvas(windowWidth, windowHeight, WEBGL);
  cam = createCamera();
  cam.perspective(8);

  // Range for the sound and the world
  range = {
    audio: 15,
    world: width,
  };

  // GUI
  gui = new dat.GUI();

  // All the parameters for the sketch
  params = {
    playSounds: false,
    objsCount: 10,
    rangeAudio: 15,
    rangeWorld: width,
  };

  // Add the parameters to the GUI
  gui.add(params, 'playSounds').onChange(toggleSound);
  gui.add(params, 'rangeAudio', 5, 20).step(0.1);
  // gui.add(params, 'objsCount', 0, 10).step(1);

  // Create an array of samples
  loadSamplesList('./assets/samples.json').then((data) => {
    console.log(data);

    samplesList = data;
    samples = selectSamples(params.objsCount, samplesList['samples']);

    console.log(samples);

    // Create an array of objects
    objs = createObjs(params.objsCount, rangeAudio, samples, false);
  });
}

function draw() {
  background(0);

  // Enable orbiting with the mouse.
  orbitControl(1, 1, 0.3);

  // Draw a sphere at the center
  noFill();
  strokeWeight(0.5);
  stroke(0, 255, 0);
  sphere(10);

  // Draw outer sphere
  stroke(100, 100, 100);
  sphere(rangeWorld * 2);

  if (objs.length === 0) {
    return;
  }

  if (params.playSounds) {
    // Convert camera position to audio coordinates
    let camX = map(cam.eyeX, 0, rangeWorld, 0, rangeAudio);
    let camY = map(cam.eyeY, 0, rangeWorld, 0, rangeAudio);
    let camZ = map(cam.eyeZ, 0, rangeWorld, 0, rangeAudio);
    // Update listener position
    Tone.Listener.positionX.value = camX;
    Tone.Listener.positionY.value = camY;
    Tone.Listener.positionZ.value = camZ;
    // Set listener orientation (not needed since camera orientation is fixed)
    setListenerOrientation(getCameraOrientation());
  }

  stroke(255, 0, 0);

  for (let i = 0; i < params.objsCount; i++) {
    const obj = objs[i];

    let { x, y, z } = obj.coords;

    // Convert coordinates to world coordinates
    x = map(x, 0, rangeAudio, 0, rangeWorld);
    y = map(y, 0, rangeAudio, 0, rangeWorld);
    z = map(z, 0, rangeAudio, 0, rangeWorld);

    // Draw the object
    push();
    translate(x, y, z);
    sphere(20, 8);
    pop();
  }

  // calculate the FPS
  fps = round(frameRate());
  textSize(16);
  fill(0);
  textFont(font);
  text(`FPS: ${fps}`, 0, -15);
}

function keyPressed() {
  if (key === 's') {
    toggleSound();
  }
}

function toggleSound() {
  Tone.getContext().resume();
  soundIsPlaying() ? stopAllSounds() : startAllSounds();
}

function startAllSounds() {
  objs.forEach((obj) => {
    obj.player.start();
  });
}

function stopAllSounds() {
  objs.forEach((obj) => {
    obj.player.stop();
  });
}

function soundIsPlaying() {
  return objs.some((obj) => obj.player.state === 'started');
}
