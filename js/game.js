var renderer;
var scene;
var camera;
var light, amb;

var controls, cc = true;

var raycaster;
var mouse;
var intersects;
var hover;
var selection;

var level = [];
var currLvl;

var playArea = [];
var board;

var pieces = [];
var attr = [];
var scale = 4;
var space = 2*scale;

var mode = "M"; // "M" = movement, "R" = rotation

var w, w_, a, a_, s, s_, d, d_, spacebar, spacebar_, h, h_;
w_ = a_ = s_ = d_ = spacebar_ = h_ = false;

var help = false;


function deselectPiece()
{
  // Check whether or not position is valid (i.e. not halfway on/off board)

  selection = null;
}

function initGame()
{
  scene = new THREE.Scene();

  createTable();

  populateLevels();
  selectLevel();

  populateAttributes();
  buildLevel();

  setupCamera();
  addLight();

  setupRenderer();

  createControls();
  setupRaycaster();

  //loadSounds();
  //playMusic()

  document.getElementById("game").appendChild(renderer.domElement);

  render();
}

function render()
{
  helpMenu();
  updateInfoPane();

  keyboardControls();

  raycast();

  requestAnimationFrame(render);
  renderer.render(scene, camera);
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

  light.position.set(0, 100, 0);

  scene.add(light);


  amb = new THREE.AmbientLight();
  amb.intensity = 0.15;

  scene.add(amb);
}

function setupCamera()
{
  camera = new THREE.PerspectiveCamera(45,
    window.innerWidth / window.innerHeight, 0.1, 1000);

  camera.position.set(0, 150, 150);
}

function createControls()
{
  controls = new THREE.OrbitControls(camera);

  controls.enablePan = controls.enableKeys = false;
  controls.minAzimuthAngle = -Math.PI/2;
  controls.maxAzimuthAngle = Math.PI/2;
  controls.minDistance = 50;
  controls.maxDistance = 350;

  controls.target = new THREE.Vector3(0, scale + space*level[currLvl].y/2, 0);
}

function keyboardControls()
{
  // Certain controls are only active when a piece is selected
  if (selection)
  {
    // Toggle between movement and rotation modes
    if (Key.isDown(Key.SPACE)) spacebar = true;
    else spacebar = spacebar_ = false;

    if (spacebar && !spacebar_)
    {
      if (mode === "M") mode = "R"; else mode = "M";

      spacebar_ = true;
    }

    // Piece movements & rotations
    if (mode === "M")
    {
      if (Key.isDown(Key.W)) w = true; else w = w_ = false;
      if (Key.isDown(Key.A)) a = true; else a = a_ = false;
      if (Key.isDown(Key.S)) s = true; else s = s_ = false;
      if (Key.isDown(Key.D)) d = true; else d = d_ = false;

      if (w && !w_) { movePiece("FW"); w_ = true; }
      if (a && !a_) { movePiece("LF"); a_ = true; }
      if (s && !s_) { movePiece("BK"); s_ = true; }
      if (d && !d_) { movePiece("RT"); d_ = true; }
    }
    else if (mode === "R")
    {
      if (Key.isDown(Key.W)) w = true; else w = w_ = false;
      if (Key.isDown(Key.A)) a = true; else a = a_ = false;
      if (Key.isDown(Key.S)) s = true; else s = s_ = false;
      if (Key.isDown(Key.D)) d = true; else d = d_ = false;

      if (w && !w_) { rotatePiece("FW"); w_ = true; }
      if (a && !a_) { rotatePiece("LF"); a_ = true; }
      if (s && !s_) { rotatePiece("BK"); s_ = true; }
      if (d && !d_) { rotatePiece("RT"); d_ = true; }
    }

    // Deselect a selected piece
    if (Key.isDown(Key.ESC))
    {
      var currSel = selection;
      deselectPiece();

      if (!selection)
        currSel.material.transparent = true;
    }
  }

  // Show help menu
  if (Key.isDown(Key.H)) h = true; else h = h_ = false;
  if (h && !h_) { help = !help; h_ = true; }
}

