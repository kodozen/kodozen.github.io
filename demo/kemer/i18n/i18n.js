/* Kemer — dil altyapısı.
   Her dil kendi adresinde: Türkçe kökte, diğerleri <kod>/ altında. Sayfaları
   tools/build-i18n.py sözlüklerden üretir. Bu dosya yalnızca dil düğmesini,
   ilk ziyaretteki dil algılamasını ve JS içinden kurulan metinleri yönetir.

   Yeni dil eklemek için: i18n/<kod>.js sözlüğünü oluştur, aşağıdaki DILLER
   dizisine bir satır ekle, üretici betiği çalıştır. HTML'e dokunulmaz. */
(function (w, d) {
  "use strict";

  var VARSAYILAN = "tr";                 // kaynak HTML'in dili
  var ANAHTAR    = "kemer-dil";         // localStorage anahtarı
  var DILLER = [
    { kod: "tr", etiket: "TR", ad: "Türkçe",  locale: "tr_TR" },
    { kod: "en", etiket: "EN", ad: "English", locale: "en_US" }
  ];

  var I18N = w.I18N = w.I18N || {};
  I18N.varsayilan = VARSAYILAN;
  I18N.diller = DILLER;
  I18N.aktif = d.documentElement.lang || VARSAYILAN;

  /* Üretilen sayfalar bir alt klasörde durur; kök ön eki oradan gelir. */
  var KOK = w.KOK || "";
  var dosya = w.location.pathname.split("/").pop();
  if (dosya === "index.html") dosya = "";

  function gecerli(kod) {
    for (var i = 0; i < DILLER.length; i++) if (DILLER[i].kod === kod) return true;
    return false;
  }

  /* Bir dilin bu sayfadaki karşılığının adresi. */
  function adres(kod) {
    return KOK + (kod === VARSAYILAN ? "" : kod + "/") + dosya;
  }

  /* Tarayıcı/işletim sistemi dilinden en iyi eşleşme.
     "de-AT" gibi bölgeli kodlar da "de" ile eşleşsin diye ön ek kırpılır. */
  function tarayiciDili() {
    var istek = (w.navigator.languages && w.navigator.languages.length)
      ? w.navigator.languages
      : [w.navigator.language || ""];
    for (var i = 0; i < istek.length; i++) {
      var tam = String(istek[i]).toLowerCase(), kisa = tam.split("-")[0];
      for (var j = 0; j < DILLER.length; j++) {
        var k = DILLER[j].kod.toLowerCase();
        if (k === tam || k === kisa || k.split("-")[0] === kisa) return DILLER[j].kod;
      }
    }
    return VARSAYILAN;
  }
  I18N.tarayiciDili = tarayiciDili;

  /* JS içinden kurulan metinler — üretici sayfaya gömer. */
  I18N.t = function (anahtar, varsayilanMetin) {
    var c = w.I18N_CALISMA;
    return (c && Object.prototype.hasOwnProperty.call(c, anahtar)) ? c[anahtar] : varsayilanMetin;
  };

  /* ---------- ilk ziyarette dil algılama ----------
     Yalnızca kullanıcının kendi seçimi yokken ve oturumda bir kez çalışır;
     ?lang= varsa hiç devreye girmez. Not: arama motorları JS'i çalıştırdığı
     için bu yönlendirmeyi izleyebilir — ayrıntı için demo/DILLER.md. */
  var soru = /[?&]lang=([A-Za-z-]+)/.exec(w.location.search);
  var secim = null;
  try { secim = w.localStorage.getItem(ANAHTAR); } catch (e) { /* gizli sekme */ }

  if (soru && gecerli(soru[1])) {
    try { w.localStorage.setItem(ANAHTAR, soru[1]); } catch (e) {}
    if (soru[1] !== I18N.aktif) w.location.replace(adres(soru[1]));
  } else if (gecerli(secim)) {
    if (secim !== I18N.aktif) w.location.replace(adres(secim));
  } else {
    var atlandi = false;
    try { atlandi = w.sessionStorage.getItem(ANAHTAR + "-bakildi") === "1"; } catch (e) {}
    if (!atlandi) {
      try { w.sessionStorage.setItem(ANAHTAR + "-bakildi", "1"); } catch (e) {}
      var tespit = tarayiciDili();
      /* Algılama localStorage'a yazılmaz: kalıcı tercih yalnızca
         kullanıcının düğmeye basmasıyla oluşur. */
      if (tespit !== I18N.aktif) w.location.replace(adres(tespit));
    }
  }

  /* ---------- dil düğmesi ----------
     Bağlantı olarak üretilir: JS kapalıyken de çalışır, arama motoru izler. */
  function dugmeleriKur() {
    var kutu = d.querySelector("[data-i18n-switch]");
    if (!kutu) return;
    kutu.innerHTML = "";
    DILLER.forEach(function (x) {
      var a = d.createElement("a");
      a.href = adres(x.kod);
      a.textContent = x.etiket;
      a.setAttribute("lang", x.kod);
      a.setAttribute("hreflang", x.kod);
      a.setAttribute("aria-label", x.ad);
      if (x.kod === I18N.aktif) a.setAttribute("aria-current", "true");
      a.addEventListener("click", function () {
        try { w.localStorage.setItem(ANAHTAR, x.kod); } catch (e) {}
      });
      kutu.appendChild(a);
    });
  }

  I18N.baslat = dugmeleriKur;
  d.documentElement.classList.add("js");
})(window, document);
