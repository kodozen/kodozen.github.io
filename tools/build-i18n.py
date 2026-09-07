#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Çok dilli statik site üreteci.

Kaynak HTML varsayılan dili (Türkçe) taşır; metinler data-i18n anahtarlarıyla
işaretlidir. Bu betik her ek dil için <site>/<kod>/ altına ayrı bir sayfa
üretir, iki tarafa da canonical + hreflang etiketlerini yazar ve sitemap
çıkarır. Böylece her dil kendi URL'sinde aranabilir olur.

Kullanım:
    python3 tools/build-i18n.py <hedef-kok>

<hedef-kok> deponun bir kopyası olmalıdır; betik dosyaları yerinde değiştirir.
Kaynak ağacı kirletmemek için yayın akışı önce depoyu _site/ içine kopyalar.
"""
import json, os, re, sys, html

# Site adresi: alan adı değişirse yalnızca burası güncellenir.
TABAN = "https://kodozen.github.io"

SITELER = {
    "demo/avlu":  ["index.html", "menu.html"],
    "demo/kemer": ["index.html"],
    "demo/sakiz": ["index.html", "menu.html"],
}

# Üretilen sayfa bir alt klasörde durduğu için göreli yollar bir seviye kayar.
KOK_GEREKTIREN = ("img/", "video/", "assets/", "i18n/", "styles.css", "app.js", "favicon")


# ---------------------------------------------------------------- ayrıştırma

def _js_nesnesi(metin):
    """Sözlük dosyalarındaki nesne değişmezini sözlüğe çevirir.

    Dosyalar bu betiğin ürettiği biçimde; yine de elle düzenlenmiş olabilir
    diye yorumlar ve sondaki fazla virgüller temizlenir."""
    metin = re.sub(r'/\*.*?\*/', '', metin, flags=re.S)
    metin = re.sub(r'(^|[^:])//[^\n]*', r'\1', metin)
    metin = re.sub(r',(\s*[}\]])', r'\1', metin)
    return json.loads(metin)


def sozluk_oku(yol):
    ham = open(yol, encoding="utf-8").read()
    m = re.search(r'I18N\.sozluk\.[A-Za-z-]+\s*=\s*(\{.*?\n\});', ham, re.S)
    if not m:
        raise SystemExit("%s: I18N.sozluk ataması bulunamadı" % yol)
    d = {"metin": _js_nesnesi(m.group(1))}
    m2 = re.search(r'I18N\.sayfa\.[A-Za-z-]+\s*=\s*(\{.*?\n\});', ham, re.S)
    d["sayfa"] = _js_nesnesi(m2.group(1)) if m2 else {}
    m3 = re.search(r'I18N\.calisma\.[A-Za-z-]+\s*=\s*(\{.*?\n\});', ham, re.S)
    d["calisma"] = _js_nesnesi(m3.group(1)) if m3 else {}
    return d


def diller_oku(yol):
    ham = open(yol, encoding="utf-8").read()
    varsayilan = re.search(r'var VARSAYILAN\s*=\s*"([^"]+)"', ham).group(1)
    dizi = re.search(r'var DILLER\s*=\s*(\[.*?\n\s*\]);', ham, re.S).group(1)
    dizi = re.sub(r'([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:', r'\1"\2":', dizi)
    return varsayilan, _js_nesnesi(dizi)


# ---------------------------------------------------------------- dönüştürme

ETIKET = re.compile(r'<span\s+data-i18n="([^"]+)"\s*>', re.I)
SPAN   = re.compile(r'<span\b[^>]*>|</span\s*>', re.I)


def _span_kapat(s, bas):
    derinlik = 1
    for m in SPAN.finditer(s, bas):
        if m.group(0).lower().startswith("</"):
            derinlik -= 1
            if derinlik == 0:
                return m.start(), m.end()
        else:
            derinlik += 1
    raise ValueError("kapanmayan <span>")


def metinleri_cevir(s, sozluk, eksikler):
    """data-i18n işaretli düğümlerin içeriğini sözlükten yazar."""
    cikti, i = [], 0
    while True:
        m = ETIKET.search(s, i)
        if not m:
            cikti.append(s[i:])
            return "".join(cikti)
        ic_son, kapanis = _span_kapat(s, m.end())
        anahtar = m.group(1)
        cikti.append(s[i:m.start()])
        if anahtar in sozluk:
            govde = sozluk[anahtar]
        else:
            govde = s[m.end():ic_son]      # çevirisi yoksa varsayılan dil kalır
            eksikler.append(anahtar)
        cikti.append('<span data-i18n="%s">%s</span>' % (anahtar, govde))
        i = kapanis


def yollari_kaydir(s):
    """Bir alt klasöre inen sayfada göreli varlık yollarını ../ ile öteler."""
    def tek_yol(y):
        return "../" + y if y.startswith(KOK_GEREKTIREN) else y

    def degistir(m):
        oz, deger = m.group(1), m.group(2)
        if oz == "srcset":
            # srcset virgülle ayrılır ve her parça "yol tanım" biçimindedir
            parcalar = []
            for tek in deger.split(","):
                t = tek.strip()
                if not t:
                    continue
                yol, bosluk, tanim = t.partition(" ")
                parcalar.append(tek_yol(yol) + (bosluk + tanim if tanim else ""))
            return '%s="%s"' % (oz, ", ".join(parcalar))
        return '%s="%s"' % (oz, tek_yol(deger))

    return re.sub(r'\b(href|src|srcset|poster|content|data-src-[a-z]+)="([^"]*)"', degistir, s)


def bas_etiketleri(kod, kodlar, varsayilan, site, sayfa, meta):
    """canonical + hreflang + og:locale bloğu."""
    def adres(k):
        dizin = "" if k == varsayilan else k + "/"
        dosya = "" if sayfa == "index.html" else sayfa
        return "%s/%s/%s%s" % (TABAN, site, dizin, dosya)

    satir = ['<link rel="canonical" href="%s">' % adres(kod)]
    for k in kodlar:
        satir.append('<link rel="alternate" hreflang="%s" href="%s">' % (k, adres(k)))
    satir.append('<link rel="alternate" hreflang="x-default" href="%s">' % adres(varsayilan))
    return "\n".join(satir)


def sayfa_uret(kaynak_metin, kod, varsayilan, kodlar, site, sayfa, sozluk, dil_tanim):
    s = kaynak_metin
    eksikler = []
    alt = kod != varsayilan

    if alt:
        s = metinleri_cevir(s, sozluk["metin"], eksikler)
        s = s.replace('<html lang="%s">' % varsayilan, '<html lang="%s">' % kod, 1)

        m = sozluk["sayfa"].get(sayfa, {})
        if m.get("title"):
            s = re.sub(r'<title>.*?</title>', '<title>%s</title>' % html.escape(m["title"]), s, count=1, flags=re.S)
        for oz, anahtar in (('name="description"', "description"),
                            ('property="og:title"', "ogTitle"),
                            ('property="og:description"', "ogDescription")):
            if m.get(anahtar):
                s = re.sub(r'<meta %s content="[^"]*">' % re.escape(oz),
                           '<meta %s content="%s">' % (oz, html.escape(m[anahtar], quote=True)), s, count=1)
        s = re.sub(r'<meta property="og:locale" content="[^"]*">',
                   '<meta property="og:locale" content="%s">' % dil_tanim.get("locale", kod), s, count=1)
        s = yollari_kaydir(s)
        # Paylaşım araçları göreli yolu çözemez; og:image mutlak olmalı
        s = re.sub(r'<meta property="og:image" content="\.\./([^"]*)">',
                   lambda mm: '<meta property="og:image" content="%s/%s/%s">'
                              % (TABAN, site, mm.group(1)), s, count=1)
        # Kök öneki app.js'in kurduğu "img/..." yolları için; çalışma metinleri
        # sayfaya gömülür, böylece sözlüğü ayrıca indirmek gerekmez.
        gomulu = ('<script>window.KOK="../";window.I18N_CALISMA=%s;</script>\n'
                  % json.dumps(sozluk["calisma"], ensure_ascii=False))
        s = s.replace('<script src="../i18n/i18n.js', gomulu + '<script src="../i18n/i18n.js', 1)

    blok = bas_etiketleri(kod, kodlar, varsayilan, site, sayfa, sozluk["sayfa"].get(sayfa, {}))
    s = re.sub(r'(<meta name="viewport"[^>]*>)', r'\1\n' + blok.replace('\\', '\\\\'), s, count=1)
    return s, eksikler


# ---------------------------------------------------------------------- akış

def main(kok):
    toplam_eksik = 0
    for site, sayfalar in SITELER.items():
        sdizin = os.path.join(kok, site)
        varsayilan, diller = diller_oku(os.path.join(sdizin, "i18n", "i18n.js"))
        kodlar = [d["kod"] for d in diller]

        sozlukler = {varsayilan: {"metin": {}, "sayfa": {}, "calisma": {}}}
        for d in diller:
            if d["kod"] != varsayilan:
                sozlukler[d["kod"]] = sozluk_oku(os.path.join(sdizin, "i18n", d["kod"] + ".js"))

        # Kaynaklar önce okunur: TR sayfası yerinde güncellendiği için
        # sonraki diller onun değil, özgün metnin üzerinden üretilmeli.
        kaynaklar = {p: open(os.path.join(sdizin, p), encoding="utf-8").read()
                     for p in sayfalar}

        for d in diller:
            kod = d["kod"]
            hedef_dizin = sdizin if kod == varsayilan else os.path.join(sdizin, kod)
            os.makedirs(hedef_dizin, exist_ok=True)
            for sayfa in sayfalar:
                s, eksikler = sayfa_uret(kaynaklar[sayfa], kod, varsayilan,
                                         kodlar, site, sayfa, sozlukler[kod], d)
                open(os.path.join(hedef_dizin, sayfa), "w", encoding="utf-8").write(s)
                if eksikler:
                    toplam_eksik += len(eksikler)
                    print("  ! %s/%s/%s: %d anahtarın çevirisi yok (%s…)"
                          % (site, kod, sayfa, len(eksikler), ", ".join(eksikler[:3])))
            print("  %s [%s] %d sayfa" % (site, kod, len(sayfalar)))

        with open(os.path.join(sdizin, "sitemap.xml"), "w", encoding="utf-8") as f:
            f.write('<?xml version="1.0" encoding="UTF-8"?>\n')
            f.write('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
                    'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n')
            for sayfa in sayfalar:
                for d in diller:
                    dizin = "" if d["kod"] == varsayilan else d["kod"] + "/"
                    dosya = "" if sayfa == "index.html" else sayfa
                    f.write("  <url>\n    <loc>%s/%s/%s%s</loc>\n" % (TABAN, site, dizin, dosya))
                    for e in diller:
                        edizin = "" if e["kod"] == varsayilan else e["kod"] + "/"
                        f.write('    <xhtml:link rel="alternate" hreflang="%s" href="%s/%s/%s%s"/>\n'
                                % (e["kod"], TABAN, site, edizin, dosya))
                    f.write('    <xhtml:link rel="alternate" hreflang="x-default" href="%s/%s/%s"/>\n'
                            % (TABAN, site, dosya))
                    f.write("  </url>\n")
            f.write("</urlset>\n")

    # Arama motorlarına sitemap'leri bildir
    with open(os.path.join(kok, "robots.txt"), "w", encoding="utf-8") as f:
        f.write("User-agent: *\nAllow: /\n\n")
        for site in SITELER:
            f.write("Sitemap: %s/%s/sitemap.xml\n" % (TABAN, site))

    print("bitti%s" % (" — %d eksik çeviri" % toplam_eksik if toplam_eksik else ""))
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    sys.exit(main(sys.argv[1]))
