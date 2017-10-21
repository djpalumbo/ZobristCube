var renderer;
var scene;
var camera;
var light, amb;

var controls;

var raycaster;
var mouse;
var intersects;
var current;

var level = [];

var plane;

var pieces = [];
var scale = 4;
var space = 2*scale;
var delta = 0.015625; // Ground distance pad for correct shadows

var help = false, helpRest = false;

var colors = [];


function createPieces(lvl)
{
  var pieceList = parseLevelPcs(level[lvl].pcs);

  for (var i = 0; i < pieceList.length; i++)
  {
    addPiece(pieceList[i], i*2*space - 6*space, i*2*space - 6*space);
  }
}

function addPiece(piece, x, z)
{
  var loader = new THREE.OBJLoader();

  var mat = new THREE.MeshStandardMaterial({color: colors[piece], opacity: 0.75,
    transparent: true});

  loader.load("models/" + piece + ".obj", function (object)
    {
      pieces.push(object);
      object.scale.set(scale, scale, scale);
      object.position.y = scale + delta;
      object.position.x = x;
      object.position.z = z;

      object.name = piece;

      // Note: object.children[0] is the THREE.Mesh
      object.children[0].material = mat;
      object.children[0].castShadow = true;
      object.children[0].receiveShadow = true;

      scene.add(object);
    });
}

function initGame()
{
  scene = new THREE.Scene();

  createPlane();

  populateLevels();
  buildLevel(0); // Testing on easiest level for now...

  setupCamera();
  setupRenderer();
  addLight();

  createControls();
  setupRaycaster();

  //loadSounds();
  //playMusic()

  document.getElementById("game").appendChild(renderer.domElement);

  render();
}

function setupRaycaster()
{
  renderer.domElement.addEventListener('mousemove', onMouseMove, false);
  renderer.domElement.addEventListener('mousedown', onDocumentMouseDown, false);
  renderer.domElement.addEventListener('mouseup', onDocumentMouseUp, false);

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  // Set initial position not at origin
  mouse.x = mouse.y = -1;
}

function render()
{
  keyboardControls();

  if (!helpRest)
  {
    setTimeout(function () { helpMenu(); helpRest = false; }, 100);
    helpRest = true;
  }

  raycaster.setFromCamera(mouse, camera);

  intersects = raycaster.intersectObjects(pieces, true);

  if (intersects.length > 0)
  {
    if (current != intersects[0].object)
    {
      if (current) // Set features back to normal when not looking at it
        current.material.transparent = true;

      current = intersects[0].object;
    }
    else // Make selected piece noticeable
      current.material.transparent = false;
  }
  else if (current) // Set features back to normal when not looking at anything
  {
    current.material.transparent = true;
    current = null;
  }

  requestAnimationFrame(render);
  renderer.render(scene, camera);
}

function onMouseMove(event)
{
  // Calculate mouse position in normalized device coordinates
  //  (-1 to +1) for both components
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onDocumentMouseDown(event)
{
}

function onDocumentMouseUp(event)
{
}

function setupRenderer()
{
  renderer = new THREE.WebGLRenderer();
  renderer.setClearColor(0x000000, 1.0);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
}

function addLight()
{
  light = new THREE.SpotLight();

  light.intensity = 0.75;

  light.shadow.cameraNear = 10;
  light.shadow.cameraFar = 100;
  light.castShadow = true;
  light.shadow.mapSize.width = 2048;
  light.shadow.mapSize.height = 2048;

  light.position.set(0, 50, 0);

  scene.add(light);


  amb = new THREE.AmbientLight();
  amb.intensity = 0.15;

  scene.add(amb);
}

function createPlane()
{
  var width  = 30*scale;
  var height = 30*scale;

  var planeColor = 0x4BD121;

  plane = new THREE.Mesh(new THREE.PlaneGeometry(width, height, 10, 10),
                         new THREE.MeshLambertMaterial({color: planeColor}));

  plane.receiveShadow = true;

  plane.rotation.x = -Math.PI/2;
  scene.add(plane);
}

function setupCamera()
{
  camera = new THREE.PerspectiveCamera(45,
    window.innerWidth / window.innerHeight, 0.1, 1000);

  camera.rotation.x = (Math.PI / 2);
  camera.position.set(-45, 100, 75);
}

function createControls()
{
  controls = new THREE.OrbitControls(camera);
  // To disable:
  //   controls.enabled = false;
}

function keyboardControls()
{
  // Show help menu
  if (Key.isDown(Key.H))
    if (!helpRest) { help = !help; }
}

function populateLevels()
{
  level.push({pcs: "drstuv2", l: 3, w: 3, h: 3, solns: 1056});
}

function parseLevelPcs(pcs)
{
  // This is a simple function now, using each index of the pcs string to
  //  identify the correct pieces. However, the parsing job becomes slightly
  //  more complicated later on in the codebook when it starts referring to
  //  the sets of 4- or 5-polycubes using '-' or '+' characters.

  var pieceList = [];

  for (var i = 0; i < pcs.length; i++)
    pieceList.push(pcs.charAt(i));

  return pieceList;
}

function buildLevel(lvl)
{
  populateColors();
  createPieces(lvl);
}

function populateColors()
{
  colors["a"] = "red";
  colors["j"] = "red";
  colors["l"] = "red";
  colors["m"] = "red";
  colors["o"] = "red";

  colors["f"] = "blue";
  colors["g"] = "blue";
  colors["h"] = "blue";
  colors["k"] = "blue";
  colors["n"] = "blue";

  colors["b"] = "yellow";
  colors["c"] = "yellow";
  colors["d"] = "yellow";
  colors["e"] = "yellow";
  colors["i"] = "yellow";

  colors["r"] = "green";
  colors["t"] = "green";
  colors["u"] = "green";

  colors["s"] = "tan";
  colors["v"] = "tan";
  colors["w"] = "tan";
  colors["z"] = "tan";
  colors["2"] = "tan";
  colors["1"] = "tan";
}

function helpMenu()
{
  if (help)
  {
    document.getElementById('help').innerHTML =
      "<br><u>Objective</u>"
      + "<br>Move the blocks so that they fit"
      + "<br>&nbsp&nbspinto the dimensions listed"
      + "<br>&nbsp&nbspat the top.</br>"

      + "<br><u>Controls</u>"
      + "<br>Left-click on a block to move it."
      + "<br>Left-click any other area to move"
      + "<br>&nbsp&nbspthe camera."
      + "<br>Use the scrollwheel to zoom.</br>"

      + "<br>Press H to close this help menu.";
  }
  else
    document.getElementById('help').innerHTML =
      "Press H to toggle the help menu";
}

