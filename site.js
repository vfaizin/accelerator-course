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
