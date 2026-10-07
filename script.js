(function () {
  var range = document.getElementById('ba-range');
  var ba = document.getElementById('ba');
  range.addEventListener('input', function () { ba.style.setProperty('--split', range.value + '%'); });

  var btn = document.getElementById('copy');
  var email = document.getElementById('email');
  btn.addEventListener('click', function () {
    var text = email.textContent.trim();
    function selectIt() {
      var r = document.createRange(); r.selectNodeContents(email);
      var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      btn.textContent = 'Press ⌘C / Ctrl+C';
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        btn.textContent = 'Copied';
        setTimeout(function () { btn.textContent = 'Copy email'; }, 1800);
      }, selectIt);
    } else { selectIt(); }
  });

  document.getElementById('year').textContent = new Date().getFullYear();
})();