function setupRaycaster()
{
  renderer.domElement.addEventListener('mousemove', onMouseMove, false);
  renderer.domElement.addEventListener('mousedown', onDocumentMouseDown, false);
  renderer.domElement.addEventListener('mouseup', onDocumentMouseUp, false);

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  mouse.x = mouse.y = -1; // Initial position offscreen
}

function raycast()
{
  raycaster.setFromCamera(mouse, camera);
  intersects = raycaster.intersectObjects(pieces, true);

  if (intersects.length > 0)
  {
    if (hover === intersects[0].object)
    {
      if (!selection)
        hover.material.transparent = false;
    }
    else
    {
      if (hover && hover != selection)
        hover.material.transparent = true;

      hover = intersects[0].object;
    }
  }
  else
  {
    if (hover)
    {
      if (!selection)
        hover.material.transparent = true;

      hover = null;
    }
  }
}

function onDocumentMouseDown(event)
{
  event.preventDefault();

  if (hover && !selection)
    selection = hover;
  else if (!hover && selection)
  {
    var currSel = selection;
    deselectPiece();

    if (!selection)
      currSel.material.transparent = true;
  }
  else if (hover && selection)
  {
    var currSel = selection;

    deselectPiece();

    if (!selection)
    {
      currSel.material.transparent = true;

      if (hover != currSel)
      {
        selection = hover;
        selection.material.transparent = false;
      }
    }
  }
}

function onDocumentMouseUp(event)
{ event.preventDefault(); }

