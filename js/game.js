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

var playArea = []; // Global matrix that holds locations of each piece's poly
var ROWS = 17;
var COLS = 31;

var pieces = [];
var scale = 4; // Don't change this
var space = 2*scale;

var mode = "M"; // "M" = movement, "R" = rotation
var rtns = []; // A graph of possible rotations from any particular position

var w, w_, a, a_, s, s_, d, d_, spacebar, spacebar_, h, h_;
w_ = a_ = s_ = d_ = spacebar_ = h_ = false;
var help = true;

var whoosh, scooch, ding;

var gameOver = false;


function initGame()
{
  scene = new THREE.Scene();

  createTable();

  populateLevels();
  selectLevel();

  buildLevel();

  setupCamera();
  addLight();

  setupRenderer();

  populateRotations();

  createControls();
  setupRaycaster();

  loadSounds();

  document.getElementById("game").appendChild(renderer.domElement);

  render();
}

function render()
{
  helpMenu();
  updateInfoPane();

  keyboardControls();

  raycast();

  if (gameOver)
  {
    for (var i = 0; i < pieces.length; i++)
      pieces[i].children[0].material.transparent = false;

    ding.play();
    selection = null;
    gameOver = false;
    currLvl++;

    if (currLvl < level.length)
      setTimeout(function ()
        {
          while (pieces.length > 0)
          {
            scene.remove(pieces[0]);

            removeFromPlayArea(pieces[0]);
            pieces.splice(0, 1);
          }

          createPieces(parseLevelPcs(level[currLvl].pcs));
        }, 3000);
  }

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
      selection = null; // Deselect piece

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
      selection = null; // Deselect piece

    if (!selection)
      currSel.material.transparent = true;
  }
  else if (hover && selection)
  {
    var currSel = selection;

      selection = null; // Deselect piece

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
  var pieceList = parseLevelPcs(level[currLvl].pcs);

  createPlayArea(pieceList.length);
  createPieces(pieceList);
}

function createPlayArea(numPieces)
{
  // Access via: playArea[y][z][x], i.e. [floor][row][col]

  for (var i = 0; i < 3*numPieces; i++)
  {
    playArea.push([]);

    for (var j = 0; j < ROWS; j++)
    {
      playArea[i].push([]);

      for (var k = 0; k < COLS; k++)
        playArea[i][j].push(false);
    }
  }
}

function addPiece(piece, x, z)
{
  var loader = new THREE.OBJLoader();

  loader.load("models/" + piece + ".obj", function (object)
    {
      pieces.push(object);
      object.scale.set(scale, scale, scale);
      object.position.y = 0;
      object.position.x = x*space;
      object.position.z = z*space;

      object.name = piece;

      // Note: object.children[0] is the THREE.Mesh
      object.children[0].material = new THREE.MeshStandardMaterial(
        {color: getAttributes(piece).color, opacity: 0.65, transparent: true});

      object.children[0].castShadow = true;
      object.children[0].receiveShadow = true;

      // Rotate the mesh (not the group) for initial group orientation to stay
      //   at (0, 0, 0). Very useful.
      object.children[0].rotation.y = 3*Math.PI/2;

      object.rotn = 0;
      object.polyLocs = getAttributes(object.name).dimens;
      object.polyLocs[0][0][0] = {x:x, y:0, z:z};
      getInitLocs(object);

      scene.add(object);
    });
}

function getInitLocs(object, piece)
{
  // Base other polyLocs (trues) off initial rotation
  var origin = object.polyLocs[0][0][0];

  // Create locals (object.polyLocs) and globals (playArea)
  for (var i = 0; i < object.polyLocs.length; i++)
    for (var j = 0; j < object.polyLocs[i].length; j++)
      for (var k = 0; k < object.polyLocs[i][j].length; k++)
      {
        var x = Math.floor(COLS/2) + origin.x + k;
        var y = object.polyLocs[0][0][0].y + i;
        var z = Math.floor(ROWS/2) + origin.z + j;

        if (object.polyLocs[i][j][k] === true
            || object.polyLocs[i][j][k] === origin)
        {
          object.polyLocs[i][j][k] = {x:x, y:y, z:z}; // Local
          playArea[y][z][x] = object.name; // Global
        }
      }
}

