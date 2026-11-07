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

  /* ------------------------------------------------------- выбор версии */

  var MANIFEST = "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json";
  var REMEMBER = "narelauncher-play";
  var EXTRA_KEY = "narelauncher-extra";

  var versions = [];      // {id, type, when}
  var kind = "release";
  var search = "";
  var chosen = null;
  var loader = "vanilla";

  var LOADER_RU = {
    vanilla: "без модов",
    forge: "Forge",
    fabric: "Fabric",
    neoforge: "NeoForge",
    quilt: "Quilt",
    visuals: "Forge Visuals"
  };

  // Forge Visuals — сборка не для всех, поэтому кнопки по умолчанию нет.
  // Открывается адресом с ?visuals=1 (или #visuals) и запоминается в браузере.
  var extraOn = false;

  function extraWanted() {
    var where = (location.search + " " + location.hash).toLowerCase();
    if (where.indexOf("visuals") >= 0) return true;

    try { return localStorage.getItem(EXTRA_KEY) === "1"; }
    catch (e) { return false; }
  }

  function unlockExtra() {
    if (extraOn) return;
    extraOn = true;

    var chip = el("v-extra");
    if (chip) chip.hidden = false;

    try { localStorage.setItem(EXTRA_KEY, "1"); }
    catch (e) { /* приватный режим — откроется по адресу */ }
  }

  function el(id) { return document.getElementById(id); }

  function year(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    return isNaN(d) ? "" : d.getFullYear();
  }

  function loadVersions() {
    var list = el("v-list");
    if (!list) return;

    fetch(MANIFEST, { cache: "no-cache" })
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.json();
      })
      .then(function (d) {
        versions = (d.versions || []).map(function (v) {
          return { id: v.id, type: v.type, when: v.releaseTime };
        });
        renderVersions();

        // последняя, на которую смотрели, или свежий релиз
        var saved = remembered();
        var start = null;

        if (saved && saved.version)
            for (var i = 0; i < versions.length; i++)
                if (versions[i].id === saved.version) start = versions[i];

        if (!start && d.latest && d.latest.release)
            for (var j = 0; j < versions.length; j++)
                if (versions[j].id === d.latest.release) start = versions[j];

        if (start) {
          if (saved && saved.loader) setLoader(saved.loader);
          choose(start);
        }
      })
      .catch(function () {
        list.innerHTML = "";
        var note = document.createElement("li");
        note.className = "vlist-note";
        note.textContent = "Список версий не загрузился — проверьте интернет и обновите страницу.";
        list.appendChild(note);
      });
  }

  function matches(v) {
    if (search && v.id.toLowerCase().indexOf(search) < 0) return false;

    if (kind === "release") return v.type === "release";
    if (kind === "snapshot") return v.type === "snapshot";
    return v.type === "old_beta" || v.type === "old_alpha";
  }

  function renderVersions() {
    var list = el("v-list");
    if (!list) return;

    list.innerHTML = "";
    var shown = 0;

    for (var i = 0; i < versions.length && shown < 300; i++) {
      var v = versions[i];
      if (!matches(v)) continue;
      shown++;

      var row = document.createElement("li");
      row.setAttribute("role", "option");
      row.setAttribute("aria-selected", chosen && chosen.id === v.id ? "true" : "false");
      row.dataset.id = v.id;

      var name = document.createElement("span");
      name.textContent = v.id;
      row.appendChild(name);

      var when = document.createElement("span");
      when.className = "when";
      when.textContent = year(v.when);
      row.appendChild(when);

      (function (version) {
        row.addEventListener("click", function () { choose(version); });
      })(v);

      list.appendChild(row);
    }

    if (shown === 0) {
      var note = document.createElement("li");
      note.className = "vlist-note";
      note.textContent = "Ничего не нашлось — попробуйте другой запрос.";
      list.appendChild(note);
    }
  }

  function choose(v) {
    chosen = v;

    var rows = document.querySelectorAll("#v-list li[data-id]");
    for (var i = 0; i < rows.length; i++)
      rows[i].setAttribute("aria-selected", rows[i].dataset.id === v.id ? "true" : "false");

    el("v-chosen-name").textContent = "Minecraft " + v.id;
    el("v-chosen-sub").textContent = LOADER_RU[loader] + (v.type === "release" ? "" : " · " + v.type);
    el("v-go").disabled = false;
  }

  function setLoader(value) {
    if (value === "visuals" && !extraOn) value = "forge";

    loader = LOADER_RU[value] ? value : "vanilla";

    var buttons = document.querySelectorAll("#v-loaders button");
    for (var i = 0; i < buttons.length; i++)
      buttons[i].setAttribute("aria-pressed", buttons[i].dataset.loader === loader ? "true" : "false");

    if (chosen) choose(chosen);
  }

  function remembered() {
    try { return JSON.parse(localStorage.getItem(REMEMBER) || "null"); }
    catch (e) { return null; }
  }

  /* ---------------------------------------------------------- запуск */

  function link() {
    return "narelauncher://play?version=" + encodeURIComponent(chosen.id) +
           "&loader=" + encodeURIComponent(loader);
  }

  function play() {
    if (!chosen) return;

    try {
      localStorage.setItem(REMEMBER, JSON.stringify({ version: chosen.id, loader: loader }));
    } catch (e) { /* приватный режим — просто не запомним */ }

    var rescue = el("v-rescue");
    if (rescue) rescue.hidden = true;

    var left = false;
    function away() { left = true; }

    window.addEventListener("blur", away);
    document.addEventListener("visibilitychange", away);

    // сама попытка: если лаунчер есть, Windows переключится на него
    try { location.href = link(); }
    catch (e) { /* браузер не дал — разберёмся по таймеру */ }

    setTimeout(function () {
      window.removeEventListener("blur", away);
      document.removeEventListener("visibilitychange", away);

      if (left || document.hidden) return;   // лаунчер открылся
      noLauncher();
    }, 1800);
  }

  /* Лаунчер не отозвался: отдаём установщик и ждём человека обратно. */
  function noLauncher() {
    var rescue = el("v-rescue");
    if (!rescue) return;

    rescue.hidden = false;

    var text = el("v-rescue-text");
    if (text)
      text.textContent = "Скачивание установщика началось. Поставьте его, вернитесь сюда и " +
                         "нажмите «Продолжить» — Minecraft " + chosen.id + " (" +
                         LOADER_RU[loader] + ") запустится сам.";

    // браузер не умеет передавать выбранную версию внутрь скачанного файла,
    // поэтому версию держим здесь и доигрываем после установки
    var get = el("v-rescue-get");
    if (get) { try { get.click(); } catch (e) { } }

    try { rescue.scrollIntoView({ behavior: "smooth", block: "nearest" }); } catch (e) { }
  }

  function wirePicker() {
    if (!el("v-list")) return;

    if (extraWanted()) unlockExtra();

    var box = el("v-search");
    if (box) box.addEventListener("input", function () {
      search = this.value.trim().toLowerCase();

      // слово в поиске тоже открывает скрытую кнопку
      if (search.indexOf("visuals") >= 0)
      {
        unlockExtra();
        this.value = "";
        search = "";
      }

      renderVersions();
    });

    var kinds = document.querySelectorAll("#v-kinds button");
    for (var i = 0; i < kinds.length; i++) {
      kinds[i].addEventListener("click", function () {
        kind = this.dataset.kind;
        for (var j = 0; j < kinds.length; j++)
          kinds[j].setAttribute("aria-pressed", kinds[j] === this ? "true" : "false");
        renderVersions();
      });
    }

    var loaders = document.querySelectorAll("#v-loaders button");
    for (var k = 0; k < loaders.length; k++)
      loaders[k].addEventListener("click", function () { setLoader(this.dataset.loader); });

    el("v-go").addEventListener("click", play);

    var retry = el("v-retry");
    if (retry) retry.addEventListener("click", play);

    loadVersions();
  }

  showVersion();
  wireReveal();
  wireFigure();
  wirePicker();
})();
