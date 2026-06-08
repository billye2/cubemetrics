/* Cubemetrics landing — assembled from the design hand-off. */
/* Order matters: icons/catalog → icon wiring → section mocks → motion. */

/* ============================================================
   XP Boost — shared icon set + app catalog
   Minimal geometric glyphs (stroke = currentColor)
   ============================================================ */
(function () {
  var s = function (inner) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
      'stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';
  };
  var I = {
    focus:       s('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none"/>'),
    timetracker: s('<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>'),
    countdown:   s('<path d="M7 4h10M7 20h10M8 4c0 4 8 5 8 8M16 4c0 4-8 5-8 8M8 20c0-4 8-5 8-8M16 20c0-4-8-5-8-8"/>'),
    meditation:  s('<path d="M4 14c3-1 5-4 8-4s5 3 8 4"/><path d="M4 18c3-1 5-3 8-3s5 2 8 3"/><circle cx="12" cy="6" r="2"/>'),
    stopwatch:   s('<circle cx="12" cy="13" r="7"/><path d="M12 13l3-2M10 3h4M18 7l1.5-1.5"/>'),
    pomodoro:    s('<path d="M20 5v4h-4"/><path d="M19.4 9A8 8 0 1 0 20 13"/>'),
    todo:        s('<path d="M4.5 12.5l4 4 11-11"/>'),
    productivity:s('<path d="M12 5l7 13H5z"/>'),
    backlog:     s('<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>'),
    routines:    s('<path d="M4 12a8 8 0 0 1 13.7-5.6L20 8M20 4v4h-4"/><path d="M20 12a8 8 0 0 1-13.7 5.6L4 16M4 20v-4h4"/>'),
    planner:     s('<path d="M5 7h14M5 12h14M5 17h9"/>'),
    weekly:      s('<rect x="5" y="5" width="14" height="14" rx="1.5"/><path d="M5 9h14M9 5v14"/>'),
    inbox:       s('<circle cx="12" cy="12" r="8"/><path d="M12 8.5v7M8.5 12h7"/>'),
    priorities:  s('<rect x="5" y="5" width="6" height="6" rx="1"/><rect x="13" y="5" width="6" height="6" rx="1"/><rect x="5" y="13" width="6" height="6" rx="1"/><rect x="13" y="13" width="6" height="6" rx="1"/>'),
    bucket:      s('<rect x="5" y="5" width="14" height="14" rx="2.5"/><path d="M8.5 12l2.4 2.4L16 9.5"/>'),
    vision:      s('<path d="M12 4l1.8 5.2L19 11l-5.2 1.8L12 18l-1.8-5.2L5 11l5.2-1.8z"/>'),
    goals:       s('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.4"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>'),
    habits:      s('<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4"/>'),
    journal:     s('<path d="M6 4h11a1 1 0 0 1 1 1v15l-3-2-3 2-3-2-3 2V5a1 1 0 0 1 1-1z"/><path d="M9 9h6M9 12.5h4"/>'),
    notes:       s('<rect x="5" y="4" width="14" height="16" rx="2"/><path d="M8.5 9h7M8.5 12.5h7M8.5 16h4"/>'),
    water:       s('<path d="M12 3.5c4 4.5 6 7.4 6 10a6 6 0 0 1-12 0c0-2.6 2-5.5 6-10z"/><path d="M12 11.5v6" stroke-opacity=".0"/><path d="M9.2 14.5a3 3 0 0 0 5.6 0z" fill="currentColor" stroke="none"/>'),
    expenses:    s('<circle cx="12" cy="12" r="8"/><path d="M14.5 9.2c-.6-.9-1.6-1.2-2.6-1.2-1.4 0-2.4.8-2.4 1.9 0 2.6 5 1.3 5 4 0 1.2-1.1 2-2.6 2-1.1 0-2.1-.4-2.7-1.3M12 6.4v1.6M12 16v1.6"/>'),
    skilltree:   s('<circle cx="12" cy="5" r="2.2"/><circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="18" r="2.2"/><path d="M12 7.2v4M12 11.2L6.6 16M12 11.2L17.4 16"/>'),
    level:       s('<path d="M12 3l7 3v5c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6z"/><path d="M9.5 12l1.8 1.8L15 9.8"/>')
  };

  // Bottom-nav icons
  var NAV = {
    today:    s('<path d="M5 12l7-6 7 6v6.4a1.1 1.1 0 0 1-1.1 1.1H6.1A1.1 1.1 0 0 1 5 18.4z"/>'),
    apps:     s('<rect x="4.5" y="4.5" width="6" height="6" rx="1.6"/><rect x="13.5" y="4.5" width="6" height="6" rx="1.6"/><rect x="4.5" y="13.5" width="6" height="6" rx="1.6"/><rect x="13.5" y="13.5" width="6" height="6" rx="1.6"/>'),
    xp:       s('<path d="M12 3.4c.7 4.4 2.5 6.2 6.6 6.6-4.1.4-5.9 2.2-6.6 6.6-.7-4.4-2.5-6.2-6.6-6.6 4.1-.4 5.9-2.2 6.6-6.6z"/>'),
    progress: s('<path d="M5 19V11M10 19V6M15 19v-5M20 19v-9"/>'),
    settings: s('<circle cx="12" cy="12" r="3.6"/><path d="M12 3.4v2.2M12 18.4v2.2M3.4 12h2.2M18.4 12h2.2M5.8 5.8l1.5 1.5M16.7 16.7l1.5 1.5M18.2 5.8l-1.5 1.5M7.3 16.7l-1.5 1.5"/>')
  };

  var STAR = '<svg class="tile-star" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 4l2.2 4.6 5 .7-3.6 3.5.85 5L12 15.5 7.55 17.8l.85-5L4.8 9.3l5-.7z"/></svg>';

  // Catalog: [key, name, desc, accentVar]
  var CATALOG = {
    'TIME & FOCUS': [
      ['focus','Focus','Timer for one deep-work session','--c-teal'],
      ['timetracker','Time Tracker','Log where your day went','--c-blue'],
      ['countdown','Countdown','Count down the days to dates','--c-orange'],
      ['meditation','Meditation','Log minutes meditated','--c-pine'],
      ['pomodoro','Pomodoro','Work in focused sprints','--c-red']
    ],
    'TASKS & PLANNING': [
      ['todo','Todo','Capture tasks, set priorities','--c-teal'],
      ['productivity','Productivity','Rate how productive each day','--c-orange'],
      ['backlog','Backlog','Park someday / maybe ideas','--c-blue'],
      ['routines','Routines','Run recurring step-by-step','--c-pine'],
      ['planner','Daily Planner','Lay out everything you\u2019ll do','--c-purple'],
      ['weekly','Weekly Review','Reflect on your week & plan','--c-red']
    ],
    'GOALS & PROGRESS': [
      ['bucket','Bucket List','Track life goals and tick them','--c-green'],
      ['vision','Vision Board','Pin images & quotes of where','--c-magenta'],
      ['goals','Goals','Set long-term goals and track','--c-teal'],
      ['skilltree','Skill Tree','Level up skills as you log','--c-orange'],
      ['journal','Journal','Write daily, build the streak','--c-purple'],
      ['habits','Habits','Build routines that stick','--c-blue']
    ]
  };

  function tile(item) {
    var icon = I[item[0]] || I.focus;
    var accent = item[3] || '--teal';
    return '<div class="app-tile">' +
      STAR +
      '<div class="tile-icon" style="color:var(' + accent + ');background:color-mix(in srgb, var(' + accent + ') 14%, var(--card))">' + icon + '</div>' +
      '<h4>' + item[1] + '</h4>' +
      '<p>' + item[2] + '</p>' +
    '</div>';
  }

  window.XPI = I;
  window.XPNAV = NAV;
  window.XPCATALOG = CATALOG;
  window.xpTile = tile;

  // Render a labelled, sectioned app grid into a container
  window.renderAppGrid = function (el, opts) {
    opts = opts || {};
    var cols = opts.cols || 3;
    var html = '';
    Object.keys(CATALOG).forEach(function (cat, ci) {
      html += '<div class="grid-cat reveal reveal-d' + ((ci % 3) + 1) + '">';
      html += '<div class="eyebrow" style="color:var(--muted);margin-bottom:12px">' + cat + '</div>';
      html += '<div class="tile-grid" style="grid-template-columns:repeat(' + cols + ',1fr)">';
      CATALOG[cat].forEach(function (it) { html += tile(it); });
      html += '</div></div>';
    });
    el.innerHTML = html;
  };

  // Render a bottom nav
  window.renderNav = function (active) {
    var order = [['today','Today'],['apps','Apps'],['xp','+XP'],['progress','Progress'],['settings','Settings']];
    return '<nav class="app-nav">' + order.map(function (o) {
      return '<a class="' + (o[0] === active ? 'active' : '') + '">' + NAV[o[0]] + '<span>' + o[1] + '</span></a>';
    }).join('') + '</nav>';
  };
})();


