/* NareLauncher — страница лаунчера.
   Версию и размер берём из тех же json, по которым обновляется
   лаунчер: на странице не будет цифр, разошедшихся с реальностью. */

(function () {
  "use strict";

  var LAUNCHER =
    "https://raw.githubusercontent.com/Winnigames2024-Original/mods/main/narelauncher/update.json";
  var INSTALLER =
    "https://raw.githubusercontent.com/Winnigames2024-Original/mods/main/nareinstaller/install.json";

  function size(bytes) {
    if (!bytes) return "";
    var kb = bytes / 1024;
    return kb < 1024 ? Math.round(kb) + " КБ" : (kb / 1024).toFixed(1) + " МБ";
  }

  function grab(url) {
    return fetch(url, { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    });
  }

  /* Подпись под кнопкой: сколько весит установщик и какую версию лаунчера
     он поставит. Обе цифры берутся из тех же json, по которым всё и
     обновляется, — руками их на странице править не надо. */
  function showVersion() {
    var meta = document.getElementById("dl-main-meta");
    if (!meta) return;

    Promise.all([
      grab(INSTALLER).catch(function () { return null; }),
      grab(LAUNCHER).catch(function () { return null; })
    ]).then(function (both) {
      var inst = both[0], launcher = both[1];
      var parts = ["NareInstaller.exe"];

      if (inst && inst.size) parts.push(size(inst.size));
      if (launcher && launcher.version) parts.push("поставит " + launcher.version);
      else parts.push("поставит лаунчер и ярлыки");

      meta.textContent = parts.join(" · ");
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
