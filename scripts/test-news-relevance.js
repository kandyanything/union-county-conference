/**
 * Regression test for the news relevance filter.
 *
 * The press wire was publishing schools that are not in this conference,
 * because stripping " High School" off a member name leaves a bare word that
 * is a prefix or suffix of somebody else's: "Union" matched Union City,
 * "Plainfield" matched North Plainfield, and a story about Metuchen against
 * North Plainfield reached the Union County homepage.
 *
 * Run: node scripts/test-news-relevance.js
 */
const { matchRelevance, relevanceText, SPORTS_TERMS_RE } = require('./build-news.js');

// What classify() really asks: does this name one of ours, AND is it sport?
// Both gates matter - "Roselle Park Borough Council approves the budget" names
// a member school and is still not a sports story.
function wouldPublish(title, excerpt) {
    const { confHit, schoolName } = matchRelevance(relevanceText(title, excerpt));
    if (!confHit && schoolName === null) return { publish: false, schoolName };
    return { publish: SPORTS_TERMS_RE.test(title), schoolName };
}

// [ headline, shouldBeRelevant, why ]
const CASES = [
    // ---- the ones that reached the live homepage and should not have ----
    ['Senior rushes for 5 TDs as defense does its part in dominant win . Union City defeats Paterson Eastside - Football recap',
        false, 'Union City is Hudson County, not our Union'],
    ['Metuchen boys soccer rallies past North Plainfield in battle for first place',
        false, 'Metuchen and North Plainfield are both outside the conference'],

    // ---- real conference stories that must keep flowing ----
    ['No. 11 Scotch Plains-Fanwood boys soccer survives double overtime scare against Union',
        true, 'Scotch Plains-Fanwood and Union are both ours'],
    ['Union Catholic girls soccer tops Westfield in county semifinal',
        true, 'Union Catholic and Westfield are both ours'],
    ['Plainfield football rolls past Linden', true, 'Plainfield and Linden are ours'],
    ['Roselle Park volleyball sweeps Roselle Catholic', true, 'both are ours'],
    ['Cranford field hockey shuts out Summit', true, 'both are ours'],
    ['Kent Place soccer beats Oak Knoll in overtime',
        true, 'both are ours and must survive the move off DigitalSports'],
    ['Oratory Prep wrestling wins the district title',
        true, 'Oratory Prep is ours and is not in ds-schools.json'],
    ['Governor Livingston cross country sweeps the county meet', true, 'ours'],
    ['Arthur L. Johnson baseball edges Rahway', true, 'both ours'],
    ['New Providence girls basketball tops Hillside', true, 'both ours'],
    ['Elizabeth wrestling wins the county tournament', true, 'ours'],
    ['David Brearley football beats Jonathan Dayton', true, 'both ours'],

    // ---- near misses on the same words ----
    ['North Plainfield boys soccer wins its opener', false, 'North Plainfield is not Plainfield'],
    ['South Plainfield wrestling takes the district', false, 'South Plainfield is not ours'],
    ['Union City football clinches a playoff berth', false, 'Union City is not Union'],
    ['West Orange soccer beats Montclair', false, 'Essex County, nobody of ours named'],
    ['Toms River North wins the Shore Conference title', false, 'no conference school named'],
    ['Summit Medical Group opens a new clinic', false, 'Summit here is not the school'],
    ['Roselle Park Borough Council approves the budget', false, 'no sports word at all'],

    // ---- conference named outright ----
    ['Union County Conference announces realignment for the fall season',
        true, 'conference named in full'],

    // ---- the county IS the conference, so county-wide sport counts ----
    ['Who wins the 2026 Union County girls soccer title? Favorite, contenders and a dark horse',
        true, 'a county-wide preview is exactly our readership'],
    ['Union County tournament seeds are set for wrestling',
        true, 'the county tournament is our competition'],
    ['Union County College basketball hires a new head coach',
        false, 'the community college is not us'],
    ['Union County Prosecutor charges two in a coaching case',
        false, 'county government, not the conference'],
];

// Headline + summary pairs: the summary's first word must not glue onto the
// headline's last word and invent a school.
// [ title, excerpt, shouldBeRelevant, why ]
const PAIR_CASES = [
    ['Senior rushes for 5 TDs as defense does its part in dominant win',
        'Union City defeats Paterson Eastside - Football recap',
        false, 'the only school named anywhere is Union City'],
    ['Metuchen boys soccer rallies past North Plainfield in battle for first place',
        'Manopo leads comeback for Bulldogs',
        false, 'neither school is ours'],
    ['No. 11 Scotch Plains-Fanwood boys soccer survives double overtime scare against Union',
        'This one did not have the makings of an instant classic on paper',
        true, 'Scotch Plains-Fanwood is ours'],
    ['Cranford field hockey shuts out Summit',
        'Only two players found the net for the Cougars',
        true, 'summary starting with a capital must not break the match'],
];

let pass = 0, fail = 0;
const failures = [];

function check(got, want, label, schoolName, why) {
    if (got === want) {
        pass++;
        console.log(`  ok    ${want ? 'KEEP  ' : 'REJECT'}  ${label.slice(0, 66)}`);
    } else {
        fail++;
        failures.push({ label, want, got, why, schoolName });
        console.log(`  FAIL  want ${want ? 'KEEP' : 'REJECT'}, got ${got ? 'KEEP' : 'REJECT'}  ${label.slice(0, 52)}`);
    }
}

for (const [title, excerpt, want, why] of PAIR_CASES) {
    const r = wouldPublish(title, excerpt);
    check(r.publish, want, '[+summary] ' + title, r.schoolName, why);
}

for (const [headline, want, why] of CASES) {
    const r = wouldPublish(headline, '');
    check(r.publish, want, headline, r.schoolName, why);
}

console.log(`\n${pass} passed, ${fail} failed, ${CASES.length + PAIR_CASES.length} total`);
if (fail) {
    console.log('\nFailures:');
    for (const f of failures)
        console.log(`  - ${f.label}\n      reason: ${f.why}\n      matched school: ${f.schoolName || '(none)'}`);
    process.exit(1);
}
console.log('All relevance cases pass.');
