// UCC All-Conference. One page, two views:
//   all-conference.html                     every sport with honorees, grouped
//                                           by season (Fall, Winter, Spring),
//                                           each linking to its own page;
//   all-conference.html?sport=boys-cross-country
//                                           one sport's honorees for a year:
//                                           the county-wide All-Union County
//                                           teams, then each UCC division
//                                           (Watchung, Mountain, Valley), with
//                                           Year and Division pickers.
// The top menu's All-Conference dropdown (js/nav-render.js) lists the same
// seasons and sports with the same links, so adding a sport's names to
// all-conference.json is all it takes for it to appear in both places.
// Names keep the order all-conference.json lists them in (the order the
// conference published them, which for a race is the finishing order).
// A school's crest comes from directory.json when the school's name matches
// an entry there; otherwise the name is shown as plain text.
document.addEventListener('DOMContentLoaded', function () {
    var section = document.querySelector('.ucc-allconference');
    if (!section) return;

    var intro = section.querySelector('.allconf-intro');
    var back = section.querySelector('.allconf-back');
    var controls = section.querySelector('.allconf-controls');
    var yearSel = section.querySelector('#allconf-year');
    var divisionSel = section.querySelector('#allconf-division');
    var divisionField = divisionSel ? divisionSel.closest('.allconf-field') : null;
    var results = section.querySelector('.allconf-results');
    var empty = section.querySelector('.allconf-empty');
    if (!controls || !yearSel || !results || !empty) return;

    var TEAM_ORDER = ['first team', 'second team', 'third team', 'honorable mention'];
    var params = new URLSearchParams(location.search);
    var wanted = params.get('sport');
    var wantedDivision = params.get('division');

    var selections = [];          // the chosen sport's honorees, every year
    var crests = {};
    var divisionOrder = [];
    var divisionLabels = {};
    var awards = [];

    // The conference's lists use short names for a few schools.
    var SCHOOL_ALIASES = {
        aljohnson: 'arthurljohnson',
        dayton: 'jonathandayton',
        oratory: 'oratoryprep',
        abrahamclarkroselle: 'roselle',
        abrahamclark: 'roselle'
    };

    function getJson(path) {
        return fetch(path).then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); });
    }

    Promise.all([
        getJson('data/all-conference.json'),
        // The directory only supplies crests, so its failure must not stop the page.
        getJson('data/directory.json').catch(function () { return {}; })
    ]).then(function (loaded) {
        var data = loaded[0];

        (loaded[1].directory || []).forEach(function (d) {
            if (d && d.school && d.logo) crests[schoolKey(d.school)] = d.logo;
        });

        divisionOrder = (data.divisionOrder || []).map(function (d) { return String(d).toLowerCase(); });
        divisionLabels = data.divisionLabels || {};
        awards = (data.awards || []).map(function (a) { return String(a).toLowerCase(); });

        var all = (data.selections || []).filter(function (s) {
            return s && s.name && s.school && s.sport && s.year;
        });
        all.forEach(function (s, i) { s._order = i; });

        if (!wanted) {
            if (data.intro && intro) {
                intro.textContent = data.intro;
                intro.hidden = false;
            }
            empty.hidden = true;
            showSeasons(all, data.seasons || ['Fall', 'Winter', 'Spring']);
            return;
        }

        if (back) back.hidden = false;
        selections = all.filter(function (s) { return sportSlug(s.sport) === wanted; });
        empty.hidden = true;
        if (!selections.length) {
            message('No All-Conference selections are listed for this sport yet.');
            return;
        }
        nameThePage(selections[0]);
        controls.hidden = false;
        buildYears();
        buildDivisions(wantedDivision);
        render();
    }).catch(function () { /* the empty-state line stays */ });

    yearSel.addEventListener('change', function () { buildDivisions(); render(); remember(); });
    if (divisionSel) divisionSel.addEventListener('change', function () { render(); remember(); });

    // Must match sportSlug() in js/nav-render.js, which builds the menu links.
    function sportSlug(name) {
        return String(name || '').toLowerCase()
            .replace(/&/g, ' and ')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    // Compare school names on a stripped key, so "St." / "Saint", "&" / "and"
    // and a trailing "High School" do not stop a crest from matching.
    function schoolKey(name) {
        var k = String(name || '').toLowerCase()
            .replace(/\bst\.?(?=\s)/g, 'saint')
            .replace(/&/g, 'and')
            .replace(/\bhigh school\b/g, '')
            .replace(/[^a-z0-9]/g, '');
        return SCHOOL_ALIASES[k] || k;
    }

    function divisionLabel(d) {
        return divisionLabels[d] || (d + ' Division');
    }

    function isAward(team) {
        return awards.indexOf(String(team || '').toLowerCase()) !== -1;
    }

    function option(value, label) {
        var o = document.createElement('option');
        o.value = value;
        o.textContent = label;
        return o;
    }

    function message(text) {
        results.innerHTML = '';
        var p = document.createElement('p');
        p.className = 'allconf-none';
        p.textContent = text;
        results.appendChild(p);
    }

    function newestFirst(a, b) {
        return (parseInt(b, 10) - parseInt(a, 10)) || (a < b ? 1 : a > b ? -1 : 0);
    }

    function crestImg(school) {
        var logo = crests[schoolKey(school)];
        if (!logo) return null;
        var img = document.createElement('img');
        img.className = 'allconf-crest';
        img.src = 'images/logos/optimized/' + logo;
        img.alt = '';
        img.loading = 'lazy';
        img.onerror = function () { this.style.display = 'none'; };
        return img;
    }

    // ---- The seasons list (no ?sport=) --------------------------------------

    function showSeasons(all, seasons) {
        var bySeason = {};
        var order = seasons.slice();
        all.forEach(function (s) {
            var season = s.season || 'Other';
            if (order.indexOf(season) === -1) order.push(season);
            var group = bySeason[season] = bySeason[season] || {};
            var slug = sportSlug(s.sport);
            if (!group[slug]) group[slug] = { name: s.sport, years: [] };
            if (group[slug].years.indexOf(s.year) === -1) group[slug].years.push(s.year);
        });

        results.innerHTML = '';
        order.forEach(function (season) {
            var block = document.createElement('section');
            block.className = 'allconf-season';
            block.id = sportSlug(season);

            var h2 = document.createElement('h2');
            h2.className = 'allconf-season-name';
            h2.textContent = season;
            block.appendChild(h2);

            var group = bySeason[season] || {};
            var slugs = Object.keys(group).sort(function (a, b) {
                return group[a].name.localeCompare(group[b].name, undefined, { sensitivity: 'base' });
            });
            if (!slugs.length) {
                var p = document.createElement('p');
                p.className = 'allconf-none';
                p.textContent = season + ' All-Conference teams are posted after the season.';
                block.appendChild(p);
                results.appendChild(block);
                return;
            }

            var ul = document.createElement('ul');
            ul.className = 'allconf-sports';
            slugs.forEach(function (slug) {
                var sport = group[slug];
                var li = document.createElement('li');
                var a = document.createElement('a');
                a.href = 'all-conference.html?sport=' + slug;

                var name = document.createElement('span');
                name.className = 'allconf-sport-name';
                name.textContent = sport.name;
                a.appendChild(name);

                var meta = document.createElement('span');
                meta.className = 'allconf-sport-meta';
                meta.textContent = [season, sport.years.sort(newestFirst)[0]].filter(Boolean).join(' · ');
                a.appendChild(meta);

                li.appendChild(a);
                ul.appendChild(li);
            });
            block.appendChild(ul);
            results.appendChild(block);
        });

        // the menu links straight to a season (all-conference.html#winter)
        if (location.hash) {
            var target = document.getElementById(location.hash.slice(1));
            if (target) target.scrollIntoView();
        }
    }

    // ---- One sport's page (?sport=...) --------------------------------------

    function nameThePage(first) {
        var eyebrow = document.querySelector('.page-head .eyebrow');
        var h1 = document.querySelector('.page-head h1');
        var sub = document.querySelector('.page-head p');
        if (eyebrow && first.season) eyebrow.textContent = first.season + ' All-Conference';
        if (h1) h1.textContent = first.sport;
        if (sub) sub.textContent = 'All-Union County and Union County Conference division honors in ' + first.sport + '.';
        document.title = first.sport + ' All-Conference | UCC';
    }

    // Newest year first, and the newest is the default.
    function buildYears() {
        var years = [];
        selections.forEach(function (s) { if (years.indexOf(s.year) === -1) years.push(s.year); });
        years.sort(newestFirst);
        yearSel.innerHTML = '';
        years.forEach(function (y) { yearSel.appendChild(option(y, y)); });
        var asked = params.get('year');
        yearSel.value = asked && years.indexOf(asked) !== -1 ? asked : years[0];
    }

    // The Division picker only appears when the chosen year has selections
    // listed by division; otherwise every name shows.
    function buildDivisions(preferred) {
        if (!divisionSel) return;
        var keep = preferred || divisionSel.value || 'all';
        var present = [];
        selections.forEach(function (s) {
            if (s.division && s.year === yearSel.value && present.indexOf(s.division) === -1) present.push(s.division);
        });
        present.sort(byDivision);
        divisionSel.innerHTML = '';
        divisionSel.appendChild(option('all', 'All divisions'));
        present.forEach(function (d) { divisionSel.appendChild(option(d, divisionLabel(d))); });
        var match = present.filter(function (d) { return d.toLowerCase() === String(keep).toLowerCase() || sportSlug(d) === sportSlug(keep); })[0];
        divisionSel.value = match || 'all';
        if (divisionField) divisionField.hidden = !present.length;
    }

    // Keep the picked year and division in the address, so the view can be shared.
    function remember() {
        if (!window.history || !history.replaceState) return;
        var q = new URLSearchParams(location.search);
        var division = divisionSel ? divisionSel.value : 'all';
        if (division && division !== 'all') q.set('division', sportSlug(division)); else q.delete('division');
        if (yearSel.options.length && yearSel.value !== yearSel.options[0].value) q.set('year', yearSel.value); else q.delete('year');
        history.replaceState(null, '', location.pathname + '?' + q.toString());
    }

    // Divisions in the order all-conference.json gives, then anything else A-Z.
    function byDivision(a, b) {
        var ra = divisionOrder.indexOf(String(a).toLowerCase());
        var rb = divisionOrder.indexOf(String(b).toLowerCase());
        if (ra === -1) ra = divisionOrder.length;
        if (rb === -1) rb = divisionOrder.length;
        return (ra - rb) || (a < b ? -1 : a > b ? 1 : 0);
    }

    function teamRank(team) {
        var k = String(team || '').toLowerCase();
        var i = TEAM_ORDER.indexOf(k);
        return i === -1 ? TEAM_ORDER.length : i;
    }

    function render() {
        var division = divisionSel ? divisionSel.value : 'all';
        var rows = selections.filter(function (s) {
            return s.year === yearSel.value && (division === 'all' || s.division === division);
        });
        if (!rows.length) {
            message('No selections are listed for this year and division.');
            return;
        }
        results.innerHTML = '';

        // A sport picked conference-wide has no division, so its teams sit
        // straight under the page heading.
        var divisions = {};
        var order = [];
        rows.forEach(function (s) {
            var k = s.division || '';
            if (!divisions[k]) { divisions[k] = []; order.push(k); }
            divisions[k].push(s);
        });
        order.sort(function (a, b) {
            if (!a || !b) return a ? 1 : b ? -1 : 0;
            return byDivision(a, b);
        });

        order.forEach(function (k) {
            var block = document.createElement('section');
            block.className = 'allconf-group';
            if (k) {
                var h2 = document.createElement('h2');
                h2.className = 'allconf-division';
                h2.textContent = divisionLabel(k);
                block.appendChild(h2);
            }
            var groupRows = divisions[k];
            appendAwards(block, groupRows.filter(function (s) { return isAward(s.team); }));
            appendTeams(block, groupRows.filter(function (s) { return !isAward(s.team); }), k ? 'h3' : 'h2');
            results.appendChild(block);
        });
    }

    // Runner / Team / Coach of the Year: one card each, above the team lists.
    function appendAwards(block, rows) {
        if (!rows.length) return;
        rows.sort(function (a, b) {
            return (awards.indexOf(a.team.toLowerCase()) - awards.indexOf(b.team.toLowerCase())) || (a._order - b._order);
        });
        var ul = document.createElement('ul');
        ul.className = 'allconf-awards';
        rows.forEach(function (s) {
            var li = document.createElement('li');

            var label = document.createElement('span');
            label.className = 'allconf-award-label';
            label.textContent = s.team;
            li.appendChild(label);

            var who = document.createElement('span');
            who.className = 'allconf-award-name';
            var crest = crestImg(s.school);
            if (crest) who.appendChild(crest);
            who.appendChild(document.createTextNode(s.name));
            li.appendChild(who);

            if (s.name !== s.school) {
                var school = document.createElement('span');
                school.className = 'allconf-award-school';
                school.textContent = s.school;
                li.appendChild(school);
            }
            ul.appendChild(li);
        });
        block.appendChild(ul);
    }

    function appendTeams(block, rows, headingTag) {
        // Team headings in a fixed order (First, Second, Third, Honorable Mention,
        // then anything else A-Z). Teams are grouped without regard to case so
        // "First team" and "First Team" do not become two headings.
        var teams = {};
        var teamOrder = [];
        rows.forEach(function (s) {
            var label = s.team || 'Selections';
            var k = label.toLowerCase();
            if (!teams[k]) { teams[k] = { label: label, rows: [] }; teamOrder.push(k); }
            teams[k].rows.push(s);
        });
        teamOrder.sort(function (a, b) {
            return (teamRank(a) - teamRank(b)) || (a < b ? -1 : a > b ? 1 : 0);
        });

        var grid = document.createElement('div');
        grid.className = 'allconf-teams';
        teamOrder.forEach(function (k) {
            var col = document.createElement('div');
            col.className = 'allconf-team-block';

            var heading = document.createElement(headingTag);
            heading.className = 'allconf-team';
            heading.textContent = teams[k].label;
            col.appendChild(heading);

            var ol = document.createElement('ol');
            ol.className = 'allconf-list';
            teams[k].rows.slice().sort(function (a, b) { return a._order - b._order; })
                .forEach(function (s) { ol.appendChild(buildRow(s)); });
            col.appendChild(ol);
            grid.appendChild(col);
        });
        block.appendChild(grid);
    }

    function buildRow(s) {
        var li = document.createElement('li');

        var name = document.createElement('span');
        name.className = 'allconf-name';
        name.textContent = s.name;
        li.appendChild(name);

        var school = document.createElement('span');
        school.className = 'allconf-school';
        var crest = crestImg(s.school);
        if (crest) school.appendChild(crest);
        school.appendChild(document.createTextNode(s.school));
        li.appendChild(school);

        if (s.position || s.event) {
            var pos = document.createElement('span');
            pos.className = 'allconf-pos';
            pos.textContent = s.position || s.event;
            li.appendChild(pos);
        }
        return li;
    }
});
