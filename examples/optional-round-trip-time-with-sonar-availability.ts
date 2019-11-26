// weighted-round-robin
interface Settings {
    providers:{[key: string]:{cname: string, monitorId: number}},
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
        'https://www.jsdelivr.com/': {
            monitorId: 301,
            cname: 'www.foo.com'
        },
        'https://www.cloudflare.com': {
            monitorId: 302,
            cname: 'www.bar.com'
        },
        'https://cloud.google.com/cdn/': {
            monitorId: 303,
            cname: 'www.baz.com'
        }
    },

    // The DNS TTL to be applied to DNS responses in seconds.
    default_ttl: 20,
    availability_threshold: 90
}

const allReasons = {
    best_performing_provider: 'A',
    data_problem: 'B',
    all_providers_eliminated: 'C'
};

const dataAvail = getProbe('avail')
const dataSonar = parseSonarData(getData('sonar'));

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
    if(property === 'http_rtt') {
        data.forEach(value => {
            if(!result[value]) result[value] = {};
            result[value].property = fetchCdnRumPerformance(value as CDNProvider);
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
 * @param candidate
 * @param key
 * @returns {boolean}
 */
function filterAvailability(candidate, key) {
    return dataAvail[key] !== undefined && dataAvail[key].avail >= settings.availability_threshold;
}

/**
 * @param {!Object} data
 */
function parseSonarData(data) {
    var keys = Object.keys(data),
        i = keys.length,
        key;
    while (i --) {
        key = keys[i];
        try {
            data[key] = JSON.parse(data[key]);
        }
        catch (e) {
            delete data[key];
        }
    }
    return data;
}

/**
 * @param {!Object} source
 * @param {string} property
 */
function getLowest(source, property) {
    var keys = Object.keys(source),
        i = keys.length,
        key,
        candidate,
        min = Infinity,
        value;
    while (i --) {
        key = keys[i];
        value = source[key][property];
        if (value < min) {
            candidate = key;
            min = value;
        }
    }
    return candidate;
}

/**
 * @param candidate
 * @param key
 */
function filterSonar(candidate, key) {
    return dataSonar[key] !== undefined && dataSonar[key].avail > 0;
}

function getData(property) {
    let data = {};
    const providers = Object.keys(settings.providers);
    if (property === 'sonar') {
        providers.forEach(value => {
            if(!data[value]) data[value] = {};
            data[value] = JSON.stringify({
                'avail': isMonitorOnline(settings.providers[value].monitorId as Monitor) ? 1: 0
            })
        })
    }
    return data;
}

async function onRequest(req: Request, res: Response) {
    let candidates, decisionProvider, decisionReason, totalWeight
    candidates = getProbe('http_rtt')
    //@TODO dataAvail -> uptime data
    if (Object.keys(candidates).length > 0) {
        // Select the best performing provider that meets its minimum
        // availability score, if given
        if (Object.keys(dataSonar).length > 0) {
            // remove any sonar unavailable
            candidates = filterObject(candidates, filterSonar);
        }
        if (Object.keys(candidates).length > 0 && Object.keys(dataAvail).length > 0) {
            candidates = filterObject(candidates, filterAvailability);
            if (Object.keys(candidates).length > 0) {
                decisionProvider = getLowest(candidates,'http_rtt');
                decisionReason = allReasons.best_performing_provider;
            } else {
                decisionProvider = getHighest(dataAvail, 'avail');
                decisionReason = allReasons.all_providers_eliminated;
            }
        }
    }
    if (decisionProvider === undefined) {
        decisionProvider = aliases[Math.floor(Math.random() * aliases.length)];
        decisionReason = allReasons.data_problem;
    }
    // response.setReasonCode(decisionReason);
    res.addr = [settings.providers[decisionProvider].cname];
    res.ttl = settings.default_ttl
    return res
}
