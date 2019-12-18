///<reference path="../docs/definitions.d.ts"/>
// Geographic Round Robin with Sonar Availability
const configuration = {
    providers: [
        {
            name: 'foo', // candidate name
            cname: 'www.foo.com', // cname to pick as a result for the response Addr
            monitor: (304 as TMonitor) // Monitor ID that is created by user to monitor hostname
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
    countriesAnswersSets: {
        'PL': ['bar', 'baz'],
        'JP': ['foo']
    },
    defaultTtl: 20,
    requireMonitorData: false // in this case answer monitor being online is not required
};

/**
 * Picks random item from array of items
 */
const getRandomElement = <T>(items: T[]): T => {
    return items[Math.floor(Math.random() * items.length)];
};

/**
 * If monitor is set for candidate - returns its availability, else returns true if monitor is not required
 */
const isProperCandidate = (candidate, requireMonitorData) => {
    if (candidate.monitor) {
        return isMonitorOnline(candidate.monitor)
    }
    return !requireMonitorData;
};

function onRequest(req: IRequest, res: IResponse) {
    const {countriesAnswersSets, providers, defaultTtl, requireMonitorData} = configuration;

    // Country where request was made from
    let requestCountry = req.location.country as TCountry;

    // Checking if we were able to detect country, and if our country is listed in countriesAnswersSets list
    if (requestCountry && countriesAnswersSets[requestCountry]) {
        // Choose candidates that are listed in countriesAnswersSets and are proper candidates
        let geoFilteredCandidates = providers.filter(
            (provider) => countriesAnswersSets[requestCountry].includes(provider.name)
                && isProperCandidate(provider, requireMonitorData)
        );
        // If we found proper geo candidates, pick one of them randomly and use cname for the answer
        if (geoFilteredCandidates.length) {
            res.setAddr(getRandomElement(geoFilteredCandidates).cname);
            res.setTTL(defaultTtl);
            return;
        }
    }

    //If there was no geo candidates, we choose new ones from whole list by monitor filter
    const properCandidates = providers.filter(item => isProperCandidate(item, requireMonitorData));

    //Choose random candidate cname as response Addr (if we have any)
    if (properCandidates.length) {
        res.setAddr(getRandomElement(properCandidates).cname);
        res.setTTL(defaultTtl);
        return;
    }
    // If not - set fallback
    res.setAddr('our.fallback.com');
    res.setTTL(defaultTtl);
    return;
}
