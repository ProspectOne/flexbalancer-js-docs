///<reference path="../docs/definitions.d.ts"/>
// Geographic Round Robin with Sonar Availability
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
            name: 'baz',
            cname: 'www.baz.com'
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
 * Pick random item from array of items
 */
const getRandomElement = <T>(items: T[]): T => {
    return items[Math.floor(Math.random() * items.length)];
};

/**
 * If monitor is set for candidate returns its availability, else returns true if monitor is not required
 */
const isProperCandidate = (candidate, requireMonitorData) => {
    if (candidate.monitor) {
        return isMonitorOnline(candidate.monitor)
    }
    return !requireMonitorData;
};

function onRequest(req: IRequest, res: IResponse) {
    const {countriesAnswersRoundRobin, providers, defaultTtl, requireMonitorData} = configuration;

    // Country where request was made from
    let requestCountry = req.location.country as TCountry;

    // Checking did we managed to detect country, does our country listed in countriesAnswersRoundRobin list
    if (requestCountry && countriesAnswersRoundRobin[requestCountry]) {
        // Choose candidates that are listed in countriesAnswersRoundRobin and are proper candidates
        let geoFilteredCandidates = providers.filter(
            (provider) => countriesAnswersRoundRobin[requestCountry].includes(provider.name)
                && isProperCandidate(provider, requireMonitorData)
        );
        // If we found proper geo candidates, return one of them by random
        if (geoFilteredCandidates.length) {
            res.setAddr(getRandomElement(geoFilteredCandidates).cname);
            res.setTTL(defaultTtl);
            return;
        }
    }

    //If there was no geo candidates, we choose new ones from whole list by monitor filter
    const properCandidates = providers.filter(item => isProperCandidate(item, requireMonitorData));

    //Choose random candidate as response if we have any
    if (properCandidates.length) {
        res.setAddr(getRandomElement(properCandidates).cname);
        res.setTTL(defaultTtl);
        return;
    }
    // Fallback pick 'origin' cname
    res.setAddr('www.origin.com');
    res.setTTL(defaultTtl);
    return;
}