function rotatePiece(dir, recurs)
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

  removeFromPlayArea(selection.parent);

  getNewPolyLocs(selection.parent, "R", dir);

  var fix = isInBounds(selection.parent);
  if (fix != true)
    movePiece(fix, true);

  if (!isValidLoc(selection.parent))
    movePiece("UP", true);
  else if (canFall(selection.parent))
    movePiece("DN", true);

  addToPlayArea(selection.parent);

  whoosh.play();
  gameOver = checkGameOver();
}

function movePiece(dir, recurs)
{
  if (recurs === undefined)
    recurs = false;

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
    case "UP":
      selection.parent.position.y += space + 0.015625;
      break;
    case "DN":
      selection.parent.position.y -= space + 0.015625;
      break;
  }

  if (!recurs)
    removeFromPlayArea(selection.parent);

  getNewPolyLocs(selection.parent, "M", dir);

  var fix = isInBounds(selection.parent);
  if (fix != true)
    movePiece(fix, true);

  if (!isValidLoc(selection.parent))
    movePiece("UP", true);
  else if (canFall(selection.parent))
    movePiece("DN", true);

  if (!recurs)
  {
    addToPlayArea(selection.parent);

    scooch.play();

    gameOver = checkGameOver();
  }
}

function getNewPolyLocs(piece, mode, dir) // Returns locals only
{
  switch (mode)
  {
    case "M":
      switch (dir)
      {
        case "FW":
          for (var i = 0; i < piece.polyLocs.length; i++)
            for (var j = 0; j < piece.polyLocs[i].length; j++)
              for (var k = 0; k < piece.polyLocs[i][j].length; k++)
                if (piece.polyLocs[i][j][k])
                  piece.polyLocs[i][j][k].z--;
          break;
        case "BK":
          for (var i = 0; i < piece.polyLocs.length; i++)
            for (var j = 0; j < piece.polyLocs[i].length; j++)
              for (var k = 0; k < piece.polyLocs[i][j].length; k++)
                if (piece.polyLocs[i][j][k])
                  piece.polyLocs[i][j][k].z++;
          break;
        case "LF":
          for (var i = 0; i < piece.polyLocs.length; i++)
            for (var j = 0; j < piece.polyLocs[i].length; j++)
              for (var k = 0; k < piece.polyLocs[i][j].length; k++)
                if (piece.polyLocs[i][j][k])
                  piece.polyLocs[i][j][k].x--;
          break;
        case "RT":
          for (var i = 0; i < piece.polyLocs.length; i++)
            for (var j = 0; j < piece.polyLocs[i].length; j++)
              for (var k = 0; k < piece.polyLocs[i][j].length; k++)
                if (piece.polyLocs[i][j][k])
                  piece.polyLocs[i][j][k].x++;
          break;
        case "UP":
          for (var i = 0; i < piece.polyLocs.length; i++)
            for (var j = 0; j < piece.polyLocs[i].length; j++)
              for (var k = 0; k < piece.polyLocs[i][j].length; k++)
                if (piece.polyLocs[i][j][k])
                  piece.polyLocs[i][j][k].y++;
          break;
        case "DN":
          for (var i = 0; i < piece.polyLocs.length; i++)
            for (var j = 0; j < piece.polyLocs[i].length; j++)
              for (var k = 0; k < piece.polyLocs[i][j].length; k++)
                if (piece.polyLocs[i][j][k])
                  piece.polyLocs[i][j][k].y--;
          break;
      }
      break;
    case "R":
      switch (dir)
      {
        case "FW":
          for (var i = 0; i < piece.polyLocs.length; i++)
            for (var j = 0; j < piece.polyLocs[i].length; j++)
              for (var k = 0; k < piece.polyLocs[i][j].length; k++)
              {
                if ((i === 0 && j === 0 && k === 0) || !piece.polyLocs[i][j][k])
                  continue;

                var dy = piece.polyLocs[i][j][k].y - piece.polyLocs[0][0][0].y;
                var dz = piece.polyLocs[i][j][k].z - piece.polyLocs[0][0][0].z;

                piece.polyLocs[i][j][k].y -= dy - dz;
                piece.polyLocs[i][j][k].z -= dz + dy;
              }
          break;
        case "BK":
          for (var i = 0; i < piece.polyLocs.length; i++)
            for (var j = 0; j < piece.polyLocs[i].length; j++)
              for (var k = 0; k < piece.polyLocs[i][j].length; k++)
              {
                if ((i === 0 && j === 0 && k === 0) || !piece.polyLocs[i][j][k])
                  continue;

                var dy = piece.polyLocs[i][j][k].y - piece.polyLocs[0][0][0].y;
                var dz = piece.polyLocs[i][j][k].z - piece.polyLocs[0][0][0].z;

                piece.polyLocs[i][j][k].y -= dy + dz;
                piece.polyLocs[i][j][k].z -= dz - dy;
              }
          break;
        case "LF":
          for (var i = 0; i < piece.polyLocs.length; i++)
            for (var j = 0; j < piece.polyLocs[i].length; j++)
              for (var k = 0; k < piece.polyLocs[i][j].length; k++)
              {
                if ((i === 0 && j === 0 && k === 0) || !piece.polyLocs[i][j][k])
                  continue;

                var dx = piece.polyLocs[i][j][k].x - piece.polyLocs[0][0][0].x;
                var dz = piece.polyLocs[i][j][k].z - piece.polyLocs[0][0][0].z;

                piece.polyLocs[i][j][k].x -= dx - dz;
                piece.polyLocs[i][j][k].z -= dz + dx;
              }
          break;
        case "RT":
          for (var i = 0; i < piece.polyLocs.length; i++)
            for (var j = 0; j < piece.polyLocs[i].length; j++)
              for (var k = 0; k < piece.polyLocs[i][j].length; k++)
              {
                if ((i === 0 && j === 0 && k === 0) || !piece.polyLocs[i][j][k])
                  continue;

                var dx = piece.polyLocs[i][j][k].x - piece.polyLocs[0][0][0].x;
                var dz = piece.polyLocs[i][j][k].z - piece.polyLocs[0][0][0].z;

                piece.polyLocs[i][j][k].x -= dx + dz;
                piece.polyLocs[i][j][k].z -= dz - dx;
              }
          break;
      }
      break;
  }
}