/* ---- icon wiring (index.html inline #1) ---- */
(function(){
  var FLAME = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c2 3 .4 4.6 1.8 6.4C15.6 8 16.4 6 16.4 6c1.4 2 2 4 2 6a6.4 6.4 0 1 1-12.8 0c0-3 1.8-5 3-6 .4 2 1.4 2.6 2 1 .5-1.6 0-3-.6-4z"/></svg>';
  var MIC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v3M9 20h6"/></svg>';
  document.querySelectorAll('[data-ico]').forEach(function(el){
    var k = el.getAttribute('data-ico');
    if (k === 'flame') { el.innerHTML = FLAME; el.style.color = 'var(--amber)'; el.style.background = 'color-mix(in srgb, var(--amber) 13%, var(--card))'; return; }
    if (k === 'mic') { el.innerHTML = MIC; return; }
    el.innerHTML = (window.XPI[k] || window.XPNAV[k] || '');
  });
  document.querySelectorAll('[data-nav]').forEach(function(el){ el.outerHTML = window.renderNav(el.getAttribute('data-nav')); });
})();

/* ---- section mockups (index.html inline #2) ---- */
(function(){
  var NAV = window.renderNav;
  var MICSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v3M9 20h6"/></svg>';
  function aiMock(){
    return '<div class="mock-window">'+
      '<div class="mock-bar"><span style="font-size:13px;color:var(--teal);font-weight:600">← Today</span><span style="font-weight:700;font-family:var(--display)">+XP</span><span style="width:18px"></span></div>'+
      '<div class="chat">'+
        '<div class="cap">Quick-capture by chat or voice — tell it what you did and it logs to the right app.</div>'+
        '<div class="recent">▸ Recent entries — <b style="color:var(--ink-2)">3 undoable</b></div>'+
        '<div class="bub ai">Hi — tell me what to log. Try “I drank two glasses of water”, “add milk to my grocery list”, or “remind me to call the dentist”.</div>'+
        '<div class="bub me">i just ran 2 miles</div>'+
        '<div class="bub ai" style="max-width:92%">Got it — I’ve logged <span class="hl">2 miles (~5,000 steps)</span> to your Steps tracker. Nice work! 🏃'+
          '<div class="cc-row"><span class="cc-box">✓</span> Log 5,000 steps to Steps</div>'+
          '<div class="cc-actions"><button class="cc-confirm">Confirm</button><span class="cc-dismiss">Dismiss</span></div>'+
        '</div>'+
      '</div>'+
      '<div class="chat-input"><span class="mic">'+MICSVG+'</span><span class="field">Log something…</span><button class="send">Send</button></div>'+
      '<div class="speak"><i></i> Speak responses</div>'+
    '</div>';
  }
  var am=document.getElementById('aiMock'); if(am) am.innerHTML=aiMock();
  function dashMock(){
    return '<div class="mock-window">'+
      '<div class="mock-bar"><a class="brand" style="font-size:14px"><img src="/brand-mark.png" alt="" style="width:22px;height:22px;border-radius:3px;display:block" /> Cubemetrics</a><span style="font-size:12px;color:var(--muted)">Evening</span></div>'+
      '<div class="dash">'+
        '<div class="greet-sm">Close out your day</div>'+
        '<div class="greet-lg">Billy Ye</div>'+
        '<div class="greet-note">2 things need attention today.</div>'+
        '<div class="lvl-card app-card"><span class="level-badge" style="--d:46px;font-size:17px">10</span><div class="meta"><div class="top"><span class="nm">Adept</span><span class="xp">+300 today · 48 🔥</span></div><div class="xp-track"><div class="xp-fill" data-fill="78"></div></div></div></div>'+
        '<div class="quest-row"><span class="quest-pill"><span class="tick">✓</span> Move 1/1</span><span class="quest-pill"><span class="tick">✓</span> Capture a thought</span></div>'+
        '<div class="attn-lbl">Needs attention</div>'+
        '<div class="attn app-card"><div class="top"><span class="mini-ico">'+window.XPI.water+'</span><span class="nm">Water</span><span class="ct">6/8</span><span class="badge badge-due">Due</span></div><div class="xp-track"><div class="xp-fill amber-fill" data-fill="75"></div></div></div>'+
        '<div class="attn app-card"><div class="top"><span class="mini-ico" style="color:var(--teal);background:var(--teal-pale2)">'+window.XPI.todo+'</span><span class="nm">Todo</span><span class="ct">36 open</span><span class="badge badge-up">Upcoming</span></div><div style="margin-top:2px"><div class="row-item" style="border:none;padding:5px 0;font-size:12.5px">Pay overdue electricity bill <span class="badge badge-up">Up</span></div><div class="row-item" style="padding:5px 0;font-size:12.5px">Fix production bug before release <span class="badge badge-up">Up</span></div></div></div>'+
      '</div>'+ NAV('today') + '</div>';
  }
  function xpMock(){
    return '<div class="mock-window"><div class="mock-bar"><span style="font-size:13px;color:var(--teal);font-weight:600">← Apps</span><span style="font-weight:700;font-family:var(--display)">Level</span><span style="font-size:12px;color:var(--muted)">★</span></div>'+
      '<div style="padding:20px 18px">'+
        '<div style="display:flex;flex-direction:column;align-items:center;text-align:center;padding:8px 0 14px">'+
          '<span class="level-badge" style="--d:72px;font-size:28px">10</span>'+
          '<div style="font-family:var(--display);font-weight:700;font-size:20px;margin-top:10px">Adept</div>'+
          '<div style="font-size:12.5px;color:var(--muted)">4,850 XP total</div>'+
          '<div style="width:100%;margin-top:14px"><div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);margin-bottom:5px"><span>Level 10</span><span>Level 11</span></div><div class="xp-track"><div class="xp-fill" data-fill="78"></div></div><div style="text-align:center;font-size:11.5px;color:var(--teal);margin-top:6px">150 XP to level 11</div></div>'+
        '</div>'+
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin:6px 0 16px">'+
          '<div class="app-card" style="padding:12px;text-align:center"><div style="font-family:var(--display);font-weight:700;font-size:20px;color:var(--teal)">+300</div><div style="font-size:10px;color:var(--muted);letter-spacing:.05em">TODAY</div></div>'+
          '<div class="app-card" style="padding:12px;text-align:center"><div style="font-family:var(--display);font-weight:700;font-size:20px">48🔥</div><div style="font-size:10px;color:var(--muted);letter-spacing:.05em">STREAK</div></div>'+
          '<div class="app-card" style="padding:12px;text-align:center"><div style="font-family:var(--display);font-weight:700;font-size:20px">49</div><div style="font-size:10px;color:var(--muted);letter-spacing:.05em">BEST</div></div>'+
        '</div>'+
        '<div class="eyebrow" style="color:var(--muted);font-size:10.5px;margin-bottom:10px">XP · LAST 30 DAYS</div>'+
        '<div class="spark" style="display:flex;align-items:flex-end;gap:3px;height:64px;padding:8px 10px;background:var(--card);border:1px solid var(--line);border-radius:12px"></div>'+
      '</div></div>';
  }
  function progMock(){
    var cats = [['Habits','--c-teal',992,100],['Trackers','--c-green',504,52],['Skill Tree','--c-orange',330,34],['Focus','--c-purple',297,31],['Journal','--c-red',240,25],['Workout','--c-blue',225,23],['Pomodoro','--c-lime',210,22],['Time Tracker','--c-magenta',105,12]];
    var rows = cats.map(function(c,i){ return '<div class="cat-row"><span class="lab">'+c[0]+'</span><div class="cat-track"><div class="cat-fill" data-fill="'+c[3]+'" data-delay="'+(i*70)+'" style="background:var('+c[1]+')"></div></div><span class="num">'+c[2]+'</span></div>'; }).join('');
    return '<div class="mock-window"><div class="mock-bar"><span style="font-size:13px;color:var(--teal);font-weight:600">← Apps</span><span style="font-weight:700;font-family:var(--display)">Progress</span><span style="font-size:12px;color:var(--muted)">★</span></div>'+
      '<div style="padding:18px"><div class="eyebrow" style="color:var(--muted);font-size:10.5px;margin-bottom:12px">WHERE YOUR XP CAME FROM · 30D</div>'+ rows +'</div></div>';
  }
  var lm=document.getElementById('loopMock'); if(lm) lm.innerHTML=dashMock();
  var xm=document.getElementById('xpMock'); if(xm) xm.innerHTML=xpMock();
  var pm=document.getElementById('progMock'); if(pm) pm.innerHTML=progMock();
  document.querySelectorAll('.spark').forEach(function(sp){
    var n=30,h='';
    for(var i=0;i<n;i++){ var base=16+Math.round(34*(i/n)); var v=base+Math.round(Math.sin(i*1.3)*7+ (i%3)*4); v=Math.max(10,Math.min(56,v)); var last=i===n-1; h+='<div data-fill-h="'+v+'" style="flex:1;height:2px;border-radius:2px;background:'+(last?'var(--teal)':'var(--teal-pale)')+';transition:height .8s cubic-bezier(.22,.61,.36,1) '+(i*22)+'ms"></div>'; }
    sp.innerHTML=h;
    var go=function(){ sp.querySelectorAll('[data-fill-h]').forEach(function(b){ b.style.height=b.getAttribute('data-fill-h')+'px'; }); };
    if('IntersectionObserver' in window){ var o=new IntersectionObserver(function(es){es.forEach(function(e){ if(e.isIntersecting){ go(); o.unobserve(e.target);} });},{threshold:.4}); o.observe(sp);} else go();
  });
  var ag=document.getElementById('appgrid'); if(ag) window.renderAppGrid(ag,{cols:3});
})();

