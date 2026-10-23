// Small behaviours of the course website, shared by every page.

// 1. On a phone the sections list is a panel opened from the top bar's
//    "Sections" button; following a link in it closes it again. On a wide
//    screen the list sits beside the text and the button is hidden.
(function () {
  var button = document.querySelector('.toc-button');
  var toc = document.getElementById('toc');
  if (!button || !toc) return;
  function setOpen(open) {
    document.body.classList.toggle('toc-open', open);
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  button.addEventListener('click', function () {
    setOpen(!document.body.classList.contains('toc-open'));
  });
  toc.addEventListener('click', function (e) {
    if (e.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setOpen(false);
  });
})();

// 2. An equation wider than the column is shrunk to fit, down to 60 per
//    cent of its size; one still too wide after that scrolls sideways
//    inside its own box. That holds for displayed equations and for long
//    ones inside a sentence, which cannot wrap. Redone when the width
//    changes.
(function () {
  var MIN = 0.6;
  function fit() {
    var main = document.querySelector('main');
    if (!main) return;
    var boxes = document.querySelectorAll('mjx-container');
    for (var i = 0; i < boxes.length; i++) {
      var box = boxes[i];
      var display = box.getAttribute('display') === 'true';
      box.style.fontSize = '';
      box.classList.remove('wide-inline');
      // The room is the width of the block the equation sits in: a list
      // item or a quote is narrower than the page's column.
      var host = box.closest('li, blockquote, dd, td, th, p') || main;
      var cs = getComputedStyle(host);
      var column = host.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      var width = display ? box.scrollWidth : box.getBoundingClientRect().width;
      var room = display ? box.clientWidth : column;
      if (width <= room) continue;
      box.style.fontSize = (Math.max((room / width) * 0.98, MIN) * 100).toFixed(1) + '%';
      if (!display && box.getBoundingClientRect().width > column) box.classList.add('wide-inline');
    }
  }
  function whenTypeset() {
    if (window.MathJax && MathJax.startup && MathJax.startup.promise) {
      MathJax.startup.promise.then(fit);
    } else {
      setTimeout(whenTypeset, 200);
    }
  }
  window.addEventListener('load', whenTypeset);
  var last = window.innerWidth;
  window.addEventListener('resize', function () {
    if (window.innerWidth !== last) { last = window.innerWidth; fit(); }
  });
})();

// 3. A figure opens over the page instead of on a page of its own: the
//    drawing fills the screen with its caption under it, and can be zoomed
//    (wheel, pinch, double-click, or the + and - buttons) and dragged.
//    Escape, the close button, a click beside the drawing, or the phone's
//    back button closes it. Without this script the figure's link still
//    opens the SVG itself.
//    The drawing's transform is translate(x, y) scale(s) about its own
//    centre; zooming about a point p keeps p still, which moves the centre
//    offset t to t + (p - c - t)(1 - s'/s), c being the unmoved centre.
(function () {
  var MAX = 8;
  var box = document.createElement('div');
  box.className = 'zoom';
  box.hidden = true;
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.innerHTML =
    '<div class="zoom-tools">' +
    '<button type="button" data-act="out" aria-label="Zoom out">&minus;</button>' +
    '<button type="button" data-act="in" aria-label="Zoom in">+</button>' +
    '<button type="button" data-act="close" aria-label="Close">&times;</button>' +
    '</div><div class="zoom-stage"><img alt=""></div><p class="zoom-caption"></p>';
  document.body.appendChild(box);
  var stage = box.querySelector('.zoom-stage');
  var img = stage.querySelector('img');
  var caption = box.querySelector('.zoom-caption');

  var s = 1, x = 0, y = 0;
  function draw() { img.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + s + ')'; }
  function zoomAt(next, px, py) {
    next = Math.min(MAX, Math.max(1, next));
    if (next === 1) { s = 1; x = 0; y = 0; draw(); return; }
    var r = stage.getBoundingClientRect();
    var cx = r.left + img.offsetLeft + img.offsetWidth / 2;
    var cy = r.top + img.offsetTop + img.offsetHeight / 2;
    x += (px - cx - x) * (1 - next / s);
    y += (py - cy - y) * (1 - next / s);
    s = next;
    draw();
  }
  // Fit the drawing to the stage: an SVG without a set size never grows
  // past its natural one, so its width and height are set here.
  function fit() {
    if (box.hidden || !img.naturalWidth) return;
    var cs = getComputedStyle(stage);
    var w = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    var h = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    var k = Math.min(w / img.naturalWidth, h / img.naturalHeight);
    img.style.width = (img.naturalWidth * k) + 'px';
    img.style.height = (img.naturalHeight * k) + 'px';
  }
  img.addEventListener('load', fit);
  window.addEventListener('resize', fit);
  function centre() {
    var r = stage.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  }

  function open(link) {
    var src = link.querySelector('img');
    img.src = link.getAttribute('href');
    img.alt = src ? src.alt : '';
    // The caption is the paragraph in italics right after the figure.
    var next = link.parentElement.nextElementSibling;
    var em = next && next.children.length === 1 && next.firstElementChild.tagName === 'EM' ? next : null;
    caption.innerHTML = em ? em.innerHTML : '';
    caption.hidden = !em;
    s = 1; x = 0; y = 0; moved = false; draw();
    box.hidden = false;
    document.body.classList.add('zoom-open');
    fit();
    history.pushState({ zoom: true }, '');
    box.querySelector('[data-act="close"]').focus();
  }
  function shut() {
    box.hidden = true;
    document.body.classList.remove('zoom-open');
  }
  function close() {
    if (box.hidden) return;
    if (history.state && history.state.zoom) history.back(); else shut();
  }
  window.addEventListener('popstate', shut);

  document.addEventListener('click', function (e) {
    var link = e.target.closest('a.figure');
    if (!link || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    open(link);
  });
  box.addEventListener('click', function (e) {
    var act = e.target.closest('button') && e.target.closest('button').dataset.act;
    var c = centre();
    if (act === 'in') zoomAt(s * 1.5, c[0], c[1]);
    else if (act === 'out') zoomAt(s / 1.5, c[0], c[1]);
    else if (act === 'close') close();
    else if ((e.target === stage || e.target === box) && !moved) close();
  });
  document.addEventListener('keydown', function (e) {
    if (box.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === '+' || e.key === '=') { var c = centre(); zoomAt(s * 1.5, c[0], c[1]); }
    else if (e.key === '-') { var d = centre(); zoomAt(s / 1.5, d[0], d[1]); }
  });
  stage.addEventListener('wheel', function (e) {
    e.preventDefault();
    zoomAt(s * Math.exp(-e.deltaY * 0.002), e.clientX, e.clientY);
  }, { passive: false });
  img.addEventListener('dblclick', function (e) {
    zoomAt(s > 1 ? 1 : 2.5, e.clientX, e.clientY);
  });

  // Drag with one pointer, pinch with two. "moved" stops the click that
  // ends a drag from closing the box.
  var pointers = new Map(), moved = false, last = null;
  function spread() {
    var p = Array.from(pointers.values());
    return {
      d: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y),
      mx: (p[0].x + p[1].x) / 2, my: (p[0].y + p[1].y) / 2
    };
  }
  stage.addEventListener('pointerdown', function (e) {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { stage.setPointerCapture(e.pointerId); } catch (err) { /* not a live pointer */ }
    moved = false;
    last = pointers.size === 2 ? spread() : null;
  });
  stage.addEventListener('pointermove', function (e) {
    var p = pointers.get(e.pointerId);
    if (!p) return;
    var dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
    if (pointers.size === 2 && last) {
      var now = spread();
      x += now.mx - last.mx; y += now.my - last.my;
      zoomAt(s * now.d / last.d, now.mx, now.my);
      last = now;
    } else if (pointers.size === 1 && s > 1) {
      x += dx; y += dy;
      draw();
    }
  });
  function lift(e) {
    pointers.delete(e.pointerId);
    last = pointers.size === 2 ? spread() : null;
  }
  stage.addEventListener('pointerup', lift);
  stage.addEventListener('pointercancel', lift);
})();