function removeFromPlayArea(piece)
{
  for (var i = 0; i < piece.polyLocs.length; i++)
    for (var j = 0; j < piece.polyLocs[i].length; j++)
      for (var k = 0; k < piece.polyLocs[i][j].length; k++)
        if (piece.polyLocs[i][j][k])
        {
          var x = piece.polyLocs[i][j][k].x;
          var y = piece.polyLocs[i][j][k].y;
          var z = piece.polyLocs[i][j][k].z;

          playArea[y][z][x] = false;
        }
}

function addToPlayArea(piece)
{
  for (var i = 0; i < piece.polyLocs.length; i++)
    for (var j = 0; j < piece.polyLocs[i].length; j++)
      for (var k = 0; k < piece.polyLocs[i][j].length; k++)
        if (piece.polyLocs[i][j][k])
        {
          var x = piece.polyLocs[i][j][k].x;
          var y = piece.polyLocs[i][j][k].y;
          var z = piece.polyLocs[i][j][k].z;

          playArea[y][z][x] = piece.name;
        }
}

function isInBounds(piece)
{
  for (var i = 0; i < piece.polyLocs.length; i++)
    for (var j = 0; j < piece.polyLocs[i].length; j++)
      for (var k = 0; k < piece.polyLocs[i][j].length; k++)
        if (piece.polyLocs[i][j][k] != false)
        {
          if (piece.polyLocs[i][j][k].z > -1 && piece.polyLocs[i][j][k].z < ROWS)
          {
            if (piece.polyLocs[i][j][k].x > -1 && piece.polyLocs[i][j][k].x < COLS)
            {
              if (piece.polyLocs[i][j][k].y > -1)
                continue;
              else
                return "UP";
            }
            else if (piece.polyLocs[i][j][k].x > -1)
              return "LF";
            else // if (piece.polyLocs[i][j][k].x < COLS)
              return "RT";
          }
          else if (piece.polyLocs[i][j][k].z > -1)
            return "FW";
          else // if (piece.polyLocs[i][j][k].z < ROWS)
            return "BK";
        }

  return true;
}

