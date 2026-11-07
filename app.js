/* NareLauncher — страница лаунчера.
   Версию и размер берём из того же update.json, по которому обновляется
   сам лаунчер: на странице не будет цифр, разошедшихся с реальностью. */

(function () {
  "use strict";

  var MANIFEST =
    "https://raw.githubusercontent.com/Winnigames2024-Original/mods/main/narelauncher/update.json";

  function size(bytes) {
    if (!bytes) return "";
    var kb = bytes / 1024;
    return kb < 1024 ? Math.round(kb) + " КБ" : (kb / 1024).toFixed(1) + " МБ";
  }

  function showVersion() {
    var plain = document.getElementById("dl-plain-meta");
    var main = document.getElementById("dl-main-meta");
    if (!plain) return;

    fetch(MANIFEST, { cache: "no-cache" })
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.json();
      })
      .then(function (d) {
        var parts = [];
        if (d.version) parts.push(d.version);
        if (d.size) parts.push(size(d.size));
        plain.textContent = "NareLauncher.exe" + (parts.length ? " · " + parts.join(" · ") : "");

        if (main && d.version)
          main.textContent = "NareInstaller.exe · поставит " + d.version + " и ярлыки";
      })
      .catch(function () {
        // нет сети или GitHub недоступен — просто оставляем честную подпись
        plain.textContent = "NareLauncher.exe · если ставите вручную";
      });
  }

  function wireReveal() {
    if (!("IntersectionObserver" in window)) return;

    var items = document.querySelectorAll(".card, .steps li, .faq details, .band h2, .band-lead");
    for (var i = 0; i < items.length; i++) items[i].classList.add("reveal");

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("seen");
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: .08 });

    for (var j = 0; j < items.length; j++) io.observe(items[j]);
  }

  /* фигурка на главной слегка поворачивается за курсором — как в лаунчере */
  function wireFigure() {
    var fig = document.querySelector(".figure");
    var art = document.querySelector(".hero-art");
    if (!fig || !art) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    var head = fig.querySelector(".head");
    if (!head) return;

    art.addEventListener("mousemove", function (e) {
      var box = art.getBoundingClientRect();
      var dx = (e.clientX - (box.left + box.width / 2)) / (box.width / 2);
      var dy = (e.clientY - (box.top + box.height / 2)) / (box.height / 2);
      dx = Math.max(-1, Math.min(1, dx));
      dy = Math.max(-1, Math.min(1, dy));
      head.style.transform = "translate(" + (dx * 4).toFixed(1) + "px," +
                             (dy * 3).toFixed(1) + "px)";
    });

    art.addEventListener("mouseleave", function () {
      head.style.transform = "";
    });
  }

  showVersion();
  wireReveal();
  wireFigure();
})();
