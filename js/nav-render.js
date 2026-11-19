// Builds the top navigation from data/nav.json rather than from a copy of the
// markup hand-duplicated into all seven pages - which is what it used to be,
// and which meant every wording change (there have been several) meant editing
// every file that carried it. This one script is the entire menu now.
//
// It also absorbs everything js/redesign-nav.js used to do (the hamburger,
// the tap-to-reveal-submenu-then-navigate behaviour, closing on navigate) into
// the same file, run immediately after the menu is built rather than on a
// separate DOMContentLoaded. That ordering matters: the old script assumed the
// menu already existed in the DOM when it ran. This one fetches nav.json
// first, so if the interactivity were wired up by a second, independently-
// timed script, it would very likely run before the menu it is trying to
// attach to actually exists, and silently do nothing.
document.addEventListener('DOMContentLoaded', function () {
    var toggle = document.querySelector('.nav-toggle');
    var list = document.getElementById('primary-menu');
    if (!toggle || !list) return;

    // "index.html" here, "" (the site root) on Netlify once you have actually
    // navigated to "/" rather than "/index.html" - both mean the home page.
    var onHome = /(^|\/)(index\.html)?$/.test(location.pathname);
    var here = location.pathname.split('/').pop() || 'index.html';

    // A link's canonical form is always "index.html#section" - portable from
    // any page. On the home page itself that becomes a same-document anchor
    // instead: "index.html#standings" would otherwise be a different URL from
    // the bare "/" a visitor is actually standing on, and clicking it forces a
    // full reload to get there rather than the smooth scroll a same-page
    // anchor gives for free.
    function resolveHref(href) {
        if (onHome) return href.replace(/^index\.html(?=#)/, '');
        return href;
    }

    // Current page: the one item whose own link, or one of whose children's
    // links, points at the file actually being viewed. Anchors do not count -
    // "index.html#standings" is not "the standings page", it is a section of
    // the home page - only a bare filename match marks anything current.
    function ownsCurrentPage(href) {
        // A link with a fragment is a section of some page, not a page of its
        // own - "index.html#member-schools" must never count as "the current
        // page" just because its filename half happens to match, or every
        // anchor link on the home page would falsely mark itself current the
        // moment you're standing on the home page at all.
        if (href.indexOf('#') !== -1) return false;
        return href === here;
    }

    function buildItem(item) {
        var li = document.createElement('li');
        var isParent = Array.isArray(item.children) && item.children.length > 0;

        if (isParent) li.className = 'has-sub';
        var current = ownsCurrentPage(item.href) ||
            (isParent && item.children.some(function (c) { return ownsCurrentPage(c.href); }));

        var a = document.createElement('a');
        a.href = resolveHref(item.href);
        a.textContent = item.label;
        if (current) a.setAttribute('aria-current', 'page');
        li.appendChild(a);

        if (isParent) {
            var sub = document.createElement('ul');
            sub.className = 'subnav';
            item.children.forEach(function (child) { sub.appendChild(buildChild(child)); });
            li.appendChild(sub);
        }
        return li;
    }

    // A dropdown entry. One with its own 'children' (All-Conference > Fall >
    // sports) gets a flyout list beside the dropdown on desktop, and opens in
    // place on the collapsed phone menu.
    function buildChild(child) {
        var cli = document.createElement('li');
        var ca = document.createElement('a');
        ca.href = resolveHref(child.href);
        ca.textContent = child.label;
        cli.appendChild(ca);
        if (Array.isArray(child.children) && child.children.length) {
            cli.className = 'has-sub has-fly';
            var fly = document.createElement('ul');
            fly.className = 'subnav subnav--fly';
            child.children.forEach(function (g) {
                var gli = document.createElement('li');
                var ga = document.createElement('a');
                ga.href = resolveHref(g.href);
                ga.textContent = g.label;
                gli.appendChild(ga);
                fly.appendChild(gli);
            });
            cli.appendChild(fly);
        }
        return cli;
    }

    // The All-Conference dropdown is built from data/all-conference.json: one
    // entry per season (Fall, Winter, Spring), each with a flyout of the sports
    // that have honorees that season, A-Z. A newly posted sport appears in the
    // menu without anyone editing nav.json. The slug must match sportSlug() in
    // js/all-conference.js, which reads ?sport= to pick the sport.
    function sportSlug(name) {
        return String(name || '').toLowerCase()
            .replace(/&/g, ' and ')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    function fetchAllConferenceSeasons() {
        return fetch('data/all-conference.json')
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (d) {
                if (!d) return [];
                var seasons = (d.seasons && d.seasons.length) ? d.seasons.slice() : ['Fall', 'Winter', 'Spring'];
                var bySeason = {};
                var seen = {};
                (d.selections || []).forEach(function (s) {
                    var slug = s && s.sport && s.name ? sportSlug(s.sport) : '';
                    if (!slug || seen[slug]) return;
                    seen[slug] = true;
                    var season = s.season || 'Other';
                    if (seasons.indexOf(season) === -1) seasons.push(season);
                    (bySeason[season] = bySeason[season] || []).push({ label: s.sport, href: 'all-conference.html?sport=' + slug });
                });
                return seasons.map(function (season) {
                    var sports = (bySeason[season] || []).sort(function (a, b) {
                        return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
                    });
                    return { label: season, href: 'all-conference.html#' + sportSlug(season), children: sports };
                });
            })
            // Without it the item is still a working link to the All-Conference page.
            .catch(function () { return []; });
    }

    function withAutoChildren(item, seasons) {
        if (item.autoChildren !== 'all-conference' || !seasons.length) return item;
        return { label: item.label, href: item.href, children: seasons };
    }

    // The four Extra Pages are optional, independent, and quiet about their
    // own absence - each is asked for individually so one missing or
    // unpublished page can never hold up the other three, or the core menu.
    var EXTRA_PAGES = [
        'data/pages/custom-1.json', 'data/pages/custom-2.json',
        'data/pages/custom-3.json', 'data/pages/custom-4.json',
    ];

    function fetchExtraItem(path) {
        return fetch(path)
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (d) {
                if (!d || !d.published || !d.navLabel || !d.file) return null;
                return { label: d.navLabel, href: d.file };
            })
            .catch(function () { return null; });
    }

    Promise.all([
        fetch('data/nav.json').then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); }),
        Promise.all(EXTRA_PAGES.map(fetchExtraItem)),
        fetchAllConferenceSeasons(),
    ]).then(function (results) {
        var core = (results[0].items || []).map(function (item) { return withAutoChildren(item, results[2]); });
        var extras = results[1].filter(Boolean);
        core.concat(extras).forEach(function (item) { list.appendChild(buildItem(item)); });
        wireInteractivity();
    }).catch(function () {
        // The menu failing to load is a real problem, but it must not be a
        // silent one - a page with no way to get anywhere else is the worst
        // version of this failure. A minimal way home is better than nothing.
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = onHome ? '#' : 'index.html';
        a.textContent = 'Home';
        li.appendChild(a);
        list.appendChild(li);
    });

    // ---- Everything js/redesign-nav.js used to do, run after the menu above
    //      actually exists rather than raced against it. ----
    function wireInteractivity() {
        function collapsed() {
            return getComputedStyle(toggle).display !== 'none';
        }

        function close() {
            list.classList.remove('open');
            toggle.setAttribute('aria-expanded', 'false');
            list.querySelectorAll('.has-sub.open').forEach(function (li) {
                li.classList.remove('open');
            });
        }

        toggle.addEventListener('click', function () {
            if (list.classList.contains('open')) { close(); return; }
            list.classList.add('open');
            toggle.setAttribute('aria-expanded', 'true');
        });

        list.querySelectorAll('a').forEach(function (link) {
            var parent = link.parentElement;
            var isParent = parent.classList.contains('has-sub') && !!parent.querySelector('.subnav');

            link.addEventListener('click', function (e) {
                if (!collapsed()) return;

                if (isParent && !parent.classList.contains('open')) {
                    e.preventDefault();
                    parent.classList.add('open');
                    return;
                }
                if (isParent) return;

                close();
            });
        });

        function layout() { fitOneRow(); placeSubmenus(); }
        window.addEventListener('resize', function () {
            if (!collapsed()) close();
            layout();
        });
        layout();
        // web fonts change the item widths once they load
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);

        // The desktop bar must be one row. The CSS sizes leave room to spare,
        // but a font can render wider on some computers (or with browser zoom),
        // so if the items still wrap, step the type and spacing down a little
        // at a time until they fit.
        function fitOneRow() {
            list.style.removeProperty('--nav-scale');
            if (collapsed()) return;
            var scale = 1;
            while (wraps() && scale > 0.8) {
                scale = Math.round((scale - 0.02) * 100) / 100;
                list.style.setProperty('--nav-scale', scale);
            }
        }
        function wraps() {
            var items = list.querySelectorAll(':scope > li');
            if (items.length < 2) return false;
            return items[items.length - 1].offsetTop > items[0].offsetTop + 4;
        }
    }

    // A dropdown opens rightwards from its menu item unless that would run past
    // the right edge of the window, in which case it opens leftwards. Decided
    // from where the item actually sits rather than from its place in the list:
    // the bar wraps onto a second row, which puts the last items at the far
    // LEFT, and a leftward dropdown there ran off the screen. A hidden dropdown
    // still counts toward page width, so this matters even while closed.
    function placeSubmenus() {
        var edge = document.documentElement.clientWidth;
        list.querySelectorAll(':scope > li.has-sub').forEach(function (li) {
            var sub = li.querySelector('.subnav');
            if (!sub) return;
            var left = li.getBoundingClientRect().left;
            var opensLeft = left + sub.offsetWidth > edge - 8;
            li.classList.toggle('opens-left', opensLeft);
            // flyouts (All-Conference > Fall > sports) open to whichever side has room
            var fly = sub.querySelector('.subnav--fly');
            if (fly) {
                var subLeft = opensLeft ? li.getBoundingClientRect().right - sub.offsetWidth : left;
                li.classList.toggle('fly-left', subLeft + sub.offsetWidth + fly.offsetWidth > edge - 8);
            }
        });
    }
});