function onMouseMove(event)
{
  // Calculate mouse position in normalized device coordinates
  //  (-1 to +1) for both components (used by Raycaster).
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function createTable()
{
  var mtlLoader = new THREE.MTLLoader();
  mtlLoader.setPath("models/");
  mtlLoader.load("table.mtl",
    function (materials)
    {
      materials.preload();

      var objLoader = new THREE.OBJLoader();
      objLoader.setMaterials(materials);
      objLoader.setPath("models/");
      objLoader.load("table.obj",
        function (object)
        {
          object.scale.set(scale/2, scale/2, scale/2);
          object.position.x = -75*scale/2;
          object.position.y = -75*scale/2 + 1.375;
          object.position.z = -90;

          object.name = "Table";

          object.children[0].castShadow = true;
          object.children[0].receiveShadow = true;

          scene.add(object);
        });
    });
}

function populateLevels()
{
  level.push({pcs: "drstuv2", x: 3, y: 3, z: 3, solns: 1056});
  level.push({pcs: "bmrsuw1", x: 3, y: 3, z: 3, solns: 5});
  level.push({pcs: "abcrsv", x: 3, y: 3, z: 3, solns: 1});
}

function selectLevel()
{
  currLvl = 0; // Testing on easiest level for now...
}

function buildLevel()
{
  createPlayArea(currLvl);
  createPieces(currLvl);
}

function createPlayArea(lvl)
{
  // Actual board mesh, a visual aid for the player
  board = new THREE.Mesh(new THREE.BoxGeometry(level[lvl].z*space,
    level[lvl].x*space, scale), new THREE.MeshLambertMaterial({color:
      0xffffff}));

  board.castShadow = board.receiveShadow = true;

  board.position.y = -(scale/2 + 0.015625);
  board.rotation.x = 3*Math.PI/2;

  scene.add(board);

  // Matrix that will help determine when cube is finished
  for (var i = 0; i < level[lvl].y; i++)
  {
    playArea.push([]);

    for (var j = 0; j < level[lvl].x; j++)
    {
      playArea[i].push([]);

      for (var k = 0; k < level[lvl].z; k++)
        playArea[i][j].push(false);
    }
  }
}

function populateAttributes()
{
  var X = true, O = false;

  attr["a"] = {poly: 5,
               color: "red",
               dimens: [[[X, X],
                         [X],
                         [X]],

                        [[],
                         [X]]]};
  attr["b"] = {poly: 5,
               color: "yellow",
               dimens: [[[X, X],
                         [X]],

                        [[],
                         [X],
                         [X]]]};
  attr["c"] = {poly: 5,
               color: "yellow",
               dimens: [[[X],
                         [X],
                         [X]],

                        [[X, X]]]};
  attr["d"] = {poly: 5,
               color: "yellow",
               dimens: [[[X, X],
                         [X],
                         [X]],

                        [[X]]]};
  attr["e"] = {poly: 5,
               color: "yellow",
               dimens: [[[X],
                         [X, X],
                         [X]],

                        [[],
                         [O, X]]]};
  attr["f"] = {poly: 5,
               color: "blue",
               dimens: [[[X, X],
                         [X],
                         [X]],

                        [[O, X]]]};
  attr["g"] = {poly: 5,
               color: "blue",
               dimens: [[[X],
                         [X, X]],

                        [[],
                         [X],
                         [X]]]};
  attr["h"] = {poly: 5,
               color: "blue",
               dimens: [[[X],
                         [X, X],
                         [X]],

                        [[X]]]};
  attr["i"] = {poly: 5,
               color: "yellow",
               dimens: [[[X],
                         [X, X],
                         [O, X]],

                        [[],
                         [X]]]};
  attr["j"] = {poly: 5,
               color: "red",
               dimens: [[[X],
                         [X, X],
                         [O, X]],

                        [[X]]]};
  attr["k"] = {poly: 5,
               color: "blue",
               dimens: [[[X],
                         [X, X],
                         []],

                        [[],
                         [O, X],
                         [O, X]]]};
  attr["l"] = {poly: 5,
               color: "red",
               dimens: [[[X],
                         [X]],

                        [[],
                         [X, X],
                         [O, X]]]};
  attr["m"] = {poly: 5,
               color: "red",
               dimens: [[[X],
                         [X, X],
                         [X]],

                        [[],
                         [X]]]};
  attr["n"] = {poly: 5,
               color: "blue",
               dimens: [[[X, X],
                         [X],
                         [X]],

                        [[],
                         [],
                         [X]]]};
  attr["o"] = {poly: 5,
               color: "red",
               dimens: [[[X],
                         [X],
                         [X, X]],

                        [[X]]]};
  attr["r"] = {poly: 4,
               color: "green",
               dimens: [[[X, X],
                         [X]],

                        [[],
                         [X]]]};
  attr["s"] = {poly: 4,
               color: "tan",
               dimens: [[[X, X],
                         [X]],

                        [[O, X]]]};
  attr["t"] = {poly: 4,
               color: "green",
               dimens: [[[X, X],
                         [X],
                         [X]]]};
  attr["u"] = {poly: 4,
               color: "green",
               dimens: [[[X],
                         [X, X],
                         [X]]]};
  attr["v"] = {poly: 4,
               color: "tan",
               dimens: [[[X],
                         [X, X],
                         [O, X]]]};
  attr["w"] = {poly: 4,
               color: "tan",
               dimens: [[[X, X],
                         [X]],

                        [[X]]]};
  attr["z"] = {poly: 3,
               color: "tan",
               dimens: [[[X, X],
                         [X]]]};
  attr["2"] = {poly: 2,
               color: "tan",
               dimens: [[[X],
                         [X]]]};
  attr["1"] = {poly: 1,
               color: "tan",
               dimens: [[[X]]]};
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

function createPieces(lvl)
{
  var pieceList = parseLevelPcs(level[lvl].pcs);

  for (var i = 0; i < pieceList.length; i++)
    addPiece(pieceList[i], i*3*space - 9*space, -6*space);
}

function movePiece(dir)
{
  switch (dir)
  {
    case "FW":
      selection.parent.position.z -= space;
      break;
    case "BK":
      selection.parent.position.z += space;
      break;
    case "LF":
      selection.parent.position.x -= space;
      break;
    case "RT":
      selection.parent.position.x += space;
      break;
  }

  console.log("M: (" + selection.parent.position.x + ", "
    + selection.parent.position.y + ", "
    + selection.parent.position.z + ")");
}

// Currently, these are buggy due to difficulties with 3d rotations
function rotatePiece(dir)
{
  switch (dir)
  {
    case "FW":
      selection.parent.rotation.x -= Math.PI/2;
      break;
    case "BK":
      selection.parent.rotation.x += Math.PI/2;
      break;
    case "LF":
      if (selection.parent.rotation.x === 0)
        selection.parent.rotation.y += Math.PI/2;
      else if (selection.parent.rotation.x === Math.PI/2)
        selection.parent.rotation.z -= Math.PI/2;
      else if (selection.parent.rotation.x === Math.PI)
        selection.parent.rotation.y -= Math.PI/2;
      else
        selection.parent.rotation.z += Math.PI/2;
      break;
    case "RT":
      if (selection.parent.rotation.x === 0)
        selection.parent.rotation.y -= Math.PI/2;
      else if (selection.parent.rotation.x === Math.PI/2)
        selection.parent.rotation.z += Math.PI/2;
      else if (selection.parent.rotation.x === Math.PI)
        selection.parent.rotation.y += Math.PI/2;
      else
        selection.parent.rotation.z -= Math.PI/2;
      break;
  }

  // Rotations must be in:  0 ≤ x,y,z < 2π
  if (selection.parent.rotation.x >= 2*Math.PI)
    selection.parent.rotation.x = 0;
  else if (selection.parent.rotation.x <= -Math.PI/2)
    selection.parent.rotation.x = 3*Math.PI/2;
  if (selection.parent.rotation.y >= 2*Math.PI)
    selection.parent.rotation.y = 0;
  else if (selection.parent.rotation.y <= -Math.PI/2)
    selection.parent.rotation.y = 3*Math.PI/2;
  if (selection.parent.rotation.z >= 2*Math.PI)
    selection.parent.rotation.z = 0;
  else if (selection.parent.rotation.z <= -Math.PI/2)
    selection.parent.rotation.z = 3*Math.PI/2;

  console.log("R: (" + selection.parent.rotation.x + ", "
    + selection.parent.rotation.y + ", "
    + selection.parent.rotation.z + ")");
}

function getPolyLocs(piece)
{
  console.log("Piece " + piece.name + ":");
  var str = "";

  for (var i = 0; i < piece.polyLocs.length; i++)
  {
    for (var j = 0; j < piece.polyLocs[i].length; j++)
    {
      for (var k = 0; k < piece.polyLocs[i][j].length; k++)
      {
        str += (piece.polyLocs[i][j][k] ? "X " : "O ");

        // Do important things
      }

      str += "\n";
    }

    str += "\n";
  }

  console.log(str);
}

function addPiece(piece, x, z)
{
  var loader = new THREE.OBJLoader();

  loader.load("models/" + piece + ".obj", function (object)
    {
      pieces.push(object);
      object.scale.set(scale, scale, scale);
      object.position.y = 0;
      object.position.x = x;
      object.position.z = z;

      object.name = piece;

      // Note: object.children[0] is the THREE.Mesh
      object.children[0].material = new THREE.MeshStandardMaterial(
        {color: attr[piece].color, opacity: 0.5, transparent: true});

      object.children[0].castShadow = true;
      object.children[0].receiveShadow = true;

      object.children[0].rotation.y = 3*Math.PI/2;

      object.polyLocs = attr[object.name].dimens;
      getPolyLocs(object);

      scene.add(object);
    });
}

function updateInfoPane()
{
  document.getElementById("info").innerHTML =
    "Dimensions:&nbsp<br>" + level[currLvl].x
    + "x" + level[currLvl].z
    + "x" + level[currLvl].y + "&nbsp&nbsp&nbsp&nbsp</br>"

    + (selection ? "<br><sm>Piece \'" + selection.parent.name
      + "\' selected</br><br>" + (mode === "M" ?
        "Move mode&nbsp" : "Rotate mode") + " &nbsp&nbsp</sm>" : "");
}

function helpMenu()
{
  if (help)
  {
    document.getElementById('help').innerHTML =
      "<br><u>Objective</u>"
      + "<br>Move the pieces onto"
      + "<br>&nbspthe platform. Fit them"
      + "<br>&nbspinto the correct"
      + "<br>&nbspdimensions to win!</br>"

      + "<br><u>Controls</u>"
      + "<br>[Click] on a piece to"
      + "<br>&nbspselect it"
      + "<br>[Spacebar] toggles the"
      + "<br>&nbsptwo modes, \"Move\""
      + "<br>&nbspand \"Rotate\""
      + "<br>[WASD] controls can"
      + "<br>&nbspbe used to operate"
      + "<br>&nbspeach mode</br>"

      + "<br>Press H to close this help menu";
  }
  else
    document.getElementById('help').innerHTML =
      "Press H to toggle the help menu";
}

