// weighted-round-robin
interface Settings {
    providers:{[key:string]:{cname: string, weight: number}},
    default_ttl:number,
    availability_threshold: number
}
const settings:Settings = {
    // The array of all possible responses. The key, e.g. 'provider1', is the
    // label for the platform. The value, e.g. 'cname1.foo.com' is the CNAME
    // to hand back when that platform is selected.

    // Round Robin weight (these are relative to one another for purposes of
    // weighted random selection, but it may be useful to think of them as
    // percentages (i.e. they add up to 100).
    providers: {
        'jsdelivr-cdn': {
            cname: 'cname1.foo.com',
            weight: 50
        },
        'google-cloud-cdn': {
            cname: 'cname2.foo.com',
            weight: 30
        },
        'cloudflare': {
            cname: 'cname3.foo.com',
            weight: 20
        }
    },

    // The DNS TTL to be applied to DNS responses in seconds.
    default_ttl: 20,
    availability_threshold: 90
}

const allReasons = {
    routed_randomly_by_weight: 'A',
    only_one_provider_avail: 'B',
    most_available_platform_chosen: 'C',
    none_available: 'D',
    data_problem: 'E'
}

const dataAvail = getProbe('avail')

var aliases = settings.providers === undefined ? [] : Object.keys(settings.providers);


function getProbe(property:string) {
    let result = {};
    const data = Object.keys(settings.providers);
    if(property === 'avail') {
        data.forEach(value => {
            if(!result[value]) result[value] = {};
            result[value].property = fetchCdnRumUptime(value as CDNProvider);
        });
    }
    return result;
}
/**
 * @param {!Object} object
 * @param {Function} filter
 */
function filterObject(object, filter) {
    var keys = Object.keys(object),
        i = keys.length,
        key,
        candidates = {};

    while (i --) {
        key = keys[i];

        if (filter(object[key], key)) {
            candidates[key] = object[key];
        }
    }

    return candidates;
}

/**
 * @param {!Object} source
 * @param {string} property
 */
function getHighest(source, property) {
    var keys = Object.keys(source),
        i = keys.length,
        key,
        candidate,
        max = -Infinity,
        value;
    while (i --) {
        key = keys[i];
        value = source[key][property];
        if (value > max) {
            candidate = key;
            max = value;
        }
    }
    return candidate;
}

/**
 * @param candidates
 * @param max
 */
function getWeightedRandom(candidates, max) {
    var random = Math.floor(Math.random() * max),
        mark = 0,
        keys = Object.keys(candidates),
        i = keys.length,
        key, weight;

    while (i --) {
        key = keys[i];
        weight  = settings.providers[key].weight;

        if (weight !== undefined) {
            mark += weight;
            if (random < mark) {
                return key;
            }
        }
    }
}

/**
 * @param candidate
 * @param key
 * @returns {boolean}
 */
function filterAvailability(candidate, key) {
    return dataAvail[key] !== undefined && dataAvail[key].avail >= settings.availability_threshold;
}

/**
 * @param candidates
 */
function getTotalWeight(candidates) {
    var keys = Object.keys(candidates),
        i = keys.length,
        key,
        total = 0,
        weight;

    while (i --) {
        key = keys[i];
        weight = settings.providers[key].weight;

        if (weight !== undefined) {
            total += weight;
        }
    }

    return total;
}

async function onRequest(req: Request, res: Response) {
    let candidates, decisionProvider, decisionReason, totalWeight
    //@TODO dataAvail -> uptime data
    let candidatesAliases = Object.keys(settings.providers);
    if (candidatesAliases.length > 0 && Object.keys(dataAvail).length > 0) {
        //filter the candidates by availability
        candidates = filterObject(settings.providers, filterAvailability);
        candidatesAliases = Object.keys(candidates);
        if (candidatesAliases.length > 0) {
            if (candidatesAliases.length === 1) {
                decisionProvider = candidatesAliases[0];
                decisionReason = allReasons.only_one_provider_avail;
            } else {
                // Respond with a weighted random selection
                totalWeight = getTotalWeight(candidates);
                if (totalWeight > 0) {
                    decisionProvider = getWeightedRandom(candidates, totalWeight);
                    decisionReason = allReasons.routed_randomly_by_weight;
                } else { // Respond with most available candidate
                    decisionProvider = getHighest(dataAvail, 'avail');
                    decisionReason = allReasons.most_available_platform_chosen;
                }
            }
        } else{
            decisionProvider = getHighest(dataAvail, 'avail');
            decisionReason = allReasons.none_available;
        }
    }
    if (decisionProvider === undefined) {
        // If we get here, something went wrong. Select randomly to avoid fallback.
        decisionProvider = aliases[Math.floor(Math.random() * aliases.length)];
        decisionReason = allReasons.data_problem;
    }

    res.addr = [settings.providers[decisionProvider].cname]
    res.ttl = settings.default_ttl
    // response.setReasonCode(decisionReason);
    return res
}