/* ---- motion ---- */
/* ============================================================
   XP Boost landing — shared motion
   IntersectionObserver driven: reveals, count-ups, bar fills
   ============================================================ */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- reveal on scroll ---- */
  var reveals = document.querySelectorAll('.reveal');
  if (reduce) {
    reveals.forEach(function (el) { el.classList.add('in'); });
  } else if ('IntersectionObserver' in window) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); ro.unobserve(e.target); }
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });
    var vhR = window.innerHeight || document.documentElement.clientHeight;
    reveals.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < vhR && r.bottom > 0) { el.classList.add('in'); }  // already on screen: show now
      else { ro.observe(el); }                                       // below fold: reveal on scroll
    });
    /* safety net — nothing should ever stay invisible */
    setTimeout(function () { reveals.forEach(function (el) { el.classList.add('in'); }); }, 2600);
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---- fill bars (xp-fill / cat-fill / amber) when in view ---- */
  function fillTargets() {
    var bars = document.querySelectorAll('[data-fill]');
    if (reduce) { bars.forEach(function (b) { b.style.width = b.getAttribute('data-fill') + '%'; }); return; }
    if (!('IntersectionObserver' in window)) { bars.forEach(function (b) { b.style.width = b.getAttribute('data-fill') + '%'; }); return; }
    function doFill(b) {
      var delay = parseInt(b.getAttribute('data-delay') || '0', 10);
      setTimeout(function () { b.style.width = b.getAttribute('data-fill') + '%'; }, delay);
    }
    var fo = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { doFill(e.target); fo.unobserve(e.target); }
      });
    }, { threshold: 0.25 });
    var vh = window.innerHeight || document.documentElement.clientHeight;
    bars.forEach(function (b) {
      var r = b.getBoundingClientRect();
      if (r.top < vh * 0.92 && r.bottom > 0) {        // already visible: fill now
        doFill(b);
      } else {
        fo.observe(b);                                 // below the fold: fill on scroll
      }
    });
  }

  /* ---- count up numbers ---- */
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function countUp(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var dur = parseInt(el.getAttribute('data-dur') || '1200', 10);
    var prefix = el.getAttribute('data-prefix') || '';
    var suffix = el.getAttribute('data-suffix') || '';
    var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
    if (reduce) { el.textContent = prefix + target.toLocaleString(undefined, {minimumFractionDigits: decimals, maximumFractionDigits: decimals}) + suffix; return; }
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var val = target * easeOut(p);
      el.textContent = prefix + val.toLocaleString(undefined, {minimumFractionDigits: decimals, maximumFractionDigits: decimals}) + suffix;
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = prefix + target.toLocaleString(undefined, {minimumFractionDigits: decimals, maximumFractionDigits: decimals}) + suffix;
    }
    requestAnimationFrame(step);
  }
  function countTargets() {
    var nums = document.querySelectorAll('[data-count]');
    if (!('IntersectionObserver' in window)) { nums.forEach(countUp); return; }
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { countUp(e.target); co.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    nums.forEach(function (el) { co.observe(el); });
  }

  /* ---- smooth anchor scroll ---- */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (ev) {
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var t = document.querySelector(id);
      if (t) { ev.preventDefault(); t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); }
    });
  });

  /* ---- subtle parallax drift on floating tiles ---- */
  function parallax() {
    if (reduce) return;
    var items = document.querySelectorAll('[data-drift]');
    if (!items.length) return;
    var ticking = false;
    function update() {
      var vh = window.innerHeight;
      items.forEach(function (el) {
        var r = el.getBoundingClientRect();
        var center = r.top + r.height / 2;
        var off = (center - vh / 2) / vh; // -0.5..0.5
        var amt = parseFloat(el.getAttribute('data-drift'));
        el.style.transform = 'translateY(' + (off * amt).toFixed(1) + 'px)';
      });
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  }

  function init() { fillTargets(); countTargets(); parallax(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

