/* Kodozen — bağımlılık yok, derleme adımı yok. */
(function () {
  "use strict";

  var sakin = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ----------------------------------------------------------
     yıl
     ---------------------------------------------------------- */
  var yil = document.getElementById("yil");
  if (yil) yil.textContent = String(new Date().getFullYear());

  /* ----------------------------------------------------------
     dil
     ------------------------------------------------------------
     Metinlerin ikisi de sayfada duruyor; görünürlüğü CSS seçiyor.
     Böylece geçiş anlık oluyor, ikinci bir istek gitmiyor ve
     JavaScript kapalıyken Türkçe metin olduğu gibi kalıyor.
     ---------------------------------------------------------- */
  var kok = document.documentElement;

  var BASLIK = {
    tr: "Kodozen · Web Tasarım Stüdyosu",
    en: "Kodozen · Web Design Studio"
  };
  var ACIKLAMA = {
    tr: "İzmir'de web tasarım stüdyosu. Kurumsal, e-ticaret, portfolyo ve rezervasyon siteleri, sosyal medya yönetimi. Örnek işlerimizi açıp gezebilirsiniz.",
    en: "A web design studio in İzmir. Corporate, e-commerce, portfolio and booking sites, plus social media. Open our example sites and click around."
  };

  function dilUygula(d) {
    kok.setAttribute("data-lang", d);
    kok.setAttribute("lang", d);
    document.title = BASLIK[d];
    var aciklama = document.querySelector('meta[name="description"]');
    if (aciklama) aciklama.setAttribute("content", ACIKLAMA[d]);
    document.querySelectorAll("[data-dil]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.dil === d));
    });
    try { localStorage.setItem("kodozen-dil", d); } catch (e) { /* gizli sekme */ }
  }

  document.querySelectorAll("[data-dil]").forEach(function (b) {
    b.addEventListener("click", function () { dilUygula(b.dataset.dil); });
  });

  var kayitliDil;
  try { kayitliDil = localStorage.getItem("kodozen-dil"); } catch (e) { kayitliDil = null; }
  if (kayitliDil !== "tr" && kayitliDil !== "en") {
    // İlk ziyaret: tarayıcı dili Türkçe değilse İngilizce aç.
    var tarayici = (navigator.language || "tr").slice(0, 2).toLowerCase();
    kayitliDil = tarayici === "tr" ? "tr" : "en";
  }
  dilUygula(kayitliDil);

  /* ----------------------------------------------------------
     üst barın kaydırma durumu
     ---------------------------------------------------------- */
  var ustbar = document.getElementById("ustbar");
  if (ustbar) {
    var bakiliyor = false;
    var tazele = function () {
      ustbar.dataset.kaydi = window.scrollY > 12 ? "true" : "false";
      bakiliyor = false;
    };
    window.addEventListener("scroll", function () {
      if (bakiliyor) return;
      bakiliyor = true;
      // rAF üretilmeyen ortamlarda da çalışsın diye setTimeout yedeği var.
      if (window.requestAnimationFrame) window.requestAnimationFrame(tazele);
      else setTimeout(tazele, 60);
    }, { passive: true });
    tazele();
  }

  /* ----------------------------------------------------------
     mobil menü
     ---------------------------------------------------------- */
  var menuDugme = document.querySelector(".menu-dugme");
  if (menuDugme && ustbar) {
    var menu = document.getElementById("ana-menu");

    var menuAyar = function (acik) {
      ustbar.dataset.menu = acik ? "acik" : "kapali";
      menuDugme.setAttribute("aria-expanded", acik ? "true" : "false");
    };

    menuDugme.addEventListener("click", function () {
      menuAyar(ustbar.dataset.menu !== "acik");
    });

    // Bağlantıya basınca kapansın; aynı sayfadaki bölüme gidiliyor.
    if (menu) {
      menu.addEventListener("click", function (e) {
        if (e.target.closest("a")) menuAyar(false);
      });
    }

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && ustbar.dataset.menu === "acik") {
        menuAyar(false);
        menuDugme.focus();
      }
    });

    // Geniş ekrana dönülünce açık kalmasın.
    var genisEkran = window.matchMedia("(min-width: 941px)");
    if (genisEkran.addEventListener) {
      genisEkran.addEventListener("change", function () {
        if (genisEkran.matches) menuAyar(false);
      });
    }

    menuAyar(false);
  }

  /* ----------------------------------------------------------
     beliriş
     ------------------------------------------------------------
     IntersectionObserver bulunmayan ya da hiç tetiklenmeyen
     ortamlarda sayfa boş kalmasın diye iki ayrı güvence var:
     API yoksa hepsi anında açılır, varsa da 1600 ms'lik bir
     zamanlayıcı geriye kalanları zorla açar.
     ---------------------------------------------------------- */
  var hedefler = [].slice.call(document.querySelectorAll(".belir"));

  function hepsiniAc() {
    hedefler.forEach(function (e) { e.classList.add("icerde"); });
  }

  if (sakin.matches || !("IntersectionObserver" in window)) {
    hepsiniAc();
  } else {
    var gozcu = new IntersectionObserver(function (girisler) {
      girisler.forEach(function (g) {
        if (!g.isIntersecting) return;
        g.target.classList.add("icerde");
        gozcu.unobserve(g.target);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.05 });

    hedefler.forEach(function (e) { gozcu.observe(e); });
    setTimeout(hepsiniAc, 1600);
  }

  /* ----------------------------------------------------------
     kaydırmaya bağlı hareketler
     ------------------------------------------------------------
     Üç iş yapıyor, hepsi tek bir rAF döngüsünde:

       1. Vitrin eğimi — giriş ekranları hafifçe yatık başlıyor,
          aşağı inildikçe okuyucuya dönüyor.
       2. Yığın ölçeği — üstüne bir sonraki kart binen iş kartı
          hafifçe küçülüp koyulaşıyor, altta kaldığı belli olsun.
       3. Kadran — hizmetler bölümündeki yay dönüyor.

     Hiçbiri kütüphane kullanmıyor; site "0 kütüphane" diyor ve
     bunun doğru kalması gerekiyor.
     ---------------------------------------------------------- */
  (function () {
    if (sakin.matches) return;

    var yerlesim = document.querySelector(".vitrin__yerlesim");
    var kartlar = [].slice.call(document.querySelectorAll(".is"));
    var genis = window.matchMedia("(min-width: 1000px) and (min-height: 660px)");

    var kelepce = function (x) { return x < 0 ? 0 : (x > 1 ? 1 : x); };
    var bekliyor = false;

    function ciz() {
      bekliyor = false;
      var ekran = window.innerHeight;

      /* 1 — vitrin eğimi */
      if (yerlesim) {
        var v = yerlesim.getBoundingClientRect();
        // Üst kenarı ekranın altındayken tam eğik, ekranın ortasına
        // geldiğinde tamamen dik.
        var ilerleme = kelepce((ekran - v.top) / (ekran * 0.75));
        yerlesim.style.setProperty("--egim", ((1 - ilerleme) * 13).toFixed(2) + "deg");
      }

      /* 2 — yığın ölçeği */
      if (genis.matches) {
        for (var i = 0; i < kartlar.length; i++) {
          var kart = kartlar[i], sonraki = kartlar[i + 1];
          if (!sonraki) {
            kart.style.setProperty("--yigin-olcek", "1");
            kart.style.filter = "";
            continue;
          }
          var k = kart.getBoundingClientRect(), s = sonraki.getBoundingClientRect();
          // Sonraki kart, bu kartın altını ne kadar kapattı?
          var ortu = kelepce((k.bottom - s.top) / k.height);
          kart.style.setProperty("--yigin-olcek", (1 - ortu * 0.055).toFixed(4));
          kart.style.filter = ortu > 0 ? "brightness(" + (1 - ortu * 0.28).toFixed(3) + ")" : "";
        }
      }

      /* 3 — kadran (aşağıda tanımlı; işlev bildirimi yukarı taşınır) */
      kadranCiz();
    }

    function istek() {
      if (bekliyor) return;
      bekliyor = true;
      if (window.requestAnimationFrame) window.requestAnimationFrame(ciz);
      else setTimeout(ciz, 60);
    }

    window.addEventListener("scroll", istek, { passive: true });
    window.addEventListener("resize", istek);
    if (genis.addEventListener) {
      genis.addEventListener("change", function () {
        // Dar ekrana geçilince satır içi kalıntıları temizle.
        if (!genis.matches) {
          kartlar.forEach(function (k) {
            k.style.removeProperty("--yigin-olcek");
            k.style.filter = "";
          });
        }
        istek();
      });
    }
    ciz();

    /* --- kadran ------------------------------------------------
       Bölümden geçilirken yay dönüyor, sabit işaretçiye gelen
       numaranın hizmeti sağda beliriyor. Kadran yalnızca ekran
       yeterince genişse açılıyor; dar ekranda kart ızgarası kalıyor.
       ------------------------------------------------------------ */
    var kadran = document.querySelector("[data-kadran]");
    var kadranGenis = window.matchMedia("(min-width: 1000px) and (min-height: 620px)");
    var disk, numaralar, hizmetler, sonHizmet = -1;

    function kadranKur() {
      if (!kadran) return;
      if (!kadranGenis.matches) {
        kadran.removeAttribute("data-etkin");
        if (hizmetler) hizmetler.forEach(function (h) { h.setAttribute("data-etkin", "true"); });
        return;
      }
      kadran.dataset.etkin = "true";
      disk = disk || kadran.querySelector(".kadran__disk");
      numaralar = numaralar || [].slice.call(kadran.querySelectorAll(".kadran__no"));
      hizmetler = hizmetler || [].slice.call(kadran.querySelectorAll(".hizmet"));
      sonHizmet = -1;
      kadranCiz();
    }

    function kadranCiz() {
      if (!kadran || kadran.dataset.etkin !== "true" || !hizmetler || !hizmetler.length) return;
      var r = kadran.getBoundingClientRect();
      var ekran = window.innerHeight;
      // Bölümün ne kadarı geçildi: yapışkan sahne boyunca 0 → 1
      var yol = r.height - ekran;
      var o = yol > 0 ? kelepce(-r.top / yol) : 0;
      var n = hizmetler.length;
      var i = Math.min(n - 1, Math.floor(o * n));
      if (i === sonHizmet) return;
      sonHizmet = i;

      /* Numara n, yay üzerinde (n-2)*21 derecede duruyor. i'nci numaranın
         sabit işaretçiye (0 derece) gelmesi için diskin dönmesi gereken
         açı A(i) + R = 0, yani R = (2 - i) * 21. Önce -i*21 yazmıştım;
         işaretçi hep iki numara ileriyi gösteriyordu. */
      if (disk) disk.style.setProperty("--aci", ((2 - i) * 21) + "deg");
      numaralar.forEach(function (e, j) {
        if (j === i) e.setAttribute("data-etkin", "true");
        else e.removeAttribute("data-etkin");
      });
      hizmetler.forEach(function (e, j) {
        if (j === i) e.setAttribute("data-etkin", "true");
        else e.removeAttribute("data-etkin");
      });
    }

    if (kadran) {
      kadranKur();
      if (kadranGenis.addEventListener) kadranGenis.addEventListener("change", kadranKur);
    }

  })();

  /* ----------------------------------------------------------
     vitrin videosu
     ------------------------------------------------------------
     Giriş çerçevesinin içinde beş demo sitesi sırayla kayıyor.
     Video gerçek tarayıcıdan kare kare çekildi — hero'da dönen
     şey stok bir görsel değil, işin kendisi.

     Adres çubuğundaki yazı kesme anlarında değişiyor; yoksa beş
     ayrı site olduğu anlaşılmıyor, tek uzun sayfa gibi duruyor.
     ---------------------------------------------------------- */
  (function () {
    var cerceve = document.querySelector(".cerceve--vitrin");
    if (!cerceve || sakin.matches || !window.fetch) return;

    var KAYNAK = "video/vitrin.mp4";
    var SURE = 3.2;                       // site başına saniye (96 kare / 30 fps)
    var SIRA = {
      tr: ["avlu — bahçe restoranı", "ardin — parfüm markası", "sakiz — meyhane",
           "atolye — oto servis", "kemer — lokal"],
      en: ["avlu — courtyard restaurant", "ardin — perfume brand", "sakiz — meyhane",
           "atolye — car service", "kemer — members' club"]
    };

    var SLUG = ["avlu", "ardin", "sakiz", "atolye", "kemer"];

    var ekran = cerceve.querySelector(".cerceve__ekran");
    var adres = cerceve.querySelector("[data-adres]");
    if (!ekran || !adres) return;

    /* Telefon karesi masaüstü videosuyla birlikte değişiyor. Önce sabit
       Avlu görüntüsü duruyordu; video Kemer'i gösterirken telefonda Avlu
       kalıyor, ikisi ayrı şeylermiş gibi duruyordu. */
    var telefonKare = document.querySelector(".vitrin__mobil");
    var telefonImg = document.querySelector("[data-telefon]");
    var telefonKaynak = document.querySelector("[data-telefon-kaynak]");

    // Değişimde boşluk görünmesin diye kareler önden indiriliyor.
    function telefonOnYukle() {
      SLUG.forEach(function (sl) {
        var im = new Image();
        im.src = "img/" + sl + "-mobil.webp";
      });
    }

    function telefonDegistir(sl) {
      if (!telefonImg || !telefonKare) return;
      if (telefonImg.dataset.slug === sl) return;
      telefonImg.dataset.slug = sl;
      telefonKare.dataset.degisiyor = "true";
      setTimeout(function () {
        if (telefonKaynak) telefonKaynak.srcset = "img/" + sl + "-mobil.webp";
        telefonImg.src = "img/" + sl + "-mobil.jpg";
        telefonKare.dataset.degisiyor = "false";
      }, 280);
    }

    /* Yalnızca geniş ekranda indiriliyor. Dosya 2,3 MB; telefonda çerçeve
       zaten küçülüyor, duran kare aynı işi görüyor ve mobil veriyi
       boşuna harcamıyoruz. */
    if (!window.matchMedia("(min-width: 900px)").matches) return;

    fetch(KAYNAK, { method: "HEAD" }).then(function (y) {
      if (!y.ok) return;                  // video henüz yok: duran kare kalsın
      kur();
    }).catch(function () { /* sorun değil */ });

    function kur() {
      var video = document.createElement("video");
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "");
      video.setAttribute("aria-hidden", "true");
      video.tabIndex = -1;
      video.preload = "auto";
      video.src = KAYNAK;
      ekran.appendChild(video);

      var sonIndeks = -1;
      document.querySelectorAll("[data-dil]").forEach(function (b) {
        b.addEventListener("click", function () { sonIndeks = -1; });
      });
      video.addEventListener("timeupdate", function () {
        var liste = SIRA[kok.getAttribute("data-lang") === "en" ? "en" : "tr"];
        var i = Math.floor(video.currentTime / SURE);
        if (i < 0) i = 0;
        if (i >= liste.length) i = liste.length - 1;
        if (i === sonIndeks) return;
        sonIndeks = i;
        // Önce soldur, yazıyı değiştir, sonra geri getir.
        cerceve.dataset.gecis = "true";
        telefonDegistir(SLUG[i]);
        setTimeout(function () {
          adres.textContent = liste[i];
          cerceve.dataset.gecis = "false";
        }, 250);
      });

      telefonOnYukle();

      var oynat = video.play();
      if (oynat && oynat.then) {
        oynat.then(function () { cerceve.dataset.video = "acik"; })
             .catch(function () { video.remove(); });
      } else {
        cerceve.dataset.video = "acik";
      }
    }
  })();

  /* ----------------------------------------------------------
     bant kartı — 3B nesne videosu
     ------------------------------------------------------------
     Dosya yoksa kart hiç açılmıyor; geriye sadece kayan yazı
     kalıyor. Böylece video üretilene kadar sayfada boş bir kutu
     durmuyor.
     ---------------------------------------------------------- */
  (function () {
    var kart = document.querySelector("[data-bant-kart]");
    if (!kart || sakin.matches || !window.fetch) return;

    var KAYNAK = "video/nesne.mp4";

    /* Dar telefonda kart 230 piksele iniyor; o boyutta nesne zaten
       seçilmiyor, 544 KB'ı boşuna indirmenin anlamı yok. Bant tek
       başına da çalışıyor. */
    if (!window.matchMedia("(min-width: 700px)").matches) return;

    fetch(KAYNAK, { method: "HEAD" }).then(function (y) {
      if (!y.ok) return;
      var video = document.createElement("video");
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "");
      video.setAttribute("aria-hidden", "true");
      video.tabIndex = -1;
      video.preload = "auto";
      video.src = KAYNAK;
      kart.appendChild(video);
      kart.hidden = false;

      var oynat = video.play();
      if (oynat && oynat.catch) {
        oynat.catch(function () { kart.hidden = true; video.remove(); });
      }
    }).catch(function () { /* video henüz yok */ });
  })();

  /* ----------------------------------------------------------
     giriş videosu
     ------------------------------------------------------------
     Dosyalar hazır olduğunda .giris__fon içine kaynak yazılır.
     Ekran genişliğine göre yalnızca gereken dosya indirilir;
     diğerini tarayıcı hiç istemez. Hareket tercihi kapalıysa
     video hiç açılmaz, degrade katmanı öylece kalır.
     ---------------------------------------------------------- */
  var fon = document.querySelector(".giris__fon");
  if (fon && !sakin.matches) {
    var DIKEY = "video/kodozen-9x16.mp4";
    var YATAY = "video/kodozen-16x9.mp4";
    var dar = window.matchMedia("(max-width: 760px)");

    var kur = function () {
      var kaynak = dar.matches ? DIKEY : YATAY;
      var video = fon.querySelector("video");

      if (!video) {
        video = document.createElement("video");
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.setAttribute("playsinline", "");
        video.setAttribute("aria-hidden", "true");
        video.tabIndex = -1;
        video.preload = "auto";
        fon.appendChild(video);
      }
      if (video.dataset.kaynak === kaynak) return;

      video.dataset.kaynak = kaynak;
      video.src = kaynak;

      var oynat = video.play();
      if (oynat && oynat.then) {
        oynat.then(function () {
          fon.dataset.video = "acik";
        }).catch(function () {
          // Tarayıcı izin vermedi ya da dosya yok: degrade katmanı kalsın.
          video.remove();
          fon.dataset.video = "bekliyor";
        });
      }
    };

    // Dosya gerçekten var mı? Yoksa boşuna <video> kurup hata basmayalım.
    if (window.fetch) {
      fetch(dar.matches ? DIKEY : YATAY, { method: "HEAD" })
        .then(function (y) { if (y.ok) kur(); })
        .catch(function () { /* video henüz yok, sorun değil */ });
    }

    if (dar.addEventListener) {
      dar.addEventListener("change", function () {
        if (fon.dataset.video === "acik") kur();
      });
    }
  }
})();
