// Resolve a school name — either our canonical name or the way an opponent
// feed spells it — to its logo slug, or null if it is not a UCIAC school.
// Used by split-schedule.js to tag each game with the crest(s) to show.

const path = require('path');
const schools = require(path.join(__dirname, '..', 'data', 'schools.json'));
const LIST = Array.isArray(schools) ? schools : (schools.schools || schools);

function norm(s) {
    return String(s || '').toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/\bsaint\b/g, 'st')
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\b(high|school|schools|regional|senior|hs|the)\b/g, ' ')
        .replace(/\s+/g, ' ').trim();
}

// canonical name -> slug
const BY_KEY = new Map();
for (const s of LIST) BY_KEY.set(norm(s.name), s.slug);

// DS opponent spellings that differ from canonical normalisation
const ALIASES = {
    'roselle':                   'roselle',
    'abraham clark':             'roselle',
    'arthur l johnson':          'arthur-l-johnson',
    'arthur johnson':            'arthur-l-johnson',
    'oratory':                   'oratory-prep',
    'oratory catholic prep':     'oratory-prep',
    'oratory prep':              'oratory-prep',
    'spf':                       'scotch-plains-fanwood',
    'scotch plains fanwood':     'scotch-plains-fanwood',
    'gov livingston':            'governor-livingston',
    'kent place':                'kent-place',
    'oak knoll':                 'oak-knoll',
    'new providence':            'new-providence',
    'roselle catholic':          'roselle-catholic',
    'roselle park':              'roselle-park',
    'union catholic':            'union-catholic',
    'union catholic regional':   'union-catholic',
    'david brearley':            'david-brearley',
    'brearley':                  'david-brearley',
    'jonathan dayton':           'jonathan-dayton',
    'dayton':                    'jonathan-dayton',
};

function logoSlug(name) {
    const k = norm(name);
    if (!k) return null;
    if (BY_KEY.has(k)) return BY_KEY.get(k);
    if (ALIASES[k]) return ALIASES[k];
    return null;
}

module.exports = { logoSlug, norm };
