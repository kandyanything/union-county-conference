// Site-wide announcement pop-up. Reads data/announcement.json and, if it is
// active, shows a dismissible modal after the intro finishes. The admin picks
// how long it keeps showing via "mode":
//   "once"        - a single time per visitor (any close ends it). Default.
//   "acknowledge" - returns every visit until the visitor clicks the primary
//                   "don't show again" button; a casual close (X / Esc) only
//                   hides it for that browser session.
//   "untilDate"   - shows every session until "endDate" (YYYY-MM-DD) passes,
//                   then comes down on its own; a close hides it for the session.
// "id" keys the memory, so posting a new message (new id) re-shows it to
// everyone. Add ?announce to the URL to preview. Fully editable from the CMS.
// "layout": "photos" swaps the plain card for a photo-gallery feature card:
// a navy/gold art panel with a fanned stack of photo frames, the conference
// seal ("logo"), and the whole graphic linking to "linkUrl". "photos" (up to
// three image paths, 3:2) fill the frames: the first is the centre one, shown
// whole; the second and third fan out behind it, left and right. Without
// photos the frames show a drawn picture instead. It also offers "Don't show
// again" (label: "neverLabel"), which hides that announcement id for good in
// that visitor's browser, whatever the mode.
(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {
        fetch('data/announcement.json', { cache: 'no-store' })
            .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
            .then(function (a) {
                if (!a || !a.active || !a.title) return;
                var id = a.id || 'announcement';
                var mode = a.mode || (a.frequency === 'always' ? 'always' : 'once');
                var force = /[?&#]announce\b/i.test(location.search + location.hash);
                if (!force && !shouldShow(mode, id, a.endDate)) return;
                waitForIntro(function () { render(a, id, mode, force); });
            })
            .catch(function () { /* no announcement, no problem */ });
    });

    // ---- storage + gating ----------------------------------------------
    function lget(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function lset(k) { try { localStorage.setItem(k, '1'); } catch (e) {} }
    function sget(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
    function sset(k) { try { sessionStorage.setItem(k, '1'); } catch (e) {} }
    function endOfDay(d) { var t = new Date(String(d).slice(0, 10) + 'T23:59:59'); return isNaN(t.getTime()) ? NaN : t.getTime(); }

    function shouldShow(mode, id, endDate) {
        if (lget('annNever_' + id)) return false;                    // the visitor chose "Don't show again"
        if (mode === 'always') return true;
        if (mode === 'untilDate') {
            var e = endDate ? endOfDay(endDate) : NaN;
            if (!isNaN(e) && Date.now() > e) return false;          // the date has passed - it comes down
            return !sget('annDismiss_' + id);                        // else once per session
        }
        if (mode === 'acknowledge') {
            if (lget('annAck_' + id)) return false;                  // already acknowledged for good
            return !sget('annDismiss_' + id);                        // else once per session until acknowledged
        }
        return !lget('annSeen_' + id);                               // "once": a single time ever
    }

    function remember(mode, id, acknowledged) {
        if (mode === 'once') lset('annSeen_' + id);
        else if (mode === 'acknowledge') { if (acknowledged) lset('annAck_' + id); else sset('annDismiss_' + id); }
        else if (mode === 'untilDate') sset('annDismiss_' + id);
        // "always" remembers nothing
    }

    // The intro veil owns the screen first; wait until it is gone.
    function waitForIntro(cb) {
        // Every intro veil in this family plus the Pink October canvas. The old
        // test named only two ids, so it could not tell that Pink October was
        // still playing and the modal opened on top of it.
        var INTRO_IDS = ['bnc-intro','njac-intro','sec-intro','UCIAC-intro','skyland-intro','ucc-intro','po-intro'];
        function gone() {
            for (var i = 0; i < INTRO_IDS.length; i++) {
                if (document.getElementById(INTRO_IDS[i])) return false;
            }
            return true;
        }
        if (gone()) { setTimeout(cb, 300); return; }
        var t0 = Date.now();
        var iv = setInterval(function () {
            if (gone() || Date.now() - t0 > 9000) { clearInterval(iv); setTimeout(cb, 250); }
        }, 200);
    }

    var CSS =
        '.ann-backdrop{position:fixed;inset:0;z-index:99990;display:flex;align-items:center;justify-content:center;' +
        'padding:20px;background:rgba(6,8,11,.62);opacity:0;transition:opacity .25s ease;}' +
        '.ann-backdrop.is-open{opacity:1;}' +
        '.ann-card{position:relative;width:100%;max-width:440px;background:#fff;border-radius:14px;overflow:hidden;' +
        'box-shadow:0 30px 80px rgba(0,0,0,.5);transform:translateY(14px) scale(.97);transition:transform .3s cubic-bezier(.2,.8,.3,1.2);' +
        'font-family:var(--font-body,system-ui,-apple-system,"Segoe UI",sans-serif);}' +
        '.ann-backdrop.is-open .ann-card{transform:none;}' +
        '.ann-bar{height:6px;background:var(--red,#c8102e);}' +
        '.ann-x{position:absolute;top:9px;right:12px;border:0;background:none;font-size:27px;line-height:1;color:#9aa2ad;cursor:pointer;padding:2px 7px;border-radius:6px;}' +
        '.ann-x:hover{color:#22262c;background:#f0f1f3;}' +
        '.ann-x:focus-visible{outline:2px solid var(--red,#c8102e);outline-offset:2px;}' +
        '.ann-eyebrow{margin:20px 26px 0;font-size:.7rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--red,#c8102e);}' +
        '.ann-title{font-family:var(--font-display,inherit);margin:6px 26px 8px;font-size:1.5rem;line-height:1.15;color:#14181c;text-transform:uppercase;letter-spacing:.01em;text-wrap:balance;}' +
        '.ann-body{margin:0 26px 20px;color:#48505b;font-size:1rem;line-height:1.55;}' +
        '.ann-actions{display:flex;gap:10px;flex-wrap:wrap;padding:0 26px 24px;}' +
        '.ann-btn{font:inherit;font-weight:600;font-size:.88rem;letter-spacing:.03em;padding:11px 20px;border-radius:8px;cursor:pointer;text-decoration:none;border:2px solid transparent;transition:all .15s;}' +
        '.ann-btn--primary{background:var(--red,#c8102e);color:#fff;}' +
        '.ann-btn--primary:hover{filter:brightness(1.1);}' +
        '.ann-btn--ghost{background:transparent;color:#48505b;border-color:#d6dadf;}' +
        '.ann-btn--ghost:hover{background:#f2f3f5;}' +
        '.ann-btn:focus-visible{outline:2px solid var(--red,#c8102e);outline-offset:2px;}' +
        '@media (prefers-reduced-motion:reduce){.ann-backdrop,.ann-card{transition:none;}}' +
        // ---- "photos" feature layout ----
        '.ann-card--photos{max-width:470px;border-radius:18px;text-align:center;}' +
        '.ann-art{position:relative;display:block;height:232px;overflow:hidden;text-decoration:none;cursor:pointer;' +
        'background:radial-gradient(120% 90% at 50% 115%,rgba(196,150,42,.55),transparent 58%),' +
        'radial-gradient(70% 60% at 85% 0%,rgba(59,130,246,.30),transparent 70%),linear-gradient(160deg,#0b1529 0%,#121e40 45%,#1a2560 100%);}' +
        '.ann-art::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(115deg,rgba(255,255,255,.035) 0 2px,transparent 2px 26px);}' +
        '.ann-art::after{content:"";position:absolute;left:0;right:0;bottom:0;height:3px;background:linear-gradient(90deg,transparent,#c4962a 20%,#f1d38a 50%,#c4962a 80%,transparent);}' +
        '.ann-stack{position:absolute;left:50%;top:24px;width:0;height:0;}' +
        '.ann-photo{position:absolute;left:-85px;top:0;width:170px;height:131px;padding:7px 7px 20px;background:#fff;border-radius:4px;' +
        'box-shadow:0 14px 28px rgba(0,0,0,.45);transition:transform .45s cubic-bezier(.2,.8,.3,1.15);}' +
        '.ann-photo svg,.ann-photo img{display:block;width:100%;height:100%;border-radius:2px;}' +
        '.ann-photo img{object-fit:cover;background:#1a2560;}' +
        '.ann-photo--1{transform:translate(-84px,26px) rotate(-13deg);}' +
        '.ann-photo--2{transform:translate(86px,24px) rotate(12deg);}' +
        '.ann-photo--3{transform:translate(0,4px) rotate(-2deg) scale(1.12);z-index:2;}' +
        '.ann-art:hover .ann-photo--1,.ann-art:focus-visible .ann-photo--1{transform:translate(-112px,30px) rotate(-18deg);}' +
        '.ann-art:hover .ann-photo--2,.ann-art:focus-visible .ann-photo--2{transform:translate(114px,28px) rotate(17deg);}' +
        '.ann-art:hover .ann-photo--3,.ann-art:focus-visible .ann-photo--3{transform:translate(0,-4px) rotate(0deg) scale(1.17);}' +
        // on the frame's corner, below the picture, so the centre photo shows whole
        '.ann-cam{position:absolute;right:-17px;bottom:-24px;width:38px;height:38px;border-radius:50%;z-index:3;display:flex;align-items:center;justify-content:center;' +
        'background:linear-gradient(145deg,#f1d38a,#c4962a 55%,#a07820);box-shadow:0 6px 16px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.5);}' +
        '.ann-cam svg{width:20px;height:20px;}' +
        '.ann-spark{position:absolute;color:#f1d38a;font-size:14px;line-height:1;opacity:.85;animation:annTw 2.6s ease-in-out infinite;}' +
        '@keyframes annTw{0%,100%{opacity:.25;transform:scale(.7);}50%{opacity:1;transform:scale(1.1);}}' +
        '.ann-card--photos .ann-x{top:10px;right:10px;color:rgba(255,255,255,.8);z-index:6;}' +
        '.ann-card--photos .ann-x:hover{color:#fff;background:rgba(255,255,255,.14);}' +
        '.ann-seal{position:relative;z-index:5;width:92px;height:92px;margin:-46px auto 0;border-radius:50%;background:#fff;padding:5px;' +
        'box-shadow:0 0 0 3px #c4962a,0 10px 24px rgba(11,21,41,.35);}' +
        '.ann-seal img{display:block;width:100%;height:100%;object-fit:contain;border-radius:50%;}' +
        '.ann-card--photos .ann-eyebrow{margin:14px 26px 0;color:#a07820;}' +
        '.ann-card--photos .ann-title{margin:6px 30px 8px;font-size:1.6rem;color:#0b1529;}' +
        '.ann-card--photos .ann-body{margin:0 30px 20px;}' +
        '.ann-card--photos .ann-actions{flex-direction:column;align-items:stretch;padding:0 30px 26px;gap:6px;}' +
        '.ann-btn--gold{display:flex;align-items:center;justify-content:center;gap:10px;font-family:var(--font-display,inherit);font-weight:500;font-size:1.02rem;' +
        'letter-spacing:.09em;text-transform:uppercase;padding:14px 20px;color:#0b1529;border:0;' +
        'background:linear-gradient(135deg,#f1d38a,#c4962a 55%,#a07820);box-shadow:0 8px 20px rgba(160,120,32,.35);}' +
        '.ann-btn--gold:hover{filter:brightness(1.06);transform:translateY(-1px);}' +
        '.ann-btn--gold svg{width:20px;height:20px;flex:none;}' +
        '.ann-btn--text{background:none;border:0;color:#666b74;font-size:.86rem;padding:8px;}' +
        '.ann-btn--text:hover{color:#0b1529;text-decoration:underline;}' +
        '.ann-subactions{display:flex;justify-content:center;align-items:center;gap:4px;}' +
        '.ann-subactions .ann-dot{color:#c3c7ce;font-size:.8rem;}' +
        '@media (max-width:480px){.ann-art{height:200px;}.ann-stack{top:14px;}.ann-photo{transform-origin:center;}' +
        '.ann-photo--1{transform:translate(-62px,24px) rotate(-13deg) scale(.8);}.ann-photo--2{transform:translate(64px,22px) rotate(12deg) scale(.8);}' +
        '.ann-photo--3{transform:translate(0,2px) rotate(-2deg) scale(.98);}.ann-card--photos .ann-title{font-size:1.35rem;margin:6px 22px 8px;}' +
        '.ann-card--photos .ann-body{margin:0 22px 18px;}.ann-card--photos .ann-actions{padding:0 22px 22px;}}' +
        '@media (prefers-reduced-motion:reduce){.ann-photo{transition:none;}.ann-spark{animation:none;}}';

    // A stylised photograph - sky, sun, two ridgelines - in three colourways,
    // so the stack reads as "photos" at a glance without needing real ones.
    var SCENES = [
        ['#1a2560', '#3b82f6', '#f1d38a', '#121e40', '#2b3f86'],
        ['#a07820', '#f1d38a', '#fff6dc', '#1a2560', '#3f5bb5'],
        ['#0b1529', '#1f3070', '#f1d38a', '#c4962a', '#8a6a1e']
    ];
    function sceneSvg(c, n) {
        return '<svg viewBox="0 0 134 101" aria-hidden="true" focusable="false"><defs><linearGradient id="annSky' + n + '" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0" stop-color="' + c[0] + '"/><stop offset="1" stop-color="' + c[1] + '"/></linearGradient></defs>' +
            '<rect width="134" height="101" fill="url(#annSky' + n + ')"/><circle cx="98" cy="30" r="13" fill="' + c[2] + '"/>' +
            '<path d="M0 101 L0 70 L30 44 L52 64 L78 36 L134 82 L134 101 Z" fill="' + c[4] + '"/>' +
            '<path d="M0 101 L0 84 L40 62 L70 80 L100 60 L134 88 L134 101 Z" fill="' + c[3] + '"/></svg>';
    }
    var CAMERA = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="#0b1529" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.6"/></svg>';
    var GALLERY_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<rect x="3" y="5" width="15" height="13" rx="2"/><path d="M3 15l4-4 4 4 3-3 4 4"/><path d="M21 8v11a2 2 0 0 1-2 2H7"/></svg>';

    // The "photos" card. Returns the pieces render() wires up.
    function buildPhotosCard(a) {
        var card = document.createElement('div'); card.className = 'ann-card ann-card--photos';
        var external = /^https?:/i.test(a.linkUrl || '');

        var art = document.createElement(a.linkUrl ? 'a' : 'div'); art.className = 'ann-art';
        if (a.linkUrl) {
            art.href = a.linkUrl;
            if (external) { art.target = '_blank'; art.rel = 'noopener'; }
            art.setAttribute('aria-label', (a.linkLabel || 'View the photos') + ' - ' + a.title);
        }
        var stack = document.createElement('div'); stack.className = 'ann-stack';
        // frame 3 is the centre one, frames 1 and 2 fan out left and right
        var pics = Array.isArray(a.photos) ? a.photos : [];
        var picFor = [pics[1], pics[2], pics[0]];
        [0, 1, 2].forEach(function (i) {
            var ph = document.createElement('div'); ph.className = 'ann-photo ann-photo--' + (i + 1);
            if (picFor[i]) {
                var pim = document.createElement('img');
                pim.src = picFor[i]; pim.alt = ''; pim.decoding = 'async';
                pim.onerror = function () { ph.innerHTML = sceneSvg(SCENES[i], i); };
                ph.appendChild(pim);
            } else {
                ph.innerHTML = sceneSvg(SCENES[i], i);
            }
            if (i === 2) { var cam = document.createElement('span'); cam.className = 'ann-cam'; cam.innerHTML = CAMERA; ph.appendChild(cam); }
            stack.appendChild(ph);
        });
        art.appendChild(stack);
        [[14, 18, '0s'], [82, 30, '.9s'], [22, 70, '1.7s'], [88, 74, '.4s']].forEach(function (sp) {
            var s = document.createElement('span'); s.className = 'ann-spark'; s.setAttribute('aria-hidden', 'true'); s.textContent = '\u2726';
            s.style.left = sp[0] + '%'; s.style.top = sp[1] + '%'; s.style.animationDelay = sp[2];
            art.appendChild(s);
        });
        card.appendChild(art);

        var x = document.createElement('button'); x.className = 'ann-x'; x.type = 'button'; x.setAttribute('aria-label', 'Close'); x.innerHTML = '&times;';
        card.appendChild(x);          // sits over the art panel (positioned absolutely)

        if (a.logo) {
            var seal = document.createElement('div'); seal.className = 'ann-seal';
            var img = document.createElement('img'); img.src = a.logo; img.alt = a.logoAlt || '';
            seal.appendChild(img); card.appendChild(seal);
        }
        if (a.eyebrow) { var ey = document.createElement('div'); ey.className = 'ann-eyebrow'; ey.textContent = a.eyebrow; card.appendChild(ey); }
        var h = document.createElement('h2'); h.id = 'ann-title'; h.className = 'ann-title'; h.textContent = a.title; card.appendChild(h);
        if (a.body) { var p = document.createElement('p'); p.className = 'ann-body'; p.textContent = a.body; card.appendChild(p); }

        var actions = document.createElement('div'); actions.className = 'ann-actions';
        var links = [art];
        if (a.linkUrl) {
            var cta = document.createElement('a'); cta.className = 'ann-btn ann-btn--gold';
            cta.href = a.linkUrl;
            if (external) { cta.target = '_blank'; cta.rel = 'noopener'; }
            cta.innerHTML = GALLERY_ICON;
            cta.appendChild(document.createTextNode(a.linkLabel || 'View the Photos'));
            actions.appendChild(cta); links.push(cta);
        }
        var sub = document.createElement('div'); sub.className = 'ann-subactions';
        var later = document.createElement('button'); later.type = 'button'; later.className = 'ann-btn ann-btn--text';
        later.textContent = a.dismissLabel || 'Maybe later';
        var dot = document.createElement('span'); dot.className = 'ann-dot'; dot.setAttribute('aria-hidden', 'true'); dot.textContent = '\u2022';
        var never = document.createElement('button'); never.type = 'button'; never.className = 'ann-btn ann-btn--text';
        never.textContent = a.neverLabel || "Don't show again";
        sub.appendChild(later); sub.appendChild(dot); sub.appendChild(never);
        actions.appendChild(sub);
        card.appendChild(actions);
        return { card: card, close: x, dismiss: later, never: never, links: a.linkUrl ? links : [], dismissIsAck: false };
    }

    function render(a, id, mode, force) {
        if (document.getElementById('UCIAC-announce')) return;
        if (!document.getElementById('ann-css')) {
            var st = document.createElement('style'); st.id = 'ann-css'; st.textContent = CSS; document.head.appendChild(st);
        }

        var back = document.createElement('div');
        back.id = 'UCIAC-announce'; back.className = 'ann-backdrop';
        back.setAttribute('role', 'dialog'); back.setAttribute('aria-modal', 'true'); back.setAttribute('aria-labelledby', 'ann-title');

        var built = a.layout === 'photos' ? buildPhotosCard(a) : null;
        var card = built ? built.card : document.createElement('div');
        if (!built) card.className = 'ann-card';
        var bar = document.createElement('div'); bar.className = 'ann-bar';
        var x = built ? built.close : document.createElement('button');
        if (!built) {
        x.className = 'ann-x'; x.type = 'button'; x.setAttribute('aria-label', 'Close'); x.innerHTML = '&times;';
        card.appendChild(bar); card.appendChild(x);
        if (a.eyebrow) { var ey = document.createElement('div'); ey.className = 'ann-eyebrow'; ey.textContent = a.eyebrow; card.appendChild(ey); }
        var h = document.createElement('h2'); h.id = 'ann-title'; h.className = 'ann-title'; h.textContent = a.title; card.appendChild(h);
        if (a.body) { var p = document.createElement('p'); p.className = 'ann-body'; p.textContent = a.body; card.appendChild(p); }

        var actions = document.createElement('div'); actions.className = 'ann-actions';
        if (a.linkUrl) {
            var link = document.createElement('a'); link.className = 'ann-btn ann-btn--primary';
            link.href = a.linkUrl; link.textContent = a.linkLabel || 'Learn More';
            if (/^https?:/i.test(a.linkUrl)) { link.target = '_blank'; link.rel = 'noopener'; }
            link.addEventListener('click', function () { dismiss(true); });   // engaging with the CTA counts as received
            actions.appendChild(link);
        }
        var got = document.createElement('button'); got.type = 'button'; got.className = 'ann-btn ann-btn--ghost';
        got.textContent = mode === 'acknowledge' ? "Don't show this again" : (a.linkUrl ? 'Dismiss' : 'Got it');
        actions.appendChild(got);
        card.appendChild(actions);
        } else {
            var got = built.dismiss;
            // opening the album counts as having seen it for this session
            built.links.forEach(function (l) { l.addEventListener('click', function () { dismiss(false); }); });
        }

        back.appendChild(card);
        document.body.appendChild(back);
        requestAnimationFrame(function () { back.classList.add('is-open'); });
        setTimeout(function () { x.focus(); }, 60);

        function dismiss(acknowledged) {
            back.classList.remove('is-open');
            setTimeout(function () { if (back.parentNode) back.parentNode.removeChild(back); }, 260);
            document.removeEventListener('keydown', onKey);
            if (!force) remember(mode, id, acknowledged);
        }
        function onKey(e) {
            if (e.key === 'Escape') dismiss(false);
            if (e.key === 'Tab') {
                var f = back.querySelectorAll('button, a[href]');
                if (!f.length) return;
                var first = f[0], last = f[f.length - 1];
                if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        }
        x.addEventListener('click', function () { dismiss(false); });
        got.addEventListener('click', function () { dismiss(true); });
        if (built && built.never) built.never.addEventListener('click', function () {
            if (!force) lset('annNever_' + id);
            dismiss(true);
        });
        back.addEventListener('click', function (e) { if (e.target === back) dismiss(false); });
        document.addEventListener('keydown', onKey);
    }
})();
