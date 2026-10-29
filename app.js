(() => {
  'use strict';
  document.documentElement.classList.add('js');
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scrollBehavior = reducedMotion ? 'instant' : 'smooth';
  const chapters = $$('.chapter');
  let activeChapter = 0;
  let presenting = false;
  let toastTimer;

  function toast(message) {
    clearTimeout(toastTimer);
    $('#toast').textContent = message;
    $('#toast').classList.add('visible');
    toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3200);
  }

  // Content remains readable with JavaScript disabled. Motion only starts in view.
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px 30px 0px' });
    $$('.reveal').forEach((element) => observer.observe(element));
  } else {
    $$('.reveal').forEach((element) => element.classList.add('is-visible'));
  }

  // One chapter tracker drives progress, navigation and the presenter controls.
  function updateReadingState() {
    const y = window.scrollY;
    const total = document.documentElement.scrollHeight - window.innerHeight;
    $('#progressBar').style.width = `${total > 0 ? Math.min(100, y / total * 100) : 0}%`;
    $('#siteHeader').classList.toggle('scrolled', y > 20);
    let next = 0;
    const offset = window.innerHeight * 0.35;
    chapters.forEach((section, index) => {
      if (section.getBoundingClientRect().top <= offset) next = index;
    });
    if (next !== activeChapter) {
      activeChapter = next;
      updateChapterControls();
    }
  }

  function updateChapterControls() {
    $$('.chapter-nav a').forEach((link, i) => {
      link.classList.toggle('active', i === activeChapter);
      if (i === activeChapter) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    $('#presentationCount').textContent = `${String(activeChapter + 1).padStart(2, '0')} / ${String(chapters.length).padStart(2, '0')}`;
    $('#presentationTitle').textContent = chapters[activeChapter].dataset.title;
    $('#prevChapter').disabled = activeChapter === 0;
    $('#nextChapter').disabled = activeChapter === chapters.length - 1;
  }

  let scrollQueued = false;
  window.addEventListener('scroll', () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => {
      updateReadingState();
      scrollQueued = false;
    });
  }, { passive: true });
  window.addEventListener('resize', updateReadingState, { passive: true });
  window.addEventListener('load', updateReadingState);
  updateChapterControls();
  updateReadingState();

  const menuButton = $('#menuToggle');
  const nav = $('#mainNav');
  function closeMenu() {
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', '開啟導覽選單');
    nav.classList.remove('open');
  }
  menuButton.addEventListener('click', () => {
    const expanded = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(expanded));
    menuButton.setAttribute('aria-label', expanded ? '關閉導覽選單' : '開啟導覽選單');
    nav.classList.toggle('open', expanded);
  });
  $$('.main-nav a').forEach((link) => link.addEventListener('click', closeMenu));
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.site-header')) closeMenu();
  });
  window.addEventListener('resize', () => { if (innerWidth > 760) closeMenu(); });

  // Accessible single-panel tab groups, with arrow, Home and End navigation.
  function initTabs(selector, onChange) {
    const tabs = $$(selector);
    function select(tab) {
      tabs.forEach((other) => {
        const selected = tab === other;
        other.setAttribute('aria-selected', String(selected));
        other.tabIndex = selected ? 0 : -1;
        other.classList.toggle('active', selected);
      });
      onChange(tab);
    }
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => select(tab));
      tab.addEventListener('keydown', (e) => {
        const orientation = tab.closest('[role=tablist]').getAttribute('aria-orientation');
        const previous = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft';
        const next = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight';
        let target;
        if (e.key === previous) target = (index - 1 + tabs.length) % tabs.length;
        if (e.key === next) target = (index + 1) % tabs.length;
        if (e.key === 'Home') target = 0;
        if (e.key === 'End') target = tabs.length - 1;
        if (target !== undefined) {
          e.preventDefault();
          tabs[target].focus();
          select(tabs[target]);
        }
      });
    });
  }

  const scenes = [
    { image: 'classroom', alt: '教師與學生在互動顯示器前進行課堂討論的情境示意', description: '在教材畫面直接批註，保留講解脈絡，讓重點與推導過程一併呈現。', workflow: '課堂流程示例：開啟教材 → 標示重點 → 匯出課程筆記' },
    { image: 'wireless', alt: '不同裝置將教材與作品分享到互動顯示器的情境示意', description: '並排展示學生作品，比較不同觀點。教師決定投影來源與畫面數量，讓討論保有清楚的節奏。', workflow: '課堂流程示例：學生分享作品 → 教師管理畫面 → 比較與討論' },
    { image: 'hybrid', alt: '教室內師生透過視訊畫面與遠端參與者互動的情境示意', description: '結合視訊平台，連結遠端參與者，將現場授課與遠端討論接在一起。', workflow: '導入確認：視訊平台與網路 → 攝影畫面 → 收音與回音現場測試' },
    { image: 'accounts', alt: '教師使用個人化帳戶與教學應用程式的情境示意', description: '依帳戶登入自己的教學工作環境，讓共用教室的使用者與設備管理有一致的規劃。', workflow: '課堂流程示例：依權限登入 → 開啟教材 → 課後登出' }
  ];
  let sceneRequest = 0;
  initTabs('.scenario-tab', (tab) => {
    const scene = scenes[Number(tab.dataset.scene)];
    const request = ++sceneRequest;
    const image = $('#scenarioImage');
    image.classList.add('switching');
    const nextImage = new Image();
    nextImage.onload = () => {
      if (request !== sceneRequest) return;
      image.src = nextImage.src;
      image.alt = scene.alt;
      image.classList.remove('switching');
    };
    nextImage.onerror = () => image.classList.remove('switching');
    nextImage.src = `assets/${scene.image}.webp`;
    $('#scenarioDescription').textContent = scene.description;
    $('#scenarioWorkflow').textContent = scene.workflow;
    $('#scenarioPanel').setAttribute('aria-labelledby', tab.id);
  });

  // Small local canvas: normalized coordinates keep ink aligned on resize.
  const canvas = $('#inkCanvas');
  const ctx = canvas.getContext('2d');
  let penColor = '#9a183a';
  let currentStroke = null;
  let inkPointer = null;
  const strokes = [];
  function redrawInk() {
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    strokes.forEach((stroke) => {
      if (!stroke.points.length) return;
      ctx.strokeStyle = stroke.color;
      ctx.fillStyle = stroke.color;
      if (stroke.points.length === 1) {
        ctx.beginPath();
        ctx.arc(stroke.points[0].x * rect.width, stroke.points[0].y * rect.height, 1.5, 0, 2 * Math.PI);
        ctx.fill();
      } else {
        ctx.beginPath();
        stroke.points.forEach((point, index) => {
          const x = point.x * rect.width;
          const y = point.y * rect.height;
          if (index === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }
    });
  }
  function resizeInk() {
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(devicePixelRatio || 1, 3);
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    redrawInk();
  }
  function inkPoint(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
  }
  canvas.addEventListener('pointerdown', (e) => {
    if (!ctx || inkPointer !== null || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    inkPointer = e.pointerId;
    currentStroke = { color: penColor, points: [inkPoint(e)] };
    strokes.push(currentStroke);
    canvas.setPointerCapture(e.pointerId);
    redrawInk();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!currentStroke || e.pointerId !== inkPointer) return;
    currentStroke.points.push(inkPoint(e));
    redrawInk();
  });
  function endStroke(e) {
    if (e.pointerId !== inkPointer) return;
    currentStroke = null;
    inkPointer = null;
  }
  canvas.addEventListener('pointerup', endStroke);
  canvas.addEventListener('pointercancel', endStroke);
  canvas.addEventListener('lostpointercapture', endStroke);
  if ('ResizeObserver' in window) new ResizeObserver(resizeInk).observe($('#inkSurface'));
  else window.addEventListener('resize', resizeInk);
  resizeInk();
  $$('.pen-color').forEach((button) => button.addEventListener('click', () => {
    penColor = button.dataset.color;
    $$('.pen-color').forEach((other) => {
      other.classList.toggle('active', button === other);
      other.setAttribute('aria-pressed', String(button === other));
    });
  }));
  $('#clearInk').addEventListener('click', () => {
    strokes.length = 0;
    currentStroke = null;
    redrawInk();
    toast('筆跡已清除');
  });

  // Illustrative student submissions: all configuration is browser-local.
  const tiles = [
    { title: '觀點整理', bg: '#e5dcc3', ink: '#8b6944', art: '<svg viewBox="0 0 160 90" aria-hidden="true"><circle cx="45" cy="45" r="27"/><circle cx="79" cy="45" r="27"/><circle cx="113" cy="45" r="27"/></svg>' },
    { title: '研究假設', bg: '#d8dfe1', ink: '#507183', art: '<span class="tile-word">Why → How</span>' },
    { title: '概念連結', bg: '#d8ddc9', ink: '#5e754e', art: '<svg viewBox="0 0 160 90" aria-hidden="true"><path d="M20 65L55 25L105 65L140 25"/><circle cx="20" cy="65" r="7"/><circle cx="55" cy="25" r="7"/><circle cx="105" cy="65" r="7"/><circle cx="140" cy="25" r="7"/></svg>' },
    { title: '課堂提問', bg: '#e4cecb', ink: '#965b5f', art: '<span class="tile-big">What if?</span>' },
    { title: '方法比較', bg: '#dad3df', ink: '#7f688a', art: '<svg viewBox="0 0 160 90" aria-hidden="true"><rect x="25" y="18" width="45" height="54" rx="2"/><rect x="90" y="18" width="45" height="54" rx="2"/><path d="M35 35H60M35 45H55M100 35H125M100 45H120"/></svg>' },
    { title: '案例發想', bg: '#dfd8c6', ink: '#887b52', art: '<span class="tile-word">IDEA ↗</span>' },
    { title: '討論重點', bg: '#cbded9', ink: '#4b8071', art: '<svg viewBox="0 0 160 90" aria-hidden="true"><path d="M25 28H135M25 45H105M25 62H120"/><path d="M125 57L133 65L145 48"/></svg>' },
    { title: '結構分析', bg: '#dfd1c6', ink: '#986b4d', art: '<svg viewBox="0 0 160 90" aria-hidden="true"><rect x="61" y="12" width="38" height="20"/><path d="M80 32V49M33 49H127M33 49V61M127 49V61"/><rect x="14" y="61" width="38" height="20"/><rect x="108" y="61" width="38" height="20"/></svg>' },
    { title: '延伸思考', bg: '#d4d9df', ink: '#5f718b', art: '<span class="tile-big">Next.</span>' }
  ];
  function setGrid(count) {
    const grid = $('#shareGrid');
    grid.className = `share-grid grid-${count}`;
    grid.setAttribute('aria-label', `${count} 個畫面配置示意`);
    grid.innerHTML = tiles.slice(0, count).map((tile, i) => `<div class="share-tile" style="--tile-bg:${tile.bg};--tile-ink:${tile.ink}"><div class="tile-heading"><b>第 ${i + 1} 組</b><span>${tile.title}</span></div><div class="tile-art">${tile.art}</div></div>`).join('');
    $$('[data-grid]').forEach((button) => {
      const selected = Number(button.dataset.grid) === count;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }
  $$('[data-grid]').forEach((button) => button.addEventListener('click', () => setGrid(Number(button.dataset.grid))));
  setGrid(4);

  const aiContent = [
    { title: '一個關鍵詞，接出下一段討論。', description: '圈選課堂中出現的概念，查找延伸資料，再由教師判斷哪些內容適合帶進課堂。', example: '講解教材時，圈選學生提問的名詞，接續查找相關資料。', graphic: '<span class="lasso-word">課堂關鍵概念</span>' },
    { title: '讓推導過程，有清楚的呈現。', description: '使用 EZMath 整理公式與圖形，輔助課堂說明，讓學生接續理解教師的推導。', example: '說明教材公式時，整理板書中的數學式與圖形，再逐步補充解釋。', graphic: '<span class="math-word">y = ƒ(x)</span>' },
    { title: '從草稿開始，把課程變成自己的。', description: '產生備課草稿，再由教師依課程目標、教材與學生程度調整內容。', example: '以本週課程主題建立大綱草稿，再補上指定閱讀與課堂討論。', graphic: '<span class="outline-word">學習目標 ──────<br>課堂活動 ────<br>討論與複習 ─────</span>' },
    { title: '把課堂重點，轉成檢核理解的起點。', description: '利用 AI Quiz 建立測驗草稿，由教師確認題目與答案，再決定如何運用在課程中。', example: '根據當堂的核心概念準備測驗草稿，檢查題意與答案後再使用。', graphic: '<span class="quiz-word">Q<span>A</span><span>B</span><span>C</span></span>' }
  ];
  initTabs('.ai-option', (tab) => {
    const data = aiContent[Number(tab.dataset.ai)];
    $('#aiTitle').textContent = data.title;
    $('#aiDescription').textContent = data.description;
    $('#aiExample').textContent = data.example;
    $('#aiGraphic').innerHTML = data.graphic;
    $('#aiPanel').setAttribute('aria-labelledby', tab.id);
  });

  const sizes = {
    65: { model: 'RE6505AC', width: '1491.1', weight: '29', vesa: '600 × 400', price: '135,000' },
    75: { model: 'RE7505AC', width: '1711.3', weight: '39.9', vesa: '800 × 400', price: '179,000' },
    86: { model: 'RE8605AC', width: '1960.2', weight: '56.5', vesa: '800 × 600', price: '255,000' }
  };
  function setSize(size) {
    const data = sizes[size];
    const width = (Number(data.width) / Number(sizes[86].width)) * 98;
    $('#sizeProduct').style.width = `${width.toFixed(2)}%`;
    $('.dimension-line').style.width = `${width.toFixed(2)}%`;
    $('#sizeModel').textContent = data.model;
    $('#sizeWidth').innerHTML = `${data.width} <span>mm</span>`;
    $('#sizeWeight').innerHTML = `${data.weight} <span>kg</span>`;
    $('#sizeVesa').innerHTML = `${data.vesa} <span>mm</span>`;
    $('#sizePrice').textContent = `NT$ ${data.price}`;
    $('#sizeDimension').textContent = `整機寬度 ${data.width} mm`;
    $('#sizeImage').alt = `目前選擇 ${size} 吋 BenQ ${data.model}`;
    $$('[data-size]').forEach((button) => {
      const selected = Number(button.dataset.size) === size;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }
  $$('[data-size]').forEach((button) => button.addEventListener('click', () => setSize(Number(button.dataset.size))));
  setSize(75);

  function goToChapter(index) {
    const target = Math.max(0, Math.min(chapters.length - 1, index));
    chapters[target].scrollIntoView({ behavior: scrollBehavior, block: 'start' });
  }
  function setPresenting(enabled) {
    presenting = enabled;
    document.body.classList.toggle('presenting', enabled);
    $('#presentationControls').hidden = !enabled;
    $('#presentationToggle').setAttribute('aria-pressed', String(enabled));
    $('#presentationToggle').setAttribute('aria-label', enabled ? '結束簡報模式' : '開啟簡報模式');
    closeMenu();
    if (enabled) {
      goToChapter(activeChapter);
      toast('簡報模式已開啟。可用方向鍵切換章節，Esc 結束。');
    } else {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      $('#presentationToggle').focus({ preventScroll: true });
    }
  }
  $('#presentationToggle').addEventListener('click', () => setPresenting(!presenting));
  $('#exitPresentation').addEventListener('click', () => setPresenting(false));
  $('#nextChapter').addEventListener('click', () => goToChapter(activeChapter + 1));
  $('#prevChapter').addEventListener('click', () => goToChapter(activeChapter - 1));
  $('#fullscreenToggle').addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else toast('此瀏覽器未提供全螢幕功能，可繼續使用簡報模式。');
    } catch {
      toast('瀏覽器未開放全螢幕，可繼續使用簡報模式。');
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMenu();
      if (presenting) setPresenting(false);
      return;
    }
    if (!presenting || e.target.closest('input,textarea,select,[role=tab],[role=tabpanel],summary,dialog')) return;
    if (e.key === ' ' && e.target.closest('button,a')) return;
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(e.key)) {
      e.preventDefault();
      goToChapter(activeChapter + 1);
    } else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) {
      e.preventDefault();
      goToChapter(activeChapter - 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      goToChapter(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      goToChapter(chapters.length - 1);
    }
  });

  const checklist = 'BenQ RE05AC｜大專院校教室現勘重點\n\n1. 看得清楚\n從最後一排檢查教材字級；確認窗光、照明、閱讀距離與座位視線。\n\n2. 操作順手\n帶實際教材試寫、批註與投影；確認操作高度及畫面配置。\n\n3. 連線可用\n確認校園網路、帳戶政策、投影相容性；現場測試視訊影像、收音與回音。\n\n4. 安裝到位\n確認產品尺寸、承重、VESA 壁掛或支架條件；規劃電源與走線。\n\n備註：設備規格依 BenQ 台灣官方資訊；採購金額與安裝費用依專案報價確認。';
  $('#checklistText').value = checklist;
  $('#copyChecklist').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(checklist);
      toast('現勘重點已複製，可貼到 LINE 或工作筆記。');
    } catch {
      const dialog = $('#checklistDialog');
      if (dialog.showModal) dialog.showModal();
      else dialog.setAttribute('open', '');
      $('#checklistText').focus();
      $('#checklistText').select();
    }
  });
  $('#checklistDialog').addEventListener('click', (e) => {
    if (e.target === $('#checklistDialog')) {
      const r = e.target.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) e.target.close();
    }
  });
})();
