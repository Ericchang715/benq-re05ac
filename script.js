/* BenQ RE05AC — static, offline-friendly rebuild from site content and original PPT assets. */
(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const panels = $$('.panel');
  const offset = index => panels[Math.max(0, Math.min(panels.length - 1, index))];
  const count = $('#rail-count');
  const counter = $('#slide-counter');
  let currentIndex = 0;

  // Progressive reveal. Make all content visible when IntersectionObserver is unavailable.
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('visible'); revealObserver.unobserve(entry.target); }
      });
    }, {threshold:0.06,rootMargin:'0px 0px -18px 0px'});
    $$('.reveal').forEach(el => revealObserver.observe(el));
    const sectionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          currentIndex = panels.indexOf(entry.target);
          const padded = String(currentIndex + 1).padStart(2,'0') + ' / 09';
          if (count) count.textContent = padded;
          if (counter) counter.textContent = padded;
          $$('.rail-dot').forEach((d,i) => d.classList.toggle('active',i===currentIndex));
        }
      });
    }, {threshold:0.34});
    panels.forEach(el=>sectionObserver.observe(el));
  } else $$('.reveal').forEach(el=>el.classList.add('visible'));
  let rafPending = false;
  const progress = () => {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      const total = document.documentElement.scrollHeight - innerHeight;
      $('#progress-fill').style.width = (total>0 ? (scrollY/total*100) : 0) + '%';
      rafPending = false;
    });
  };
  addEventListener('scroll',progress,{passive:true});progress();

  // Small screen menu
  const menu = $('#mobile-menu');
  $('#menu-btn').addEventListener('click',() => {
    const show = menu.hidden; menu.hidden = !show;
    $('#menu-btn').setAttribute('aria-expanded',String(show));
    $('#menu-btn').setAttribute('aria-label',show?'關閉選單':'開啟選單');
  });
  $$('#mobile-menu a').forEach(a=>a.addEventListener('click',()=>{menu.hidden=true;$('#menu-btn').setAttribute('aria-expanded','false');}));

  // Teaching scenarios
  const scenes = [
    ['在教材畫面直接批註，保留講解脈絡，讓重點與推導過程一併呈現。','課堂流程示例：開啟教材 → 標示重點 → 匯出課程筆記'],
    ['讓學生分享各組成果，在同一畫面對照觀點，讓全班一起討論。','課堂流程示例：分組準備 → 無線分享 → 比較不同方案'],
    ['結合視訊平台與教室顯示器，讓遠端參與者接上現場的活動。','課堂流程示例：啟動視訊 → 共同看教材 → 回應課堂提問'],
    ['以帳戶登入個人教學工作環境，由校園資訊單位集中管理設備。','課堂流程示例：教師登入 → 開啟教材 → 下課登出']
  ];
  $$('.scenario-tab').forEach(btn=>btn.addEventListener('click',()=>{
    const i = Number(btn.dataset.scene);
    $$('.scenario-tab').forEach(el=>{const selected=el===btn;el.classList.toggle('selected',selected);el.setAttribute('aria-selected',String(selected));});
    $('#scenario-description').textContent=scenes[i][0];$('#scenario-flow').textContent=scenes[i][1];
  }));

  // Working drawing canvas, no external dependencies.
  const canvas=$('#whiteboard-canvas'),area=$('#draw-area');
  if(canvas && area){
    const ctx=canvas.getContext('2d');let isDrawing=false,previous=null;
    const resize=()=>{
      const rect=area.getBoundingClientRect(),ratio=Math.min(window.devicePixelRatio||1,2);
      if(rect.width<=0||rect.height<=0)return;
      const old=document.createElement('canvas');old.width=canvas.width;old.height=canvas.height;
      if(old.width&&old.height)old.getContext('2d').drawImage(canvas,0,0);
      canvas.width=Math.round(rect.width*ratio);canvas.height=Math.round(rect.height*ratio);
      ctx.setTransform(ratio,0,0,ratio,0,0);
      if(old.width&&old.height)ctx.drawImage(old,0,0,old.width,old.height,0,0,rect.width,rect.height);
    };
    const position=e=>{const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};};
    const begin=e=>{if(e.button!==undefined&&e.button!==0)return;isDrawing=true;previous=position(e);canvas.setPointerCapture?.(e.pointerId);ctx.beginPath();ctx.fillStyle='#b42e4f';ctx.arc(previous.x,previous.y,2.2,0,Math.PI*2);ctx.fill();e.preventDefault();};
    const move=e=>{if(!isDrawing)return;const point=position(e);ctx.beginPath();ctx.moveTo(previous.x,previous.y);ctx.lineTo(point.x,point.y);ctx.strokeStyle='#b42e4f';ctx.lineWidth=4;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();previous=point;e.preventDefault();};
    const end=()=>{isDrawing=false;previous=null;};
    canvas.addEventListener('pointerdown',begin);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
    $('#clear-canvas').addEventListener('click',()=>ctx.clearRect(0,0,canvas.width,canvas.height));
    if('ResizeObserver'in window)new ResizeObserver(resize).observe(area);else addEventListener('resize',resize);
    resize();
  }

  // Reconfigure the sharing mock screen, keeping it explicitly an illustration.
  const tiles=[
    ['第 1 組','觀點整理','● ● ●'],['第 2 組','研究假設','Why → How'],['第 3 組','概念連結','↗ ↘'],['第 4 組','課堂提問','What if?'],
    ['第 5 組','案例分析','CASE'],['第 6 組','數據比較','DATA'],['第 7 組','提案草稿','DRAFT'],['第 8 組','學習回饋','IDEAS'],['第 9 組','結論整理','✓']
  ];
  $$('.layout-btn').forEach(btn=>btn.addEventListener('click',()=>{
    const layout=Number(btn.dataset.layout);
    $$('.layout-btn').forEach(el=>el.classList.toggle('active',el===btn));
    const grid=$('#screen-grid');grid.className='screen-grid layout-'+layout;
    grid.replaceChildren(...tiles.slice(0,layout).map(([title,subtitle,extra])=>{
      const tile=document.createElement('div');tile.className='screen-tile';
      const a=document.createElement('small'),b=document.createElement('strong'),c=document.createElement('span');
      a.textContent=title;b.textContent=subtitle;c.textContent=extra;tile.append(a,b,c);return tile;
    }));
  }));

  const aiData=[
    ['課堂關鍵概念','一個關鍵詞，接出下一段討論。','圈選課堂中出現的概念，查找延伸資料，再由教師判斷哪些內容適合帶進課堂。','講解教材時，圈選學生提問的名詞，接續查找相關資料。'],
    ['公式與圖形','讓數學表達，接上課堂講解。','整理課堂中出現的公式與圖形，配合教師的推導脈絡逐步說明。','進行計算或統計課程時，把學生提出的式子整理成討論素材。'],
    ['課程備課','從一份草稿，開始安排教學節奏。','以課程主題建立教學大綱草稿，再由授課教師調整活動和難度。','依指定教材章節整理主題順序，由教師確認重點及內容。'],
    ['形成性評量','用課堂提問，觀察概念掌握。','建立測驗題目草稿，教師確認內容與答案後，運用於課堂互動。','在章節結束時生成概念題草稿，用來收集學生理解狀況。']
  ];
  $$('.ai-tool').forEach(btn=>btn.addEventListener('click',()=>{
    const i=Number(btn.dataset.ai);
    $$('.ai-tool').forEach(el=>{el.classList.toggle('selected',el===btn);el.setAttribute('aria-selected',String(el===btn));});
    ['#ai-label','#ai-heading','#ai-description','#ai-example'].forEach((sel,j)=>$(sel).textContent=aiData[i][j]);
  }));

  // Sizes: model, real specifications and original-slide recommended prices.
  const sizes={
    '65':{model:'RE6505AC',width:'1491.1 mm',weight:'29 kg',vesa:'600 × 400 mm',price:'NT$ 135,000',pct:65},
    '75':{model:'RE7505AC',width:'1711.3 mm',weight:'39.9 kg',vesa:'800 × 400 mm',price:'NT$ 179,000',pct:74},
    '86':{model:'RE8605AC',width:'1960.2 mm',weight:'56.5 kg',vesa:'800 × 600 mm',price:'NT$ 255,000',pct:84}
  };
  $$('[data-size]').forEach(btn=>btn.addEventListener('click',()=>{
    const n=btn.dataset.size,info=sizes[n];
    $$('[data-size]').forEach(el=>el.classList.toggle('active',el===btn));
    $('#size-model').textContent=info.model;$('#size-width').textContent='整機寬度 '+info.width;
    $('#detail-width').textContent=info.width;$('#detail-weight').textContent=info.weight;
    $('#detail-vesa').textContent=info.vesa;$('#detail-price').textContent=info.price;
    $('#size-board').style.width=info.pct+'%';$('#size-board').alt='目前選擇 '+n+' 吋 BenQ '+info.model;
  }));

  const closeDialogs=()=>$$('.dialog-close').forEach(el=>el.addEventListener('click',()=>el.closest('dialog').close()));closeDialogs();
  $('#compare-open').addEventListener('click',()=>$('#compare-dialog').showModal());
  $('#copy-checklist').addEventListener('click',()=>$('#checklist-dialog').showModal());
  $$('dialog').forEach(el=>el.addEventListener('click',event=>{if(event.target===el)el.close();}));
  $('#copy-text').addEventListener('click',async()=>{
    const input=$('#checklist-text');let success=false;
    try{if(navigator.clipboard && window.isSecureContext){await navigator.clipboard.writeText(input.value);success=true;}}catch(e){}
    if(!success){input.focus();input.select();try{success=document.execCommand('copy');}catch(e){}}
    $('#copy-status').textContent=success?'已複製現勘清單。':'請選取上方文字並使用 Ctrl+C（Mac：⌘+C）複製。';
  });

  // Presentation mode: supports local file:// browser operation without full-screen permission.
  let presentation=false;
  const navigate=delta=>{currentIndex=Math.max(0,Math.min(panels.length-1,currentIndex+delta));offset(currentIndex).scrollIntoView({behavior:'smooth',block:'start'});};
  const togglePresentation=async enabled=>{
    presentation=enabled;document.body.classList.toggle('presentation-mode',enabled);
    $('#presentation-controls').hidden=!enabled;
    $('#presentation-btn').setAttribute('aria-pressed',String(enabled));
    if(enabled){if(document.documentElement.requestFullscreen){try{await document.documentElement.requestFullscreen();}catch(e){}}}
    else if(document.fullscreenElement){try{await document.exitFullscreen();}catch(e){}}
  };
  $('#presentation-btn').addEventListener('click',()=>togglePresentation(!presentation));
  $('#presentation-close').addEventListener('click',()=>togglePresentation(false));
  $('#prev-panel').addEventListener('click',()=>navigate(-1));
  $('#next-panel').addEventListener('click',()=>navigate(1));
  document.addEventListener('keydown',event=>{
    const tag=document.activeElement?.tagName?.toLowerCase();
    if(tag==='textarea'||tag==='input'||document.querySelector('dialog[open]'))return;
    if(!presentation)return;
    if(['ArrowRight','ArrowDown','PageDown',' '].includes(event.key)){event.preventDefault();navigate(1);}
    if(['ArrowLeft','ArrowUp','PageUp'].includes(event.key)){event.preventDefault();navigate(-1);}
    if(event.key==='Escape'){togglePresentation(false);}
  });
  addEventListener('fullscreenchange',()=>{if(presentation&&!document.fullscreenElement)togglePresentation(false);});
})();
