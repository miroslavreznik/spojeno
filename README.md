# Spojeno

Česká webová aplikace pro spojení až 10 podkladů do jediného PDF. Funguje staticky na GitHub Pages, bez účtu a bez odesílání dokumentů na server.

## Funkce

- PDF, JPG, JPEG, PNG, WebP, BMP a vícestránkové TIFF; DOC, DOCX, ODT, RTF a TXT přes LibreOffice WASM.
- Přetažení, změna pořadí, odebrání a otáčení stránek dokumentu po 90°.
- Vlastní název výstupu, A4 nebo původní velikost obrázků, stažení hotového PDF.
- 10 souborů; 50 MB na soubor, 25 MB na Office dokument, 150 MB celkem a nejvýše 1 000 stran výstupu.
- Při chybě kteréhokoli souboru aplikace nevydá neúplné PDF.
- Responzivní rozhraní a ovládání přes klávesnici.

## Spuštění a nasazení

Node.js 22 nebo novější. `npm ci`, `npm run build`, potom `npm run preview`.

Pro vývoj spusťte po přípravě runtime `npm run dev`. Testy: `npm test`.

V GitHub repozitáři zvolte **Settings → Pages → Source: GitHub Actions**. Přiložený workflow při změně větve main provede testy, sestavení a nasazení. Runtime se stahuje ze zamčené npm závislosti při sestavení a není uložen ve zdrojovém repozitáři. Relativní cesty podporují hostování v podadresáři `/spojeno/`.

Převod Wordu vyžaduje HTTPS nebo localhost, Service Workers, WebAssembly a SharedArrayBuffer. Vlastní `public/sw.js` doplňuje izolační hlavičky COOP/COEP na GitHub Pages a streamuje WASM ze tří menších částí. Před prvním nahráním dokumentů může jednou obnovit stránku. PDF a obrázky nepotřebují LibreOffice. Office runtime má asi 250 MB a stáhne se až při prvním převodu textového dokumentu; podle dostupného místa se uloží do mezipaměti prohlížeče. Pro větší dokumenty doporučujeme aktuální Chrome/Edge na počítači. Jednotlivé runtime soubory mají pod 100 MB a sestavený web přibližně 250 MB.

## Soukromí a omezení

Dokumenty existují pouze v paměti otevřené karty. Nejsou odesílány, ukládány do Cache API, localStorage ani IndexedDB. Cache API obsahuje pouze veřejný převodník. Aplikace nemá analytiku, reklamy ani vzdálené fonty. Hosting obsluhuje běžné požadavky na veřejné soubory webu.

Před úředním použitím zkontrolujte výstup. Neprovádí se OCR, ověřená konverze ani validace PDF/A. Sloučení ruší platnost původních elektronických podpisů; nelze jím nahradit autorizovanou konverzi. Chráněná PDF je třeba předem odemknout. Převod Office může nahradit chybějící písma nebo změnit zalomení. Obrázky se nepřekreslují nad 6 000 pixelů na delší straně; maximální vstupní rozlišení je 50 milionů pixelů. PDF formuláře je vhodné nejprve zploštit v původní aplikaci.

## Knihovny

- [pdf-lib](https://github.com/Hopding/pdf-lib), MIT
- [LibreOffice WASM converter](https://github.com/matbeedotcom/libreoffice-document-converter), MPL-2.0
- [UTIF.js](https://github.com/photopea/UTIF.js), MIT
- [Lucide](https://lucide.dev/), ISC
- Vite, MIT

LibreOffice runtime je distribuován beze změn. Odpovídající zdrojový kód a podmínky jsou v propojeném upstream repozitáři; build používá @matbee/libreoffice-converter 2.7.2.
