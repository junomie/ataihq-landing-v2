/* ============================================================
   ATAIHQ — background.js
   Three.js neural-network particle field for the hero.
   Clearly visible, pointer-reactive: particles near the cursor
   shift colour along the brand gradient and drift away gently.
   Paused when the tab is hidden, disabled for reduced motion.
   ============================================================ */

(function () {
  "use strict";

  var canvas = document.getElementById("bgCanvas");
  if (!canvas || typeof THREE === "undefined") return;

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) return; // hero veil gradients carry the look on their own

  var IS_MOBILE = window.innerWidth < 760;
  var PARTICLE_COUNT = IS_MOBILE ? 70 : 150;
  var FIELD_SPREAD = 22;          // world units the particles roam across
  var LINK_DISTANCE = 4.5;        // max distance for a connecting line
  var DRIFT_SPEED = 0.012;
  var POINTER_RADIUS = 5;         // world units around the cursor that react
  var POINTER_PUSH = 0.045;       // gentle repulsion strength
  var BLUE = new THREE.Color(0x00aaff);
  var PURPLE = new THREE.Color(0x7b2fff);
  var HIGHLIGHT = new THREE.Color(0xc9a0ff); // light violet flare near the cursor

  var renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: false,
    powerPreference: "low-power"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.z = 14;

  /* ---------- Particles ---------- */
  var positions = new Float32Array(PARTICLE_COUNT * 3);
  var colors = new Float32Array(PARTICLE_COUNT * 3);
  var baseColors = new Float32Array(PARTICLE_COUNT * 3);
  var velocities = [];

  for (var i = 0; i < PARTICLE_COUNT; i++) {
    positions[i * 3] = (Math.random() - 0.5) * FIELD_SPREAD * 1.6;
    positions[i * 3 + 1] = (Math.random() - 0.5) * FIELD_SPREAD * 0.9;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 6;

    // colour lerps blue→purple across the x axis to match the brand gradient
    var t = positions[i * 3] / (FIELD_SPREAD * 1.6) + 0.5;
    var c = BLUE.clone().lerp(PURPLE, t);
    baseColors[i * 3] = c.r;
    baseColors[i * 3 + 1] = c.g;
    baseColors[i * 3 + 2] = c.b;
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;

    velocities.push(
      (Math.random() - 0.5) * DRIFT_SPEED,
      (Math.random() - 0.5) * DRIFT_SPEED,
      (Math.random() - 0.5) * DRIFT_SPEED * 0.4
    );
  }

  var pointsGeo = new THREE.BufferGeometry();
  pointsGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  pointsGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  var pointsMat = new THREE.PointsMaterial({
    size: IS_MOBILE ? 0.14 : 0.13,
    vertexColors: true,
    transparent: true,
    opacity: 1,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  scene.add(new THREE.Points(pointsGeo, pointsMat));

  /* ---------- Connecting lines ---------- */
  var MAX_LINKS = PARTICLE_COUNT * 4;
  var linePositions = new Float32Array(MAX_LINKS * 6);
  var lineColors = new Float32Array(MAX_LINKS * 6);

  var lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
  lineGeo.setAttribute("color", new THREE.BufferAttribute(lineColors, 3));

  var lineMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  scene.add(new THREE.LineSegments(lineGeo, lineMat));

  /* ---------- Pointer tracking (parallax + world position) ---------- */
  var targetX = 0;
  var targetY = 0;
  var pointerNdcX = 10; // start far off-field so nothing reacts until first move
  var pointerNdcY = 10;

  window.addEventListener("pointermove", function (e) {
    targetX = (e.clientX / window.innerWidth - 0.5) * 1.4;
    targetY = (e.clientY / window.innerHeight - 0.5) * 0.8;
    pointerNdcX = (e.clientX / window.innerWidth) * 2 - 1;
    pointerNdcY = -((e.clientY / window.innerHeight) * 2 - 1);
  }, { passive: true });

  /* ---------- Resize ---------- */
  function resize() {
    var w = canvas.clientWidth || window.innerWidth;
    var h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize, { passive: true });
  resize();

  /* ---------- Animation loop ---------- */
  var isRunning = true;
  document.addEventListener("visibilitychange", function () {
    isRunning = !document.hidden;
    if (isRunning) requestAnimationFrame(tick);
  });

  var BOUND_X = FIELD_SPREAD * 0.85;
  var BOUND_Y = FIELD_SPREAD * 0.5;
  var FOV_HALF = Math.tan((camera.fov / 2) * Math.PI / 180);

  function tick() {
    if (!isRunning) return;

    var pos = pointsGeo.attributes.position.array;
    var col = pointsGeo.attributes.color.array;

    // project the pointer onto the z=0 plane the particles live around
    var halfH = FOV_HALF * camera.position.z;
    var halfW = halfH * camera.aspect;
    var pointerWorldX = pointerNdcX * halfW + camera.position.x;
    var pointerWorldY = pointerNdcY * halfH + camera.position.y;

    for (var i = 0; i < PARTICLE_COUNT; i++) {
      var ix = i * 3;
      pos[ix] += velocities[ix];
      pos[ix + 1] += velocities[ix + 1];
      pos[ix + 2] += velocities[ix + 2];

      if (Math.abs(pos[ix]) > BOUND_X) velocities[ix] *= -1;
      if (Math.abs(pos[ix + 1]) > BOUND_Y) velocities[ix + 1] *= -1;
      if (Math.abs(pos[ix + 2]) > 4) velocities[ix + 2] *= -1;

      // pointer reaction: colour flare + gentle push, fading with distance
      var pdx = pos[ix] - pointerWorldX;
      var pdy = pos[ix + 1] - pointerWorldY;
      var pDist = Math.sqrt(pdx * pdx + pdy * pdy);

      if (pDist < POINTER_RADIUS) {
        var strength = 1 - pDist / POINTER_RADIUS;
        var mix = strength * 0.9;
        col[ix] = baseColors[ix] + (HIGHLIGHT.r - baseColors[ix]) * mix;
        col[ix + 1] = baseColors[ix + 1] + (HIGHLIGHT.g - baseColors[ix + 1]) * mix;
        col[ix + 2] = baseColors[ix + 2] + (HIGHLIGHT.b - baseColors[ix + 2]) * mix;

        if (pDist > 0.001) {
          pos[ix] += (pdx / pDist) * strength * POINTER_PUSH;
          pos[ix + 1] += (pdy / pDist) * strength * POINTER_PUSH;
        }
      } else {
        // relax back toward the base gradient colour
        col[ix] += (baseColors[ix] - col[ix]) * 0.06;
        col[ix + 1] += (baseColors[ix + 1] - col[ix + 1]) * 0.06;
        col[ix + 2] += (baseColors[ix + 2] - col[ix + 2]) * 0.06;
      }
    }

    // rebuild link segments between close particles
    var linkIndex = 0;
    var lp = lineGeo.attributes.position.array;
    var lc = lineGeo.attributes.color.array;

    for (var a = 0; a < PARTICLE_COUNT && linkIndex < MAX_LINKS; a++) {
      for (var b = a + 1; b < PARTICLE_COUNT && linkIndex < MAX_LINKS; b++) {
        var ax = a * 3, bx = b * 3;
        var dx = pos[ax] - pos[bx];
        var dy = pos[ax + 1] - pos[bx + 1];
        var dz = pos[ax + 2] - pos[bx + 2];
        var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < LINK_DISTANCE) {
          var li = linkIndex * 6;
          lp[li] = pos[ax]; lp[li + 1] = pos[ax + 1]; lp[li + 2] = pos[ax + 2];
          lp[li + 3] = pos[bx]; lp[li + 4] = pos[bx + 1]; lp[li + 5] = pos[bx + 2];

          var fade = 1 - dist / LINK_DISTANCE;
          lc[li] = col[ax] * fade; lc[li + 1] = col[ax + 1] * fade; lc[li + 2] = col[ax + 2] * fade;
          lc[li + 3] = col[bx] * fade; lc[li + 4] = col[bx + 1] * fade; lc[li + 5] = col[bx + 2] * fade;
          linkIndex++;
        }
      }
    }
    // zero out unused segments so stale lines never linger
    for (var z = linkIndex * 6; z < lp.length; z++) { lp[z] = 0; lc[z] = 0; }

    pointsGeo.attributes.position.needsUpdate = true;
    pointsGeo.attributes.color.needsUpdate = true;
    lineGeo.attributes.position.needsUpdate = true;
    lineGeo.attributes.color.needsUpdate = true;

    // ease the camera toward the pointer for gentle parallax
    camera.position.x += (targetX - camera.position.x) * 0.03;
    camera.position.y += (-targetY - camera.position.y) * 0.03;
    camera.lookAt(scene.position);

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
})();