function isValidLoc(piece)
{
  for (var i = 0; i < piece.polyLocs.length; i++)
    for (var j = 0; j < piece.polyLocs[i].length; j++)
      for (var k = 0; k < piece.polyLocs[i][j].length; k++)
        if (piece.polyLocs[i][j][k] != false)
        {
          var x = piece.polyLocs[i][j][k].x;
          var y = piece.polyLocs[i][j][k].y;
          var z = piece.polyLocs[i][j][k].z;

          if (playArea[y][z][x] != false)
            return false;
        }

  return true;
}

function canFall(piece)
{
  for (var i = 0; i < piece.polyLocs.length; i++)
    for (var j = 0; j < piece.polyLocs[i].length; j++)
      for (var k = 0; k < piece.polyLocs[i][j].length; k++)
        if (piece.polyLocs[i][j][k] != false)
        {
          if (piece.polyLocs[i][j][k].y <= 0)
            return false;

          var x = piece.polyLocs[i][j][k].x;
          var y = piece.polyLocs[i][j][k].y - 1;
          var z = piece.polyLocs[i][j][k].z;

          if (playArea[y][z][x] != false)
            return false;
        }

  return true;
}

// May want to change placement later to make things a bit prettier
function createPieces(pieceList)
{
  for (var i = 0; i < pieceList.length; i++)
    addPiece(pieceList[i], i*3 - 9, -6);
}

