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
var boardArr = [];
var board;

var pieces = [];
var attr = [];
var scale = 4;
var space = 2*scale;

var mode = "M"; // "M" = movement, "R" = rotation

var w, w_, a, a_, s, s_, d, d_, spacebar, spacebar_, h, h_;
w_ = a_ = s_ = d_ = spacebar_ = h_ = false;

var rtns = []; // A graph of possible rotations from any particular position

var help = false;


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
    boardArr.push([]);

    for (var j = 0; j < level[lvl].x; j++)
    {
      boardArr[i].push([]);

      for (var k = 0; k < level[lvl].z; k++)
        boardArr[i][j].push(false);
    }
  }
}

function getInitLocs()
{
  ;
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

      object.rotn = 0;
      object.polyLocs = attr[object.name].dimens;
      getPolyLocs(object);

      scene.add(object);
    });
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

function rotatePiece(dir)
{
  switch (dir)
  {
    case "FW":
      selection.parent.rotn = rtns[selection.parent.rotn].FW;
      break;
    case "BK":
      selection.parent.rotn = rtns[selection.parent.rotn].BK;
      break;
    case "LF":
      selection.parent.rotn = rtns[selection.parent.rotn].LF;
      break;
    case "RT":
      selection.parent.rotn = rtns[selection.parent.rotn].RT;
      break;
  }

  selection.parent.rotation.set(rtns[selection.parent.rotn].x,
                                rtns[selection.parent.rotn].y,
                                rtns[selection.parent.rotn].z);

  // Set new position
  // If new position is invalid (underground, on other piece),
  //   then raise y position
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

function deselectPiece()
{
  // Check whether or not position is valid (i.e. halfway on/off board = bad)

  // If OK, then deselect
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

  populateRotations();

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

function populateRotations()
{
  var pi = Math.PI;

  rtns.push({x:0,      y:0,      z:0,      RT:1,  LF:3,  BK:4,  FW:12}); //0
  rtns.push({x:0,      y:3*pi/2, z:0,      RT:2,  LF:0,  BK:16, FW:20}); //1
  rtns.push({x:0,      y:pi,     z:0,      RT:3,  LF:1,  BK:14, FW:6 }); //2
  rtns.push({x:0,      y:pi/2,   z:0,      RT:0,  LF:2,  BK:22, FW:18}); //3

  rtns.push({x:pi/2,   y:0,      z:0,      RT:5,  LF:7,  BK:8,  FW:0 }); //4
  rtns.push({x:pi/2,   y:0,      z:pi/2,   RT:6,  LF:4,  BK:17, FW:23}); //5
  rtns.push({x:pi/2,   y:0,      z:pi,     RT:7,  LF:5,  BK:2,  FW:10}); //6
  rtns.push({x:pi/2,   y:0,      z:3*pi/2, RT:4,  LF:6,  BK:21, FW:19}); //7

  rtns.push({x:pi,     y:0,      z:0,      RT:9,  LF:11, BK:12, FW:4 }); //8
  rtns.push({x:pi,     y:pi/2,   z:0,      RT:10, LF:8,  BK:18, FW:22}); //9
  rtns.push({x:pi,     y:pi,     z:0,      RT:11, LF:9,  BK:6,  FW:14}); //10
  rtns.push({x:pi,     y:3*pi/2, z:0,      RT:8,  LF:10, BK:20, FW:16}); //11

  rtns.push({x:3*pi/2, y:0,      z:0,      RT:13, LF:15, BK:0,  FW:8 }); //12
  rtns.push({x:3*pi/2, y:0,      z:3*pi/2, RT:14, LF:12, BK:19, FW:21}); //13
  rtns.push({x:3*pi/2, y:0,      z:pi,     RT:15, LF:13, BK:10, FW:2 }); //14
  rtns.push({x:3*pi/2, y:0,      z:pi/2,   RT:12, LF:14, BK:23, FW:17}); //15

  rtns.push({x:pi,     y:3*pi/2, z:pi/2,   RT:17, LF:19, BK:11, FW:1 }); //16
  rtns.push({x:pi,     y:0,      z:pi/2,   RT:18, LF:16, BK:15, FW:5 }); //17
  rtns.push({x:pi,     y:pi/2,   z:pi/2,   RT:19, LF:17, BK:3,  FW:9 }); //18
  rtns.push({x:pi,     y:pi,     z:pi/2,   RT:16, LF:18, BK:7,  FW:13}); //19

  rtns.push({x:0,      y:3*pi/2, z:pi/2,   RT:21, LF:23, BK:1,  FW:11}); //20
  rtns.push({x:0,      y:pi,     z:pi/2,   RT:22, LF:20, BK:13, FW:7 }); //21
  rtns.push({x:0,      y:pi/2,   z:pi/2,   RT:23, LF:21, BK:9,  FW:3 }); //22
  rtns.push({x:0,      y:0,      z:pi/2,   RT:20, LF:22, BK:5,  FW:15}); //23
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

      + "<br>[H] will close this menu";
  }
  else
    document.getElementById('help').innerHTML =
      "Press [H] for help";
}

