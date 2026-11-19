// Sportsmanship Summit: one section per summit from data/sportsmanship-summit.json,
// newest first - its title, date, a photo grid, and a link to the full album.
// A summit with no photos posted yet shows its album link on its own. Clicking
// a photo opens it full size in a viewer with previous/next (arrow keys too).
document.addEventListener('DOMContentLoaded', function () {
    var root = document.querySelector('.summit-events');
    if (!root) return;

    var dialog = document.querySelector('.summit-lightbox');
    var lbImg = dialog ? dialog.querySelector('img') : null;
    var lbCap = dialog ? dialog.querySelector('figcaption') : null;
    var current = { photos: [], i: 0 };

    fetch('data/sportsmanship-summit.json')
        .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
        .then(function (data) {
            var events = (data.events || []).filter(function (e) { return e && e.title; });
            if (!events.length) return;          // keep the "will be posted" line
            events.sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')); });
            root.innerHTML = '';
            events.forEach(function (e) { root.appendChild(buildEvent(e)); });
        })
        .catch(function () { /* the placeholder line stays */ });

    function formatDate(iso) {
        var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
        if (!m) return iso || '';
        var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
        return d.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', day: 'numeric', year: 'numeric' });
    }

    function buildEvent(e) {
        var section = document.createElement('section');
        section.className = 'summit-event';

        var head = document.createElement('div');
        head.className = 'summit-head';
        var h2 = document.createElement('h2');
        h2.textContent = e.title;
        head.appendChild(h2);
        if (e.date) {
            var when = document.createElement('p');
            when.className = 'summit-date';
            when.textContent = formatDate(e.date);
            head.appendChild(when);
        }
        if (e.description) {
            var desc = document.createElement('p');
            desc.className = 'summit-desc';
            desc.textContent = e.description;
            head.appendChild(desc);
        }
        section.appendChild(head);

        var photos = (e.photos || []).filter(function (p) { return p && p.src; });
        if (photos.length) {
            var grid = document.createElement('ul');
            grid.className = 'summit-grid';
            photos.forEach(function (p, i) {
                var li = document.createElement('li');
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'summit-thumb';
                btn.setAttribute('aria-label', 'View photo ' + (i + 1) + ' of ' + photos.length + (p.caption ? ': ' + p.caption : ''));
                var img = document.createElement('img');
                img.src = p.thumb || p.src;
                img.alt = p.caption || (e.title + ', photo ' + (i + 1));
                img.loading = 'lazy';
                img.decoding = 'async';
                btn.appendChild(img);
                btn.addEventListener('click', function () { open(photos, i, e.title); });
                li.appendChild(btn);
                grid.appendChild(li);
            });
            section.appendChild(grid);
        }

        if (e.album) {
            var a = document.createElement('a');
            a.className = 'btn summit-album';
            a.href = e.album;
            a.target = '_blank';
            a.rel = 'noopener';
            a.textContent = photos.length ? 'See the full photo album' : 'View the photo album';
            section.appendChild(a);
        }
        return section;
    }

    // ---- full-size viewer ----------------------------------------------------
    function open(photos, i, title) {
        if (!dialog || typeof dialog.showModal !== 'function') {
            window.open(photos[i].src, '_blank', 'noopener');
            return;
        }
        current = { photos: photos, i: i, title: title };
        show();
        dialog.showModal();
    }

    function show() {
        var p = current.photos[current.i];
        lbImg.src = p.src;
        lbImg.alt = p.caption || (current.title + ', photo ' + (current.i + 1));
        lbCap.textContent = (p.caption ? p.caption + ' · ' : '') + (current.i + 1) + ' of ' + current.photos.length;
        var many = current.photos.length > 1;
        dialog.querySelector('.summit-lb-prev').hidden = !many;
        dialog.querySelector('.summit-lb-next').hidden = !many;
    }

    function step(by) {
        var n = current.photos.length;
        if (n < 2) return;
        current.i = (current.i + by + n) % n;
        show();
    }

    if (dialog) {
        dialog.querySelector('.summit-lb-close').addEventListener('click', function () { dialog.close(); });
        dialog.querySelector('.summit-lb-prev').addEventListener('click', function () { step(-1); });
        dialog.querySelector('.summit-lb-next').addEventListener('click', function () { step(1); });
        // a click on the dark backdrop (outside the photo) closes it
        dialog.addEventListener('click', function (ev) { if (ev.target === dialog) dialog.close(); });
        dialog.addEventListener('keydown', function (ev) {
            if (ev.key === 'ArrowLeft') { ev.preventDefault(); step(-1); }
            if (ev.key === 'ArrowRight') { ev.preventDefault(); step(1); }
        });
        dialog.addEventListener('close', function () { lbImg.removeAttribute('src'); });
    }
});
