# Dil altyapısı

`avlu`, `kemer` ve `sakiz` sitelerinde her dil **kendi adresinde** yayınlanır:

```
demo/avlu/          → Türkçe   (kaynak HTML)
demo/avlu/en/       → İngilizce (üretilir, depoda durmaz)
```

Kaynak HTML yalnızca Türkçeyi taşır; metinler anahtarla işaretlidir:

```html
<span data-i18n="masa-ayirt">Masa ayırt</span>
```

Çeviriler `<site>/i18n/<kod>.js` dosyalarında durur. `tools/build-i18n.py`
bu ikisini birleştirip her dil için ayrı sayfa üretir. Dil sayısı arttıkça
kaynak HTML büyümez.

## Yeni dil eklemek

İki adım, HTML'e dokunulmaz:

1. `i18n/en.js` dosyasını `i18n/<kod>.js` olarak kopyalayın, içindeki
   `.en` son eklerini `<kod>` yapın, değerleri çevirin. Dosyada üç blok var:
   `sozluk` (sayfa metinleri), `sayfa` (title ve meta etiketleri),
   `calisma` (rezervasyon e-postası gibi JS içinden kurulan metinler).
2. `i18n/i18n.js` içindeki `DILLER` dizisine bir satır ekleyin:

```js
{ kod: "de", etiket: "DE", ad: "Deutsch", locale: "de_DE" }
```

Dil düğmesi bu listeden üretilir, kendiliğinden görünür. Çevrilmemiş
anahtarlar Türkçe kalır ve derleme çıktısında sayısıyla birlikte listelenir —
yarım çeviriyle yayına çıkıp sonra tamamlayabilirsiniz.

## Üretim ve yayın

Sayfalar depoda durmaz; `.github/workflows/pages.yml` her push'ta üretir.
Yerelde denemek için:

```bash
mkdir -p /tmp/_site && rsync -a --exclude '.git' ./ /tmp/_site/ && python3 tools/build-i18n.py /tmp/_site && (cd /tmp/_site && python3 -m http.server 8000)
```

Betik deponun bir **kopyası** üzerinde çalışır; kaynak ağacı değiştirmez.

> **Yayına almadan önce:** GitHub'da `Settings → Pages → Build and deployment
> → Source` ayarını **GitHub Actions** yapmanız gerekiyor. Şu an Pages dalı
> doğrudan yayınlıyor; o hâlde üretilen `/en/` sayfaları yayına çıkmaz.

Site adresi değişirse (restoran kendi alan adına geçerse) `tools/build-i18n.py`
başındaki `TABAN` sabitini güncellemek yeterli — canonical, hreflang, sitemap
ve `og:image` hepsi oradan türer.

## SEO

Her sayfa şunları taşır:

- `<link rel="canonical">` — kendi adresine
- `<link rel="alternate" hreflang="…">` — her dil + `x-default` (Türkçe)
- Dile göre çevrilmiş `<title>`, `meta description`, `og:title`,
  `og:description`, `og:locale`
- Mutlak `og:image` (paylaşım araçları göreli yolu çözemez)

Ayrıca her site için `sitemap.xml` (hreflang bağlantılarıyla) ve kökte
`robots.txt` üretilir.

Dil düğmesi `<button>` değil `<a>`: arama motoru diller arası bağlantıyı
izleyebiliyor, JS kapalıyken de çalışıyor.

## Ziyaretçi hangi dili görür

`i18n/i18n.js` içindeki sıra:

1. `?lang=en` bağlantı parametresi — o dilin adresine yönlendirir ve tercihi
   kaydeder.
2. Kullanıcının daha önce düğmeden yaptığı seçim (`localStorage`).
3. **Tarayıcı / işletim sistemi dili** — oturumda yalnızca bir kez, eşleşen
   dilin adresine yönlendirir. `de-AT` gibi bölgeli kodlar `de` ile eşleşir.
4. Hiçbiri tutmazsa bulunduğu sayfanın dili.

Otomatik algılama `localStorage`'a yazmaz; kalıcı tercih yalnızca kullanıcı
düğmeye bastığında oluşur.

> **Bilinen risk:** 3. maddedeki otomatik yönlendirme JS ile yapılıyor ve
> Google JS'i çalıştırdığı için yönlendirmeyi izleyebilir. Türkçe adresi
> İngilizce içerikle indekslemesi ihtimal dahilinde. Bunu bilerek seçtik;
> canonical ve hreflang etiketleri doğru olduğu için Google'ın kümeyi doğru
> çözme şansı yüksek, ama garanti değil. Search Console'da "Uluslararası
> hedefleme" ve indekslenen sayfaların dili birkaç hafta izlenmeli. Sorun
> çıkarsa çözüm, yönlendirmeyi kaldırıp yerine üstte "This page is also
> available in English" çubuğu koymaktır — `i18n.js` içindeki tek bir blok.

## Kapsam dışı

`ardin` ve `atolye` tek dilli, dokunulmadı. Stüdyonun kendi sitesi
(`kodozen/index.html`) hâlâ eski çift-`<span>` yöntemini kullanıyor; aynı
yapıya taşınabilir ama bu iş kapsamına dahil edilmedi.