function getAttributes(pc)
{
  var X = true, O = false;

  switch (pc)
  {
    case "a":
      return {poly: 5,
              color: "red",
              dimens: [[[X, X], [X], [X]], [[], [X]]]};
    case "b":
      return {poly: 5,
              color: "yellow",
              dimens: [[[X, X], [X]], [[], [X], [X]]]};
    case "c":
      return {poly: 5,
              color: "yellow",
              dimens: [[[X], [X], [X]], [[X, X]]]};
    case "d":
      return {poly: 5,
              color: "yellow",
              dimens: [[[X, X], [X], [X]], [[X]]]};
    case "e":
      return {poly: 5,
              color: "yellow",
              dimens: [[[X], [X, X], [X]], [[], [O, X]]]};
    case "f":
      return {poly: 5,
              color: "blue",
              dimens: [[[X, X], [X], [X]], [[O, X]]]};
    case "g":
      return {poly: 5,
              color: "blue",
              dimens: [[[X], [X, X]], [[], [X], [X]]]};
    case "h":
      return {poly: 5,
              color: "blue",
              dimens: [[[X], [X, X], [X]], [[X]]]};
    case "i":
      return {poly: 5,
              color: "yellow",
              dimens: [[[X], [X, X], [O, X]], [[], [X]]]};
    case "j":
      return {poly: 5,
              color: "red",
              dimens: [[[X], [X, X], [O, X]], [[X]]]};
    case "k":
      return {poly: 5,
              color: "blue",
              dimens: [[[X], [X, X], []], [[], [O, X], [O, X]]]};
    case "l":
      return {poly: 5,
              color: "red",
              dimens: [[[X], [X]], [[], [X, X], [O, X]]]};
    case "m":
      return {poly: 5,
              color: "red",
              dimens: [[[X], [X, X], [X]], [[], [X]]]};
    case "n":
      return {poly: 5,
              color: "blue",
              dimens: [[[X, X], [X], [X]], [[], [], [X]]]};
    case "o":
      return {poly: 5,
              color: "red",
              dimens: [[[X], [X], [X, X]], [[X]]]};
    case "r":
      return {poly: 4,
              color: "green",
              dimens: [[[X, X], [X]], [[], [X]]]};
    case "s":
      return {poly: 4,
              color: "tan",
              dimens: [[[X, X], [X]], [[O, X]]]};
    case "t":
      return {poly: 4,
              color: "green",
              dimens: [[[X, X], [X], [X]]]};
    case "u":
      return {poly: 4,
              color: "green",
              dimens: [[[X], [X, X], [X]]]};
    case "v":
      return {poly: 4,
              color: "tan",
              dimens: [[[X], [X, X], [O, X]]]};
    case "w":
      return {poly: 4,
              color: "tan",
              dimens: [[[X, X], [X]], [[X]]]};
    case "z":
      return {poly: 3,
              color: "tan",
              dimens: [[[X, X], [X]]]};
    case "2":
      return {poly: 2,
              color: "tan",
              dimens: [[[X], [X]]]};
    case "1":
      return {poly: 1,
              color: "tan",
              dimens: [[[X]]]};
  }
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

// This does not account for instances where the dimensions are correct, but
//   they are rotated
function checkGameOver()
{
  var lf = pieces[0].polyLocs[0][0][0].x;
  var rt = pieces[0].polyLocs[0][0][0].x;
  var dn = pieces[0].polyLocs[0][0][0].y;
  var up = pieces[0].polyLocs[0][0][0].y;
  var fw = pieces[0].polyLocs[0][0][0].z;
  var bk = pieces[0].polyLocs[0][0][0].z;

  // Preliminary check
  for (var i = 1; i < pieces.length; i++)
  {
    if (pieces[i].polyLocs[0][0][0].x < lf)
      lf = pieces[i].polyLocs[0][0][0].x;
    if (pieces[i].polyLocs[0][0][0].x > rt)
      rt = pieces[i].polyLocs[0][0][0].x;
    if (pieces[i].polyLocs[0][0][0].y < dn)
      dn = pieces[i].polyLocs[0][0][0].y;
    if (pieces[i].polyLocs[0][0][0].y > up)
      up = pieces[i].polyLocs[0][0][0].y;
    if (pieces[i].polyLocs[0][0][0].z < fw)
      fw = pieces[i].polyLocs[0][0][0].z;
    if (pieces[i].polyLocs[0][0][0].z > bk)
      bk = pieces[i].polyLocs[0][0][0].z;
  }

  if (rt - lf + 1 > level[currLvl].x
      || up - dn + 1 > level[currLvl].y
      || bk - fw + 1 > level[currLvl].z)
    return false;

  // Serious check
  for (var pc = 0; i < pieces.length; i++)
    for (var i = 0; i < pieces[pc].polyLocs.length; i++)
      for (var j = 0; j < pieces[pc].polyLocs[i].length; j++)
        for (var k = 0; k < pieces[pc].polyLocs[i][j].length; k++)
          if (pieces[pc].polyLocs[i][j][k] != false)
          {
            if (pieces[i].polyLocs[i][i][i].x < lf)
              lf = pieces[i].polyLocs[i][i][i].x;
            if (pieces[i].polyLocs[i][i][i].x > rt)
              rt = pieces[i].polyLocs[i][i][i].x;
            if (pieces[i].polyLocs[i][i][i].y < dn)
              dn = pieces[i].polyLocs[i][i][i].y;
            if (pieces[i].polyLocs[i][i][i].y > up)
              up = pieces[i].polyLocs[i][i][i].y;
            if (pieces[i].polyLocs[i][i][i].z < fw)
              fw = pieces[i].polyLocs[i][i][i].z;
            if (pieces[i].polyLocs[i][i][i].z > bk)
              bk = pieces[i].polyLocs[i][i][i].z;
          }

  if (rt - lf + 1 > level[currLvl].x
      || up - dn + 1 > level[currLvl].y
      || bk - fw + 1 > level[currLvl].z)
    return false;

  return true;
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
      + "<br>Assemble the pieces into"
      + "<br>&nbspthe shape of a box, the"
      + "<br>&nbspdimensions of which are"
      + "<br>&nbsplisted at the top of"
      + "<br>&nbspthe screen</br>"

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

function printPolys(mx) // For debugging purposes
{
  var str = "";
  for (var i = 0; i < 3/*mx.length*/; i++)
  {
    for (var j = 0; j < mx[i].length; j++)
    {
      for (var k = 0; k < mx[i][j].length; k++)
        str += " " + (mx[i][j][k] != false ?
          (mx[i][j][k] instanceof Object ? "*" : mx[i][j][k]) : " ");
      str += "\n";
    }
    str += "-----\n";
  }
  console.log(str);
}

function loadSounds()
{
  whoosh = new Audio("sounds/whoosh.wav");
  scooch = new Audio("sounds/scooch.wav");
  ding = new Audio("sounds/ding.wav");
}

