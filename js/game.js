var renderer;
var scene;
var camera;
var light, amb;

var controls;

var raycaster;
var mouse;
var intersects;
var current;

var plane;

var pieces = [];
var scale = 4;

var help = false, helpRest = false;

var color = 0x48c469;


function prettyColors()
{
  // Do something with this later
  return color;
}

function initGame()
{
  scene = new THREE.Scene();

  createPlane();
  addPiece("A");
  // addPiece("B");

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
      if (current) // Set color back to normal
        current.material.color.set(0xff0000);

      current = intersects[0].object;
    }
    else // Set a distinguishing color
      current.material.color.set(prettyColors());
  }
  else if (current) // Set color back to normal when not looking at anything
  {
    current.material.color.set(0xff0000);
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
  var width  = 20*scale;
  var height = 20*scale;

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
  camera.position.set(50, 50, 50);
}

function createControls()
{
  controls = new THREE.OrbitControls(camera);
  // To disable:
  //   controls.enabled = false;
}

function addPiece(piece)
{
  var loader = new THREE.OBJLoader();

  var mat = new THREE.MeshLambertMaterial({color: 0xff0000});

  loader.load('models/cube.obj', function (object)
    {
      pieces.push(object);
      object.scale.set(scale, scale, scale);
      object.position.y = scale;

      object.name = "" + piece;

      console.log(object);

      object.traverse(function(child)
        {
          if (child instanceof THREE.Mesh)
          {
            child.material = mat;

            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

      scene.add(object);
    });
}

function keyboardControls()
{
  // Show help menu
  if (Key.isDown(Key.H))
    if (!helpRest) { help = !help; }
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

