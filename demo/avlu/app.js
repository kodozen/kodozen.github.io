/* Avlu — sayfa davranışları
   Dil, başlık çubuğu, kaydırmada beliriş ve rezervasyon talebi. */

(function () {
  "use strict";

  var root = document.documentElement;

  /* ---------- dil ---------- */

  var STRINGS = {
    tr: { title: "Avlu · Alsancak, İzmir", menuTitle: "Menü · Avlu" },
    en: { title: "Avlu · Alsancak, İzmir", menuTitle: "Menu · Avlu" }
  };

  function applyLang(lang) {
    root.setAttribute("data-lang", lang);
    root.setAttribute("lang", lang);

    document.querySelectorAll("[data-set-lang]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.setLang === lang));
    });

    // yer tutucular öznitelikte durur, dil değişince güncellenir
    document.querySelectorAll("[data-ph-tr]").forEach(function (el) {
      el.setAttribute("placeholder", el.dataset["ph" + (lang === "en" ? "En" : "Tr")] || "");
    });

    var isMenu = document.body.dataset.page === "menu";
    document.title = STRINGS[lang][isMenu ? "menuTitle" : "title"];

    try { localStorage.setItem("bg-lang", lang); } catch (e) { /* gizli sekme */ }
  }

  document.querySelectorAll("[data-set-lang]").forEach(function (b) {
    b.addEventListener("click", function () { applyLang(b.dataset.setLang); });
  });

  var saved;
  try { saved = localStorage.getItem("bg-lang"); } catch (e) { saved = null; }
  applyLang(saved === "en" || saved === "tr" ? saved : "tr");

  /* ---------- giriş görselleri ---------- */

  var hero = document.querySelector(".hero");
  if (hero) {
    var slides = [].slice.call(hero.querySelectorAll(".hero__slide"));
    var dots = [].slice.call(hero.querySelectorAll("[data-hero-go]"));
    var index = 0;
    var timer = null;
    var HOLD = 6500;

    var calm = window.matchMedia("(prefers-reduced-motion: reduce)");

    function show(next) {
      index = (next + slides.length) % slides.length;
      slides.forEach(function (s, i) {
        s.dataset.active = String(i === index);
      });
      dots.forEach(function (d, i) {
        if (i === index) d.setAttribute("aria-current", "true");
        else d.removeAttribute("aria-current");
      });
    }

    function start() {
      if (calm.matches || slides.length < 2) return;
      stop();
      timer = setInterval(function () { show(index + 1); }, HOLD);
    }
    function stop() {
      if (timer) { clearInterval(timer); timer = null; }
    }

    // Elle gezinme otomatik akışı baştan başlatır, kesmez.
    hero.querySelectorAll("[data-hero-step]").forEach(function (b) {
      b.addEventListener("click", function () {
        show(index + Number(b.dataset.heroStep));
        start();
      });
    });
    dots.forEach(function (d) {
      d.addEventListener("click", function () {
        show(Number(d.dataset.heroGo));
        start();
      });
    });

    hero.addEventListener("mouseenter", stop);
    hero.addEventListener("mouseleave", start);
    hero.addEventListener("focusin", stop);
    hero.addEventListener("focusout", start);

    // Arka plandaki sekmede döndürmenin anlamı yok.
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop(); else start();
    });

    if (calm.addEventListener) {
      calm.addEventListener("change", function () { calm.matches ? stop() : start(); });
    }

    show(0);
    start();

    /* --- mobilde arka plan videosu --- */

    var video = hero.querySelector(".hero__video");
    var narrow = window.matchMedia("(max-width: 700px)");

    function videoOff() {
      hero.removeAttribute("data-video");
      if (video) video.pause();
      start();
    }

    function syncVideo() {
      if (!video) return;
      if (calm.matches) { videoOff(); return; }   // hareket istemiyorsa slaytlar kalsın

      // dar ekran dikey dosyayı, geniş ekran yatay dosyayı alır
      var want = narrow.matches ? video.dataset.srcP : video.dataset.srcL;

      if (video.getAttribute("src") !== want) {
        video.muted = true;                       // otomatik oynatmanın şartı
        video.setAttribute("src", want);
        video.load();
      }
      var playing = video.play();
      if (playing && playing.then) {
        playing.then(function () {
          hero.dataset.video = "on";
          stop();                                 // slayt zamanlayıcısı boşa dönmesin
        }).catch(videoOff);                       // tarayıcı izin vermediyse slaytlara dön
      } else {
        hero.dataset.video = "on";
        stop();
      }
    }

    if (video) {
      video.addEventListener("error", videoOff);
      if (narrow.addEventListener) narrow.addEventListener("change", syncVideo);
      // Telefon çevrilince eşik değişir; bazı tarayıcılarda matchMedia
      // olayı bu durumda geç kalıyor, bu yüzden ayrıca dinleniyor.
      window.addEventListener("orientationchange", function () {
        setTimeout(syncVideo, 250);
      });
      syncVideo();
    }
  }

  /* ---------- başlık çubuğu ---------- */

  var masthead = document.getElementById("masthead");
  if (masthead) {
    var onScroll = function () {
      masthead.dataset.stuck = String(window.scrollY > 40);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- kaydırmada beliriş ---------- */

  var targets = document.querySelectorAll(".reveal");

  function revealAll() {
    targets.forEach(function (el) { el.classList.add("is-in"); });
  }

  if (!("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    revealAll();
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });

    targets.forEach(function (el) { io.observe(el); });

    // Emniyet ağı: gözlemci hiç ateşlenmezse (kare üretmeyen ortamlar,
    // sekme arka planda açıldıysa) içerik gizli kalmasın.
    setTimeout(function () {
      var seen = document.querySelectorAll(".reveal.is-in").length;
      if (seen === 0) revealAll();
    }, 1600);
  }

  /* ---------- menü sayfası: hangi bölümdeyiz ---------- */

  var menuNav = document.querySelector(".menu-nav");
  if (menuNav && "IntersectionObserver" in window) {
    var links = {};
    menuNav.querySelectorAll("a[href^='#']").forEach(function (a) {
      links[a.getAttribute("href").slice(1)] = a;
    });

    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var a = links[entry.target.id];
        if (!a) return;
        if (entry.isIntersecting) {
          Object.keys(links).forEach(function (k) { links[k].removeAttribute("aria-current"); });
          a.setAttribute("aria-current", "true");
        }
      });
    }, { rootMargin: "-20% 0px -70% 0px" });

    document.querySelectorAll(".course-block[id]").forEach(function (s) { spy.observe(s); });
  }

  /* ---------- yemek fotoğrafı penceresi ----------
     Yalnızca fotoğrafı olan satırlarda düğme var; içerik o satırdan
     okunur, ayrıca bir liste tutulmaz. */

  var viewer = document.getElementById("viewer");
  if (viewer) {
    var vImg = document.getElementById("viewer-img");
    var vWebp = document.getElementById("viewer-webp");
    var vName = document.getElementById("viewer-name");
    var vNote = document.getElementById("viewer-note");
    var vPrice = document.getElementById("viewer-price");
    var lastFocus = null;
    var hideTimer = null;

    function openViewer(btn) {
      var dish = btn.closest(".dish");
      var name = dish.querySelector(".dish__name");
      var note = dish.querySelector(".dish__note");
      var price = dish.querySelector(".dish__price");
      var img = btn.dataset.peek;

      // ad alınırken fotoğraf düğmesi ve rozetler dışarıda bırakılır
      var clean = name.cloneNode(true);
      clean.querySelectorAll(".dish__peek, .tag").forEach(function (n) { n.remove(); });

      // alt metin için yalnızca o an görünen dil; iki dil birleşince
      // "Kuzu Boyun TandırSlow-fired Lamb Neck" gibi okunuyordu
      var solo = clean.cloneNode(true);
      var lang = root.getAttribute("data-lang");
      solo.querySelectorAll("[lang]").forEach(function (n) {
        if (n.getAttribute("lang") !== lang) n.remove();
      });

      vWebp.srcset = "img/" + img + ".webp";
      vImg.src = "img/" + img + ".jpg";
      vImg.alt = solo.textContent.replace(/\s+/g, " ").trim();
      vName.innerHTML = clean.innerHTML;      // iki dil de kalır, CSS seçer
      vNote.innerHTML = note ? note.innerHTML : "";
      vNote.hidden = !note;
      vPrice.textContent = price ? price.textContent.trim() : "";

      lastFocus = btn;
      // Kapatma zamanlayıcısı hâlâ beklemede olabilir; iptal edilmezse
      // hemen ardından açılan pencereyi gizliyor.
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
      viewer.hidden = false;
      // Geçişin çalışması için stilin bir kez hesaplanması yeterli.
      // requestAnimationFrame'e bağlanmıyoruz: kare üretmeyen ortamlarda
      // ve arka plandaki sekmelerde hiç ateşlenmiyor, pencere açılmıyordu.
      void viewer.offsetWidth;
      viewer.dataset.open = "true";
      viewer.querySelector("[data-viewer-close]").focus();
      document.body.style.overflow = "hidden";
    }

    function closeViewer() {
      viewer.dataset.open = "false";
      document.body.style.overflow = "";
      hideTimer = setTimeout(function () { viewer.hidden = true; hideTimer = null; }, 300);
      if (lastFocus) lastFocus.focus();
    }

    document.querySelectorAll("[data-peek]").forEach(function (b) {
      b.addEventListener("click", function () { openViewer(b); });
    });

    viewer.addEventListener("click", function (e) {
      // boşluğa tıklamak da kapatır, kutunun içi kapatmaz
      if (e.target === viewer || e.target.closest("[data-viewer-close]")) closeViewer();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && viewer.dataset.open === "true") closeViewer();
    });
  }

  /* ---------- rezervasyon talebi ----------
     Sunucu gerektirmeden çalışsın diye form, girilenleri bir WhatsApp
     mesajına çevirir. Gerçek bir form servisi bağlanacaksa (Formspree vb.)
     aşağıdaki ENDPOINT'i doldurmak yeterli. */

  var ENDPOINT = ""; // örn. "https://formspree.io/f/xxxxxxx"
  var WA = "905426242468";

  var form = document.getElementById("book-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      if (!form.reportValidity()) return;

      var d = new FormData(form);
      var lang = root.getAttribute("data-lang");

      var tarih = d.get("tarih") || "";
      if (tarih) {
        var p = tarih.split("-");
        tarih = p[2] + "." + p[1] + "." + p[0];
      }

      var lines = lang === "en"
        ? ["Reservation request — Avlu", "",
           "Name: " + d.get("ad"),
           "Date: " + tarih,
           "Time: " + d.get("saat"),
           "Guests: " + d.get("kisi"),
           "Phone: " + d.get("tel")]
        : ["Rezervasyon talebi — Avlu", "",
           "Ad soyad: " + d.get("ad"),
           "Tarih: " + tarih,
           "Saat: " + d.get("saat"),
           "Kişi: " + d.get("kisi"),
           "Telefon: " + d.get("tel")];

      var note = (d.get("not") || "").trim();
      if (note) lines.push((lang === "en" ? "Note: " : "Not: ") + note);

      if (ENDPOINT) {
        fetch(ENDPOINT, {
          method: "POST",
          headers: { "Accept": "application/json" },
          body: d
        }).then(function () {
          form.reset();
        });
        return;
      }

      window.open("https://wa.me/" + WA + "?text=" + encodeURIComponent(lines.join("\n")), "_blank", "noopener");
    });
  }

  /* ---------- yıl ---------- */

  document.querySelectorAll("#yil").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
