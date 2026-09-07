/* Kemer — sayfa davranışları */

(function () {
  "use strict";

  /* Üretilen çeviri sayfaları bir alt klasörde durur;
     JS içinde kurulan görsel yolları bu önekle çözülür. */
  var KOK = window.KOK || "";

  var kok = document.documentElement;

  /* ---------- dil ----------
     Sözlükler ve dil listesi i18n/ klasöründe; kurulum <head> içinde
     i18n/i18n.js ile yapılıyor. Burada yalnızca uygulama tetikleniyor. */

  if (window.I18N) window.I18N.baslat();

  /* ---------- giriş görselleri ---------- */

  var giris = document.querySelector(".giris");
  if (giris) {
    var kareler = [].slice.call(giris.querySelectorAll(".giris__kare"));
    var noktalar = [].slice.call(giris.querySelectorAll("[data-git]"));
    var sira = 0, sayac = null, BEKLE = 6000;
    var sakin = window.matchMedia("(prefers-reduced-motion: reduce)");

    function goster(y) {
      sira = (y + kareler.length) % kareler.length;
      kareler.forEach(function (k, i) { k.dataset.etkin = String(i === sira); });
      noktalar.forEach(function (n, i) {
        if (i === sira) n.setAttribute("aria-current", "true");
        else n.removeAttribute("aria-current");
      });
    }
    function basla() {
      if (sakin.matches || kareler.length < 2) return;
      dur();
      sayac = setInterval(function () { goster(sira + 1); }, BEKLE);
    }
    function dur() { if (sayac) { clearInterval(sayac); sayac = null; } }

    giris.querySelectorAll("[data-adim]").forEach(function (b) {
      b.addEventListener("click", function () { goster(sira + Number(b.dataset.adim)); basla(); });
    });
    noktalar.forEach(function (n) {
      n.addEventListener("click", function () { goster(Number(n.dataset.git)); basla(); });
    });

    giris.addEventListener("mouseenter", dur);
    giris.addEventListener("mouseleave", basla);
    giris.addEventListener("focusin", dur);
    giris.addEventListener("focusout", basla);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) dur(); else basla();
    });

    goster(0);
    basla();
  }

  /* ---------- başlık çubuğu ---------- */

  var bar = document.getElementById("ustbar");
  if (bar) {
    var kaydir = function () { bar.dataset.yapisti = String(window.scrollY > 40); };
    window.addEventListener("scroll", kaydir, { passive: true });
    kaydir();
  }

  /* ---------- kaydırmada beliriş ---------- */

  var hedefler = document.querySelectorAll(".belir");
  function hepsiniAc() { hedefler.forEach(function (e) { e.classList.add("acik"); }); }

  if (!("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    hepsiniAc();
  } else {
    var izle = new IntersectionObserver(function (girenler) {
      girenler.forEach(function (g) {
        if (!g.isIntersecting) return;
        g.target.classList.add("acik");
        izle.unobserve(g.target);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });
    hedefler.forEach(function (e) { izle.observe(e); });

    // Gözlemci hiç ateşlenmezse içerik gizli kalmasın.
    setTimeout(function () {
      if (document.querySelectorAll(".belir.acik").length === 0) hepsiniAc();
    }, 1600);
  }

  /* ---------- menü: hangi bölümdeyiz ---------- */

  var menuGez = document.querySelector(".menu-gez");
  if (menuGez && "IntersectionObserver" in window) {
    var linkler = {};
    menuGez.querySelectorAll("a[href^='#']").forEach(function (a) {
      linkler[a.getAttribute("href").slice(1)] = a;
    });
    var gozcu = new IntersectionObserver(function (girenler) {
      girenler.forEach(function (g) {
        var a = linkler[g.target.id];
        if (!a || !g.isIntersecting) return;
        Object.keys(linkler).forEach(function (k) { linkler[k].removeAttribute("aria-current"); });
        a.setAttribute("aria-current", "true");
      });
    }, { rootMargin: "-20% 0px -70% 0px" });
    document.querySelectorAll(".bolum[id]").forEach(function (s) { gozcu.observe(s); });
  }

  /* ---------- yemek fotoğrafı penceresi ---------- */

  var gosterge = document.getElementById("gosterge");
  if (gosterge) {
    var gGorsel = document.getElementById("gosterge-img");
    var gWebp = document.getElementById("gosterge-webp");
    var gAd = document.getElementById("gosterge-ad");
    var gNot = document.getElementById("gosterge-not");
    var gFiyat = document.getElementById("gosterge-fiyat");
    var sonOdak = null, gizleSayac = null;

    function ac(dugme) {
      var yemek = dugme.closest(".yemek");
      var ad = yemek.querySelector(".yemek__ad");
      var not = yemek.querySelector(".yemek__not");
      var fiyat = yemek.querySelector(".yemek__fiyat");
      var g = dugme.dataset.bakis;

      var temiz = ad.cloneNode(true);
      temiz.querySelectorAll(".bakis, .rozet").forEach(function (n) { n.remove(); });

      gWebp.srcset = KOK + "img/" + g + ".webp";
      gGorsel.src = KOK + "img/" + g + ".jpg";
      gGorsel.alt = temiz.textContent.replace(/\s+/g, " ").trim();
      gAd.innerHTML = temiz.innerHTML;
      gNot.innerHTML = not ? not.innerHTML : "";
      gNot.hidden = !not;
      gFiyat.textContent = fiyat ? fiyat.textContent.trim() : "";

      sonOdak = dugme;
      if (gizleSayac) { clearTimeout(gizleSayac); gizleSayac = null; }
      gosterge.hidden = false;
      void gosterge.offsetWidth;              // geçişin çalışması için stil hesaplansın
      gosterge.dataset.acik = "true";
      gosterge.querySelector("[data-kapat]").focus();
      document.body.style.overflow = "hidden";
    }

    function kapat() {
      gosterge.dataset.acik = "false";
      document.body.style.overflow = "";
      gizleSayac = setTimeout(function () { gosterge.hidden = true; gizleSayac = null; }, 300);
      if (sonOdak) sonOdak.focus();
    }

    document.querySelectorAll("[data-bakis]").forEach(function (b) {
      b.addEventListener("click", function () { ac(b); });
    });
    gosterge.addEventListener("click", function (e) {
      if (e.target === gosterge || e.target.closest("[data-kapat]")) kapat();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && gosterge.dataset.acik === "true") kapat();
    });
  }

  /* ---------- rezervasyon talebi ----------
     Restoranın Google kaydında telefon numarası yok. Numara öğrenilince
     WA'ya yazmak yeterli; o zaman form WhatsApp'a yönlenir. Numara yoksa
     talep e-postaya gider. */

  var WA = "905426242468";                  // Google kaydındaki numara
  var EPOSTA = "";
  var UCNOKTA = "";                         // örn. "https://formspree.io/f/xxxxxxx"

  var form = document.getElementById("ayirt-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;

      var d = new FormData(form);
      var c = window.I18N ? window.I18N.t : function (k, v) { return v; };

      var tarih = d.get("tarih") || "";
      if (tarih) { var p = tarih.split("-"); tarih = p[2] + "." + p[1] + "." + p[0]; }

      /* Etiketler sözlükten gelir; yeni dil eklenince bu blok değişmez. */
      var satirlar = [c("mail-baslik", "Rezervasyon talebi — Kemer"), "",
        c("mail-ad", "Ad soyad") + ": " + d.get("ad"),
        c("mail-tarih", "Tarih") + ": " + tarih,
        c("mail-saat", "Saat") + ": " + d.get("saat"),
        c("mail-kisi", "Kişi") + ": " + d.get("kisi"),
        c("mail-tel", "Telefon") + ": " + d.get("tel")];

      var not = (d.get("not") || "").trim();
      if (not) satirlar.push(c("mail-not", "Not") + ": " + not);

      if (UCNOKTA) {
        fetch(UCNOKTA, { method: "POST", headers: { Accept: "application/json" }, body: d })
          .then(function () { form.reset(); });
        return;
      }
      if (WA) {
        window.open("https://wa.me/" + WA + "?text=" + encodeURIComponent(satirlar.join("\n")),
                    "_blank", "noopener");
        return;
      }
      window.location.href = "mailto:" + EPOSTA +
        "?subject=" + encodeURIComponent(satirlar[0]) +
        "&body=" + encodeURIComponent(satirlar.slice(2).join("\n"));
    });
  }

  /* ---------- yıl ---------- */
  document.querySelectorAll("#yil").forEach(function (e) {
    e.textContent = String(new Date().getFullYear());
  });
})();
