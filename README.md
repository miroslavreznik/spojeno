# Spojeno

Česká webová aplikace pro spojení až 10 podkladů do jediného PDF. Funguje staticky na GitHub Pages, bez účtu a bez odesílání dokumentů na server.

## Funkce

- PDF, JPG, JPEG, PNG, WebP, BMP a vícestránkové TIFF. Rychlý převod DOC, DOCX a TXT pomocí Ream, bez LibreOffice a bez serveru.
- Volitelný kompatibilní převod LibreOffice pro složitější Word dokumenty a pro ODT/RTF. Stahuje se pouze při výběru kompatibilního režimu.
- Přetažení, změna pořadí, odebrání a otáčení stránek dokumentu po 90°.
- Vlastní název výstupu, A4 nebo původní velikost obrázků, stažení hotového PDF.
- 10 souborů; 50 MB na soubor, 25 MB na Office dokument, 150 MB celkem a nejvýše 1 000 stran výstupu.
- Při chybě kteréhokoli souboru aplikace nevydá neúplné PDF.
- Responzivní rozhraní a ovládání přes klávesnici.

## Spuštění a nasazení

Node.js 22 nebo novější. `npm ci`, `npm run build`, potom `npm run preview`.

Pro vývoj spusťte po přípravě runtime `npm run dev`. Testy: `npm test`.

V GitHub repozitáři zvolte **Settings → Pages → Source: GitHub Actions**. Přiložený workflow při změně větve main provede testy, sestavení a nasazení. Runtime se stahuje ze zamčené npm závislosti při sestavení a není uložen ve zdrojovém repozitáři. Relativní cesty podporují hostování v podadresáři `/spojeno/`.

Rychlý převod běží ve vlastním Web Workeru a nepotřebuje WebAssembly ani SharedArrayBuffer. Převodník má přibližně 1,5 MB před HTTP kompresí; písma se načítají jen podle rodin použitých v dokumentu, typicky další jednotky MB. Kód i písma jsou hostované na stejném webu. Neukládají se ani neposílají dokumenty a nepoužívá se žádná konverzní služba. Převod běžného 100kB DOC při místní regresní zkoušce trval přibližně 0,3 sekundy s již dostupnými písmy; nejde o garanci rychlosti na všech zařízeních.

Kompatibilní režim vyžaduje HTTPS nebo localhost, Service Workers, WebAssembly a SharedArrayBuffer. Vlastní `public/sw.js` doplňuje izolační hlavičky COOP/COEP na GitHub Pages a streamuje WASM ze tří menších částí. Před prvním nahráním dokumentů může jednou obnovit stránku. Runtime má asi 250 MB a stáhne se až po explicitním výběru kompatibilního režimu, nikoli jako automatický fallback. Příprava stahování probíhá před spuštěním vnitřního časového limitu LibreOffice; průběh odlišuje stahování, spouštění a vlastní převod. Timeout při spouštění už neoznačuje dokument za příliš velký. Cache API podle dostupného místa uchovává jen veřejný runtime. Pro tento režim doporučujeme aktuální Chrome/Edge na počítači.

## Soukromí a omezení

Dokumenty existují pouze v paměti otevřené karty. Nejsou odesílány, ukládány do Cache API, localStorage ani IndexedDB. Cache API obsahuje pouze veřejný převodník. Aplikace nemá analytiku, reklamy ani vzdálené fonty. Hosting obsluhuje běžné požadavky na veřejné soubory webu.

Před úředním použitím zkontrolujte výstup. Neprovádí se OCR, ověřená konverze ani validace PDF/A. Sloučení ruší platnost původních elektronických podpisů; nelze jím nahradit autorizovanou konverzi. Chráněná PDF je třeba předem odemknout. Převod Office může nahradit chybějící písma nebo změnit zalomení. Rychlý převod starého DOC nepodporuje všechny textové rámečky, kreslené objekty a komentáře; převodní zpráva se promítá do viditelného upozornění u výsledku. Není zaručena shoda rozložení s Wordem. Pro složité dokumenty lze zvolit kompatibilní režim nebo exportovat PDF v původní aplikaci. Obrázky se nepřekreslují nad 6 000 pixelů na delší straně; maximální vstupní rozlišení je 50 milionů pixelů. PDF formuláře je vhodné nejprve zploštit v původní aplikaci.

## Knihovny

- [pdf-lib](https://github.com/Hopding/pdf-lib), MIT
- [Ream](https://github.com/alex-krassavin/reamkit), MIT; rychlý převod DOC/DOCX/TXT
- [fflate](https://github.com/101arrowz/fflate), MIT
- [LibreOffice WASM converter](https://github.com/matbeedotcom/libreoffice-document-converter), MPL-2.0
- [UTIF.js](https://github.com/photopea/UTIF.js), MIT
- [Lucide](https://lucide.dev/), ISC
- Vite, MIT

LibreOffice runtime je distribuován beze změn. Odpovídající zdrojový kód a podmínky jsou v propojeném upstream repozitáři; build používá @matbee/libreoffice-converter 2.7.2.

Substituční písma Arimo, Tinos, Cousine, Carlito a Caladea pocházejí ze zamčených balíčků @expo-google-fonts. Jejich původní soubory LICENSE a LICENSE_FONT se distribuují s písmy v `fonts/`. Načítání písem neopouští původ webu. Regresní testy zahrnují české znaky čtené z hotového PDF nezávislým PDF.js, vícestránkové DOC/DOCX, UTF-8/UTF-16/Windows-1250 TXT a protokol prohlížečového workeru. Binární DOC fixture byla vytvořena pro tento projekt; žádné uživatelské dokumenty nejsou součástí repozitáře.
