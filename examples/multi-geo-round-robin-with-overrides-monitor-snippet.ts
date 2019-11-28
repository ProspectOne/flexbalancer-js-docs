const configuration = {
    providers: [
        {
            name: 'foo', // candidate name
            cname: 'www.foo.com', // cname to pick as a result
            monitor: (304 as TMonitor) // Monitor ID which is created by user to monitor hostname
        },
        {
            name: 'bar',
            cname: 'www.bar.com',
            monitor: (305 as TMonitor)
        },
        {
            name: 'third',
            cname: 'www.baz.com'
        },
        {
            name: 'origin',
            cname: 'www.origin.com'
        }
    ],
    countriesAnswersRoundRobin: {
        'PL': ['bar', 'baz'],
        'JP': ['foo']
    },
    defaultTtl: 20,
    requireMonitorData: false
};

/**
 * Function return random object element from array
 * @param items
 */
const getRandomElement = <T>(items: T[]): T => {
    return items[Math.floor(Math.random() * items.length)];
};

/**
 * If monitor is set for candidate returns its availability, else returns true if monitor is not required
 * @param candidate
 * @param requireMonitorData
 */
const isProperCandidate = (candidate, requireMonitorData) => {
    if (candidate.monitor) {
        return isMonitorOnline(candidate.monitor)
    }
    return !requireMonitorData;
};

async function onRequest(req: IRequest, res: IResponse) {
    const {countriesAnswersRoundRobin, providers, defaultTtl, requireMonitorData} = configuration;

    // Country where request was made from
    let requestCountry = req.location.country;

    // Checking did we managed to detect country, does our country listed in countriesAnswersRoundRobin list
    if (requestCountry && countriesAnswersRoundRobin[requestCountry]) {
        // Choose candidates that are listed in countriesAnswersRoundRobin and are proper candidates
        let geoFilteredCandidates = providers.filter(
            (provider) => countriesAnswersRoundRobin[requestCountry].includes(provider.name) && isProperCandidate(provider, requireMonitorData)
        );
        // If we found proper geo candidates, return one of them by random
        if (geoFilteredCandidates.length) {
            return {
                addr: getRandomElement(geoFilteredCandidates).cname,
                ttl: defaultTtl
            }
        }
    }

    //If there was no geo candidates, we choose new ones from whole list by monitor filter
    const properCandidates = providers.filter(item => isProperCandidate(item, requireMonitorData));

    //Choose random candidate as response if we have any
    if (properCandidates.length) {
        return {
            addr: getRandomElement(properCandidates).cname,
            ttl: defaultTtl
        }
    }
    // Fallback pick 'origin' cname
    return {
        addr: providers['origin'].cname,
        ttl: defaultTtl
    };
}
