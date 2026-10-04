(() => {
  'use strict';

  /* ---------- Ayarlar ---------- */
  const STORAGE = {
    deck: 'langcard:deck',
    known: 'langcard:known',
    prefs: 'langcard:prefs',
  };
  const MAX_CARDS = 5000;
  const FLIP_MS = 220;
  const ALLOWED_EXT = ['xlsx', 'xls', 'csv', 'tsv', 'txt'];

  const SAMPLE_NAME = 'Başlangıç kelimeleri';
  const SAMPLE_CARDS = [
    ['apple', 'elma', 'I eat an apple every morning.'],
    ['friend', 'arkadaş', 'She is my best friend.'],
    ['to learn', 'öğrenmek', 'I want to learn a new language.'],
    ['library', 'kütüphane', 'The library closes at eight.'],
    ['tomorrow', 'yarın', 'We will meet tomorrow.'],
    ['to understand', 'anlamak', "I don't understand this question."],
    ['difficult', 'zor', 'The exam was very difficult.'],
    ['weather', 'hava durumu', 'The weather is nice today.'],
    ['to forget', 'unutmak', "Don't forget your keys."],
    ['journey', 'yolculuk', 'The journey took three hours.'],
    ['neighbour', 'komşu', 'My neighbour has a small garden.'],
    ['breakfast', 'kahvaltı', 'We have breakfast at seven.'],
    ['meaning', 'anlam', 'What is the meaning of this word?'],
    ['to remember', 'hatırlamak', "I can't remember his name."],
    ['beautiful', 'güzel', 'What a beautiful view!'],
    ['always', 'her zaman', 'She always arrives on time.'],
    ['happy', 'mutlu', 'They are happy with the result.'],
    ['to wait', 'beklemek', 'Please wait here.'],
    ['expensive', 'pahalı', 'This bag is too expensive.'],
    ['sometimes', 'bazen', 'Sometimes I walk to work.'],
  ].map(([en, tr, ex]) => ({ en, tr, ex }));

  const HEADER_EN = new Set(['english', 'ingilizce', 'en', 'word', 'words', 'kelime', 'kelimeler']);
  const HEADER_TR = new Set(['turkish', 'türkçe', 'turkce', 'tr', 'çeviri', 'ceviri', 'translation', 'anlam', 'meaning']);

  /* ---------- DOM ---------- */
  const $ = (id) => document.getElementById(id);
  const els = {
    deckInfo: $('deckInfo'),
    fileInput: $('fileInput'),
    templateBtn: $('templateBtn'),
    status: $('status'),
    dirBtn: $('dirBtn'),
    shuffleBtn: $('shuffleBtn'),
    unknownBtn: $('unknownBtn'),
    speakBtn: $('speakBtn'),
    posText: $('posText'),
    knownText: $('knownText'),
    progress: $('progress'),
    progressFill: $('progressFill'),
    stage: $('stage'),
    cardWrap: $('cardWrap'),
    card: $('card'),
    faceFront: $('faceFront'),
    faceBack: $('faceBack'),
    frontLang: $('frontLang'),
    frontWord: $('frontWord'),
    backLang: $('backLang'),
    backWord: $('backWord'),
    example: $('example'),
    againBtn: $('againBtn'),
    knownBtn: $('knownBtn'),
    prevBtn: $('prevBtn'),
    nextBtn: $('nextBtn'),
    done: $('done'),
    doneTitle: $('doneTitle'),
    doneText: $('doneText'),
    restartBtn: $('restartBtn'),
    reviewBtn: $('reviewBtn'),
    resetBtn: $('resetBtn'),
    announce: $('announce'),
  };

  /* ---------- Durum ---------- */
  const state = {
    name: SAMPLE_NAME,
    cards: SAMPLE_CARDS,
    known: new Set(),
    order: [],
    pos: 0,
    flipped: false,
    prefs: { reverse: false, shuffle: false, unknownOnly: false },
  };

  /* ---------- Yardımcılar ---------- */
  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* Depolama kapalıysa uygulama yine çalışır, ilerleme kaydedilmez. */
    }
  }

  const keyOf = (c) => c.en + '\u0001' + c.tr;
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const currentCard = () => state.cards[state.order[state.pos]] || null;
  const knownCount = () => state.cards.reduce((n, c) => n + (state.known.has(keyOf(c)) ? 1 : 0), 0);

  function shuffleInPlace(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  let statusTimer = null;
  function setStatus(message, type = 'info') {
    els.status.textContent = message || '';
    els.status.dataset.type = type;
    clearTimeout(statusTimer);
    if (message && type !== 'error') {
      statusTimer = setTimeout(() => setStatus(''), 6000);
    }
  }

  function announce(text) {
    els.announce.textContent = '';
    // Aynı metin art arda gelirse ekran okuyucu yeniden okusun diye kısa gecikme
    setTimeout(() => { els.announce.textContent = text; }, 50);
  }

  /* ---------- Dosya okuma ---------- */
  function decodeText(buffer) {
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    } catch (e) {
      // Eski Türkçe Excel CSV'leri Windows-1254 olabilir
      return new TextDecoder('windows-1254').decode(buffer);
    }
  }

  function parseDelimited(text) {
    text = text.replace(/^\uFEFF/, '');
    const firstLine = text.split(/\r?\n/).find((l) => l.trim()) || '';
    const delim = [';', '\t', ','].reduce((best, d) =>
      firstLine.split(d).length > firstLine.split(best).length ? d : best, ';');

    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (quoted) {
        if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (ch === '"') { quoted = false; }
        else { cell += ch; }
      } else if (ch === '"') {
        quoted = true;
      } else if (ch === delim) {
        row.push(cell); cell = '';
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); cell = '';
        rows.push(row); row = [];
      } else {
        cell += ch;
      }
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }

  function rowsToCards(rows) {
    const clean = (v) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
    const lower = (v) => clean(v).toLocaleLowerCase('tr');

    let start = 0;
    if (rows.length && rows[0]) {
      if (HEADER_EN.has(lower(rows[0][0])) || HEADER_TR.has(lower(rows[0][1]))) start = 1;
    }

    const seen = new Set();
    const cards = [];
    let skipped = 0;

    for (let i = start; i < rows.length; i++) {
      const r = rows[i] || [];
      const en = clean(r[0]);
      const tr = clean(r[1]);
      const ex = clean(r[2]);
      if (!en && !tr) continue;            // tamamen boş satır
      if (!en || !tr) { skipped++; continue; }
      const card = { en, tr, ex };
      const k = keyOf(card);
      if (seen.has(k)) continue;
      seen.add(k);
      cards.push(card);
      if (cards.length >= MAX_CARDS) break;
    }
    return { cards, skipped };
  }

  async function handleFile(file) {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      setStatus('Bu dosya türü desteklenmiyor. .xlsx, .xls veya .csv dosyası seçin.', 'error');
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      let rows;
      if (['csv', 'tsv', 'txt'].includes(ext)) {
        rows = parseDelimited(decodeText(buffer));
      } else {
        if (typeof XLSX === 'undefined') {
          setStatus('Excel okuyucu yüklenemedi. İnternet bağlantınızı kontrol edip sayfayı yenileyin ya da dosyayı .csv olarak kaydedin.', 'error');
          return;
        }
        const wb = XLSX.read(buffer, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
      }

      const { cards, skipped } = rowsToCards(rows);
      if (!cards.length) {
        setStatus('Dosyada kart bulunamadı. İlk sütuna İngilizce, ikinci sütuna Türkçe karşılığı yazın.', 'error');
        return;
      }

      const name = file.name.replace(/\.[^.]+$/, '');
      setDeck(name, cards);

      let msg = `${cards.length} kart yüklendi.`;
      if (skipped) msg += ` Eksik sütunu olan ${skipped} satır atlandı.`;
      setStatus(msg);
    } catch (e) {
      setStatus('Dosya okunamadı. Dosyanın bozuk ya da şifreli olmadığından emin olun.', 'error');
    } finally {
      els.fileInput.value = '';
    }
  }

  function downloadTemplate() {
    const rows = [['English', 'Türkçe', 'Örnek cümle']]
      .concat(SAMPLE_CARDS.slice(0, 5).map((c) => [c.en, c.tr, c.ex]));

    if (typeof XLSX !== 'undefined') {
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 42 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Kelimeler');
      XLSX.writeFile(wb, 'langcard-sablon.xlsx');
      return;
    }

    // Excel kütüphanesi yoksa CSV şablonu ver (Türkçe Excel için ; ayırıcı + BOM)
    const csv = '\uFEFF' + rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'langcard-sablon.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  /* ---------- Deste ve sıra ---------- */
  function setDeck(name, cards) {
    state.name = name;
    state.cards = cards;
    saveJSON(STORAGE.deck, { name, cards });
    afterUnflip(() => {
      buildOrder();
      render();
    });
  }

  function buildOrder() {
    let idx = state.cards.map((_, i) => i);
    if (state.prefs.unknownOnly) {
      idx = idx.filter((i) => !state.known.has(keyOf(state.cards[i])));
    }
    if (state.prefs.shuffle) shuffleInPlace(idx);
    state.order = idx;
    state.pos = 0;
  }

  /* ---------- Çevirme ve gezinme ---------- */
  function cardFaces() {
    const c = currentCard();
    if (!c) return null;
    const en = { text: c.en, lang: 'en', label: 'İngilizce' };
    const tr = { text: c.tr, lang: 'tr', label: 'Türkçe' };
    return state.prefs.reverse ? { front: tr, back: en, ex: c.ex } : { front: en, back: tr, ex: c.ex };
  }

  function updateCardLabel() {
    const f = cardFaces();
    if (!f) return;
    els.card.setAttribute('aria-label', state.flipped
      ? `Cevap: ${f.back.text}${f.ex ? '. Örnek cümle: ' + f.ex : ''}. Kartı ters çevirmek için basın.`
      : `${f.front.text}. Cevabı görmek için kartı çevirin.`);
  }

  function setFlipped(value) {
    state.flipped = value;
    els.card.classList.toggle('is-flipped', value);
    els.faceFront.setAttribute('aria-hidden', String(value));
    els.faceBack.setAttribute('aria-hidden', String(!value));
    updateCardLabel();
    if (value) {
      const f = cardFaces();
      if (f) announce(`Cevap: ${f.back.text}${f.ex ? '. Örnek cümle: ' + f.ex : ''}`);
    }
  }

  let swapTimer = null;
  function afterUnflip(fn) {
    if (swapTimer) return;
    if (state.flipped) {
      setFlipped(false);
      swapTimer = setTimeout(() => { swapTimer = null; fn(); }, reducedMotion() ? 0 : FLIP_MS);
    } else {
      fn();
    }
  }

  function moveTo(newPos) {
    afterUnflip(() => {
      state.pos = Math.max(0, Math.min(newPos, state.order.length));
      render(true);
    });
  }

  function mark(isKnown) {
    const c = currentCard();
    if (!c) return;
    if (isKnown) state.known.add(keyOf(c));
    else state.known.delete(keyOf(c));
    saveJSON(STORAGE.known, Array.from(state.known));
    moveTo(state.pos + 1);
    els.card.focus({ preventScroll: true });
  }

  /* ---------- Çizim ---------- */
  function renderDone() {
    const n = state.cards.length;
    const k = knownCount();
    const unknown = n - k;

    if (state.prefs.unknownOnly && state.order.length === 0) {
      els.doneTitle.textContent = 'Bilmediğin kart kalmadı';
      els.doneText.textContent = 'Tüm kartları biliyorsun. İstersen hepsini baştan çalışabilirsin.';
    } else if (unknown === 0) {
      els.doneTitle.textContent = 'Hepsini biliyorsun';
      els.doneText.textContent = `${n} kartın tamamını bildin.`;
    } else {
      els.doneTitle.textContent = 'Tur tamamlandı';
      els.doneText.textContent = `${k} kartı biliyorsun, ${unknown} kart tekrar bekliyor.`;
    }
    els.reviewBtn.hidden = unknown === 0;
  }

  function render(announceCard = false) {
    const total = state.order.length;
    const finished = total === 0 || state.pos >= total;

    els.deckInfo.textContent = `${state.name} (${state.cards.length} kart)`;
    els.knownText.textContent = `Bildiğim kartlar: ${knownCount()} / ${state.cards.length}`;
    els.stage.hidden = finished;
    els.done.hidden = !finished;

    const pct = finished ? 100 : Math.round((state.pos / total) * 100);
    els.progressFill.style.width = pct + '%';
    els.progress.setAttribute('aria-valuenow', String(pct));

    if (finished) {
      els.posText.textContent = 'Tur bitti';
      renderDone();
      if (announceCard) announce(els.doneTitle.textContent + '. ' + els.doneText.textContent);
      return;
    }

    const f = cardFaces();
    els.posText.textContent = `Kart ${state.pos + 1} / ${total}`;

    els.faceFront.lang = f.front.lang;
    els.faceBack.lang = f.back.lang;
    els.frontLang.textContent = f.front.label;
    els.frontWord.textContent = f.front.text;
    els.backLang.textContent = f.back.label;
    els.backWord.textContent = f.back.text;
    els.example.textContent = f.ex;

    els.prevBtn.disabled = state.pos === 0;
    els.nextBtn.textContent = state.pos === total - 1 ? 'Bitir' : 'Sonraki';

    updateCardLabel();
    if (announceCard) announce(`Kart ${state.pos + 1} / ${total}: ${f.front.text}`);
  }

  function syncPrefsUI() {
    els.shuffleBtn.setAttribute('aria-pressed', String(state.prefs.shuffle));
    els.unknownBtn.setAttribute('aria-pressed', String(state.prefs.unknownOnly));
    els.dirBtn.textContent = `Önce gösterilen: ${state.prefs.reverse ? 'Türkçe' : 'İngilizce'}`;
  }

  function savePrefs() {
    saveJSON(STORAGE.prefs, state.prefs);
    syncPrefsUI();
  }

  /* ---------- Sesli okuma ---------- */
  function speak() {
    const c = currentCard();
    if (!c || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(c.en);
    u.lang = 'en-US';
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  }

  /* ---------- Olaylar ---------- */
  els.card.addEventListener('click', () => setFlipped(!state.flipped));

  els.prevBtn.addEventListener('click', () => { moveTo(state.pos - 1); els.card.focus({ preventScroll: true }); });
  els.nextBtn.addEventListener('click', () => { moveTo(state.pos + 1); els.card.focus({ preventScroll: true }); });
  els.againBtn.addEventListener('click', () => mark(false));
  els.knownBtn.addEventListener('click', () => mark(true));
  els.speakBtn.addEventListener('click', speak);

  els.dirBtn.addEventListener('click', () => {
    state.prefs.reverse = !state.prefs.reverse;
    savePrefs();
    afterUnflip(() => render());
  });

  els.shuffleBtn.addEventListener('click', () => {
    state.prefs.shuffle = !state.prefs.shuffle;
    savePrefs();
    afterUnflip(() => {
      buildOrder();
      render();
      setStatus(state.prefs.shuffle ? 'Kartlar karıştırıldı.' : 'Kartlar özgün sıraya döndü.');
    });
  });

  els.unknownBtn.addEventListener('click', () => {
    state.prefs.unknownOnly = !state.prefs.unknownOnly;
    savePrefs();
    afterUnflip(() => {
      buildOrder();
      render();
      setStatus(state.prefs.unknownOnly
        ? `Sadece bilmediğin ${state.order.length} kart gösteriliyor.`
        : 'Tüm kartlar gösteriliyor.');
    });
  });

  els.restartBtn.addEventListener('click', () => {
    state.prefs.unknownOnly = false;
    savePrefs();
    buildOrder();
    render();
  });

  els.reviewBtn.addEventListener('click', () => {
    state.prefs.unknownOnly = true;
    savePrefs();
    buildOrder();
    render();
  });

  els.resetBtn.addEventListener('click', () => {
    if (!window.confirm('Bildiğin olarak işaretlediğin kartlar silinsin mi? Bu işlem geri alınamaz.')) return;
    state.known.clear();
    saveJSON(STORAGE.known, []);
    buildOrder();
    render();
    setStatus('İlerleme sıfırlandı.');
  });

  els.fileInput.addEventListener('change', () => handleFile(els.fileInput.files[0]));
  els.templateBtn.addEventListener('click', downloadTemplate);

  // Klavye: ok tuşlarıyla gezinme, odak sayfadayken boşlukla çevirme
  document.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || els.stage.hidden) return;
    const t = e.target;
    if (t && t.matches && t.matches('input, textarea, select')) return;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      els.nextBtn.click();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      els.prevBtn.click();
    } else if (e.key === ' ' && t === document.body) {
      e.preventDefault();
      setFlipped(!state.flipped);
    }
  });

  // Dokunmatik kaydırma
  let touchStart = null;
  els.cardWrap.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    touchStart = { x: t.clientX, y: t.clientY };
  }, { passive: true });
  els.cardWrap.addEventListener('touchend', (e) => {
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      (dx < 0 ? els.nextBtn : els.prevBtn).click();
    }
  }, { passive: true });

  // Sürükle ve bırak
  let dragDepth = 0;
  window.addEventListener('dragenter', (e) => {
    if (!e.dataTransfer || !Array.from(e.dataTransfer.types || []).includes('Files')) return;
    e.preventDefault();
    dragDepth++;
    document.body.classList.add('is-dragging');
  });
  window.addEventListener('dragover', (e) => { e.preventDefault(); });
  window.addEventListener('dragleave', () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) document.body.classList.remove('is-dragging');
  });
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    dragDepth = 0;
    document.body.classList.remove('is-dragging');
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    handleFile(file);
  });

  /* ---------- Başlangıç ---------- */
  function init() {
    const saved = loadJSON(STORAGE.deck, null);
    if (saved && Array.isArray(saved.cards)) {
      const valid = saved.cards.filter((c) => c && typeof c.en === 'string' && typeof c.tr === 'string' && c.en && c.tr);
      if (valid.length) {
        state.name = String(saved.name || 'Kendi listem');
        state.cards = valid.map((c) => ({ en: c.en, tr: c.tr, ex: typeof c.ex === 'string' ? c.ex : '' }));
      }
    }

    const knownList = loadJSON(STORAGE.known, []);
    if (Array.isArray(knownList)) state.known = new Set(knownList);

    const prefs = loadJSON(STORAGE.prefs, {});
    state.prefs = {
      reverse: !!prefs.reverse,
      shuffle: !!prefs.shuffle,
      unknownOnly: !!prefs.unknownOnly,
    };

    if (!('speechSynthesis' in window)) els.speakBtn.hidden = true;
    else els.speakBtn.hidden = false;

    buildOrder();
    syncPrefsUI();
    render();
  }

  init();
})();
