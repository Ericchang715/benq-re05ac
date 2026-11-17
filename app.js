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
    { image: 'classroom', alt: 'BenQ 顯示器原有課堂示意影像，作為研究架構討論情境參考', description: '共同檢視研究問題、理論架構與變項關係，現場標註研究假設與待確認事項。', workflow: '研究流程示例：展示研究架構 → 討論研究假設 → 整理待辦與修正項目' },
    { image: 'wireless', alt: '多裝置分享畫面的產品情境示意', description: '以不同研究人員的裝置並列顯示統計圖表、訪談編碼結果或模型圖，讓團隊討論分析差異。', workflow: '研究流程示例：各組展示分析結果 → 比較差異 → 記錄需重新檢驗的項目' },
    { image: 'hybrid', alt: '影音會議設備的產品情境示意', description: '搭配視訊平台，邀請跨校共同主持人與研究夥伴遠端參與；實際軟硬體及收音效果須現場測試。', workflow: '研究流程示例：會前整理資料 → 跨校會議 → 確認分工與後續時程' },
    { image: 'accounts', alt: 'BenQ 帳戶登入及設備操作的產品情境示意', description: '研究計畫期中檢討、研究助理報告與期末成果展示，可搭配投影與批註功能進行研討。', workflow: '研究流程示例：成果簡報 → 研究問題回應 → 整理修改與報告項目' }
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
    { title: '文獻整理', bg: '#e5dcc3', ink: '#8b6944', art: '<svg viewBox="0 0 160 90" aria-hidden="true"><circle cx="45" cy="45" r="27"/><circle cx="79" cy="45" r="27"/><circle cx="113" cy="45" r="27"/></svg>' },
    { title: '研究假設', bg: '#d8dfe1', ink: '#507183', art: '<span class="tile-word">Why → How</span>' },
    { title: '變項關係', bg: '#d8ddc9', ink: '#5e754e', art: '<svg viewBox="0 0 160 90" aria-hidden="true"><path d="M20 65L55 25L105 65L140 25"/><circle cx="20" cy="65" r="7"/><circle cx="55" cy="25" r="7"/><circle cx="105" cy="65" r="7"/><circle cx="140" cy="25" r="7"/></svg>' },
    { title: '研究問題', bg: '#e4cecb', ink: '#965b5f', art: '<span class="tile-big">What if?</span>' },
    { title: '研究方法', bg: '#dad3df', ink: '#7f688a', art: '<svg viewBox="0 0 160 90" aria-hidden="true"><rect x="25" y="18" width="45" height="54" rx="2"/><rect x="90" y="18" width="45" height="54" rx="2"/><path d="M35 35H60M35 45H55M100 35H125M100 45H120"/></svg>' },
    { title: '樣本規劃', bg: '#dfd8c6', ink: '#887b52', art: '<span class="tile-word">IDEA ↗</span>' },
    { title: '會議決議', bg: '#cbded9', ink: '#4b8071', art: '<svg viewBox="0 0 160 90" aria-hidden="true"><path d="M25 28H135M25 45H105M25 62H120"/><path d="M125 57L133 65L145 48"/></svg>' },
    { title: '模型架構', bg: '#dfd1c6', ink: '#986b4d', art: '<svg viewBox="0 0 160 90" aria-hidden="true"><rect x="61" y="12" width="38" height="20"/><path d="M80 32V49M33 49H127M33 49V61M127 49V61"/><rect x="14" y="61" width="38" height="20"/><rect x="108" y="61" width="38" height="20"/></svg>' },
    { title: '後續驗證', bg: '#d4d9df', ink: '#5f718b', art: '<span class="tile-big">Next.</span>' }
  ];
  function setGrid(count) {
    const grid = $('#shareGrid');
    grid.className = `share-grid grid-${count}`;
    grid.setAttribute('aria-label', `${count} 個畫面配置示意`);
    grid.innerHTML = tiles.slice(0, count).map((tile, i) => `<div class="share-tile" style="--tile-bg:${tile.bg};--tile-ink:${tile.ink}"><div class="tile-heading"><b>資料 ${i + 1}</b><span>${tile.title}</span></div><div class="tile-art">${tile.art}</div></div>`).join('');
    $$('[data-grid]').forEach((button) => {
      const selected = Number(button.dataset.grid) === count;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }
  $$('[data-grid]').forEach((button) => button.addEventListener('click', () => setGrid(Number(button.dataset.grid))));
  setGrid(4);

  const aiContent = [
    { title: '從研究概念延伸查找。', description: '利用套索圈選研究方法術語，查找延伸資訊；搜尋內容須回到學術文獻與原始來源核對。', example: '研究會議中圈選「抽樣偏誤」，作為後續查找方法文獻的線索。', graphic: '<span class="lasso-word">研究方法概念</span>' },
    { title: '把模型推導呈現在團隊面前。', description: '透過 EZMath 類型工具整理公式與圖形，支援研究生理解模型推導；不取代專業統計分析軟體。', example: '研究方法討論時，展示迴歸模型符號與推導流程，再由研究人員檢查模型設定。', graphic: '<span class="math-word">y = ƒ(x)</span>' },
    { title: '研究助理訓練的大綱草稿。', description: '可將教學用大綱工具運用於研究方法工作坊的課程草稿，內容須由指導教授依研究需求修訂。', example: '為研究助理準備訪談倫理與資料編碼訓練的課程大綱，再由主持人逐項確認。', graphic: '<span class="outline-word">訓練目標 ──────<br>研究方法 ────<br>實作檢核 ─────</span>' },
    { title: '研究方法訓練的知識檢核。', description: '可將教學用 AI Quiz 作為研究助理訓練的測驗草稿，並由教授檢查題目與答案。', example: '研究助理完成研究倫理訓練後，用自訂題目確認對資料保存與保密要求的理解。', graphic: '<span class="quiz-word">Q<span>A</span><span>B</span><span>C</span></span>' }
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

  const checklist = [
    'BenQ RE05AC｜國科會研究計畫設備需求評估清單',
    '',
    '1. 研究任務',
    '列出計畫名稱、研究任務、擬使用的圖表／模型／資料類型及會議流程。',
    '',
    '2. 既有設備限制',
    '盤點實驗室或研究室現有顯示設備，說明具體不足及與研究直接相關的需求。',
    '',
    '3. 使用場域與功能驗證',
    '確認場地尺寸、閱讀距離、批註、多裝置分享、跨校會議、資安與帳戶管理需求。',
    '',
    '4. 經費與採購程序',
    '確認國科會計畫研究設備費規定、經費核定清單與必要的校內行政程序。',
    '請取得正式報價並核對設備本體、安裝、配件、保固與維護條件。',
    '',
    '5. 資料與研究倫理',
    '含個人資料或未公開研究成果，應依校方資訊安全與研究倫理要求管理。',
    '',
    '資料來源：',
    'https://law.nstc.gov.tw/LawContent.aspx?id=FL026713',
    'https://law.nstc.gov.tw/LawContent.aspx?id=GL000059',
    'https://www.benq.com/zh-tw/education/benq-board-interactive-displays/re05ac-essential-series-board/specs.html'
  ].join('\\n');
  const justification = '本研究計畫預計於〔研究場域〕進行〔具體研究任務〕，研究團隊需共同檢視〔研究模型／資料圖表〕，並於〔會議或分析流程〕進行批註與討論。經盤點現有設備，尚有〔具體不足〕，因此擬評估使用互動觸控顯示器支援上述工作。設備規格、使用頻率及必要性，將依計畫內容與校內採購程序提出佐證。';
  $('#copyJustification').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(justification);
      toast('研究設備需求說明範本已複製，請填入實際研究內容。');
    } catch {
      const dialog = $('#checklistDialog');
      $('#checklistText').value = justification;
      $('#checklistDialog .dialog-heading h2').textContent = '研究設備需求說明範本';
      if (dialog.showModal) dialog.showModal();
      else dialog.setAttribute('open', '');
      $('#checklistText').focus();
      $('#checklistText').select();
    }
  });
  $('#checklistText').value = checklist;
  $('#copyChecklist').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(checklist);
      toast('研究設備需求評估清單已複製。');
    } catch {
      const dialog = $('#checklistDialog');
      $('#checklistText').value = checklist;
      $('#checklistDialog .dialog-heading h2').textContent = '研究設備需求評估清單';
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
