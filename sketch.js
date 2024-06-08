let font;
let cam;

// Dat.gui
let gui;
let params;

// Objects and samples
let objs = [];
let samples = [];

// Range for the sound and the world
let range = {};

// Sound objects
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
    // Update panner position
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

// Camera
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
    audio: 10,
    world: width,
  };

  // Create an array of samples
  samples = [
    './assets/ambient/bass.mp3',
    './assets/ambient/drum.mp3',
    './assets/ambient/drum1.mp3',
    './assets/ambient/drum2.mp3',
    './assets/ambient/hithat.mp3',
    './assets/ambient/synth.mp3',
  ];

  // GUI
  gui = new dat.GUI();
  params = {
    playSounds: false,
    objsCount: 6,
  };
  gui.add(params, 'playSounds').onChange(toggleSound);
  // gui.add(params, 'objsCount', 0, 10).step(1);
  objs = createObjs(params.objsCount, range.audio, samples, false);
}

function draw() {
  background(0);

  // Enable orbiting with the mouse.
  orbitControl(1, 1, 0.3);

  // Fix the camera at the center.
  // cam.setPosition(0, 0, 0);

  // Draw center sphere
  noFill();
  strokeWeight(.5);
  stroke(0, 255, 0);
  sphere(10);

  // Draw outer sphere
  stroke(100, 100, 100);
  sphere(range.world * 2);

  if (params.playSounds) {
    // Convert camera position to audio coordinates
    let camX = map(cam.eyeX, 0, range.world, 0, range.audio);
    let camY = map(cam.eyeY, 0, range.world, 0, range.audio);
    let camZ = map(cam.eyeZ, 0, range.world, 0, range.audio);
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
    x = map(x, 0, range.audio, 0, range.world);
    y = map(y, 0, range.audio, 0, range.world);
    z = map(z, 0, range.audio, 0, range.world);

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