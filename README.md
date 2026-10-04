# LangCard

Kendi Excel listenden İngilizce–Türkçe kelime kartları oluşturup çalışabileceğin, kurulum gerektirmeyen bir web uygulaması. Tek yapman gereken `index.html` dosyasını tarayıcıda açmak.

<!-- Buraya bir ekran görüntüsü ekleyin: ![LangCard](ekran-goruntusu.png) -->

## Özellikler

- **Kendi listeni yükle:** `.xlsx`, `.xls` veya `.csv` dosyası seç ya da sayfaya sürükleyip bırak. Hiçbir dosya sunucuya gönderilmez, her şey tarayıcında çalışır.
- **Hazır başlangıç listesi:** Dosya yüklemeden de 20 kelimelik bir örnek listeyle hemen başlayabilirsin.
- **Kart çevirme:** Kartın ön yüzünde kelime, arka yüzünde karşılığı ve (varsa) örnek cümle görünür.
- **Biliyorum / Tekrar çalış:** Kartları işaretle. İlerlemen tarayıcında saklanır, sayfayı kapatıp açsan da kaybolmaz.
- **Sadece bilmediklerim:** Bildiğin kartları gizleyip yalnızca tekrar etmen gerekenleri çalış.
- **Karıştır:** Kartları rastgele sırayla göster.
- **Yönü değiştir:** Önce İngilizceyi ya da önce Türkçeyi göster.
- **Sesli oku:** İngilizce kelimeyi sesli dinle (tarayıcı destekliyorsa).
- **Şablon indir:** Doğru formatta örnek bir Excel dosyası al.
- **Mobil uyumlu:** Telefonda kartı çevirmek için dokun, gezinmek için kaydır.
- **Erişilebilir:** Klavye ve ekran okuyucuyla kullanılabilir, koyu tema ve "hareketi azalt" ayarını destekler.

## Excel dosyası nasıl hazırlanmalı?

İlk sayfadaki ilk üç sütun okunur:

| A (İngilizce) | B (Türkçe) | C (Örnek cümle, isteğe bağlı) |
| --- | --- | --- |
| apple | elma | I eat an apple every morning. |
| to learn | öğrenmek | I want to learn a new language. |

- İlk satır başlık olabilir (`English`, `Türkçe` gibi). Başlık satırı otomatik atlanır.
- A veya B sütunu boş olan satırlar atlanır, yinelenen kelimeler tek karta indirilir.
- En fazla 5000 kart yüklenir.
- CSV dosyalarında `;`, `,` ve sekme ayırıcılar otomatik algılanır. Türkçe karakterler UTF-8 ve Windows-1254 kodlamasında doğru okunur.

Uygulamadaki **Şablon indir** düğmesi bu formatta hazır bir dosya verir.

## Klavye kısayolları

| Tuş | İşlev |
| --- | --- |
| Boşluk veya Enter | Kartı çevir |
| Sağ ok | Sonraki kart |
| Sol ok | Önceki kart |

## Çalıştırma

**Yerelde:** `index.html` dosyasına çift tıkla.

**GitHub Pages ile yayınlama:**

1. Repo sayfasında **Settings > Pages** bölümüne git.
2. **Source** olarak `Deploy from a branch` seç.
3. Branch olarak `main` ve klasör olarak `/ (root)` seç, **Save** de.
4. Birkaç dakika sonra site `https://<kullanici-adi>.github.io/LangCard` adresinde yayında olur.

## Proje yapısı

```
LangCard/
├── index.html   Sayfa iskeleti
├── styles.css   Görünüm (açık/koyu tema, mobil uyum)
├── script.js    Uygulama mantığı
└── README.md
```

## Teknik notlar

- Saf HTML, CSS ve JavaScript. Derleme adımı veya framework yok.
- Excel dosyaları [SheetJS](https://sheetjs.com/) ile okunur (CDN'den yüklenir). CDN'e ulaşılamazsa `.csv` dosyaları yine de çalışır.
- Liste, işaretlemeler ve tercihler tarayıcının `localStorage` alanında saklanır. Başka bir tarayıcıda veya cihazda görünmez.
- Yazı tipi olarak Google Fonts'tan Bricolage Grotesque kullanılır. Yüklenemezse sistem yazı tipine geçilir.
