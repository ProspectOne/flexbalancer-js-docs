//Configuration params with list of answers
const configuration = {
    providers: [
        {
            name: ('belugacdn' as TCDNProvider),
            cname: 'www.foo.com',
            padding: 0,
            cdnPerformance: 0,
            countries: (['UA'] as TCountry[])
        },
        {
            name: ('ovh-cdn' as TCDNProvider),
            cname: 'www.bar.com',
            padding: 0,
            cdnPerformance: 0,
            continents: (['NA', 'EU'] as TContinent[])
        },
        {
            name: ('cloudflare' as TCDNProvider),
            cname: 'www.baz.com',
            padding: 0,
            cdnPerformance: 0,
            asns: [123, 321]
        },
        {
            name: ('fastly'  as TCDNProvider),
            cname: 'www.qux.com',
            padding: 0,
            cdnPerformance: 0,
            except_countries: (['CN'] as TCountry[])
        }
    ],
    // The minimum availability score that providers must have in order to be considered available
    availabilityThreshold: 90,

    // Set to `true` to enable the geo override feature
    geoOverride: false,
    // A mapping of continent codes to CDN provider name { 'AF': 'belugacdn', 'AS': 'ovh-cdn' }
    continentToProvider: {},
    // A mapping of ISO 3166-1 country codes to CND provider name { 'DZ': 'belugacdn', 'AO': 'ovh-cdn' }
    countryToProvider: {},
    // Set to `true` to enable the geo default feature
    geoDefault: false,
    // Set to `true` to enable the asn override feature
    asnOverride: false,
    // A mapping of ASN codes to provider aliases:  asnToProvider: { 123: 'belugacdn', 124: 'ovh-cdn' }
    asnToProvider: {},
    // Selected if an optimal provider can't be determined
    defaultProvider: ('fastly' as TCDNProvider),
    // The TTL to be set when the application chooses an optimal provider, including geo override.
    defaultTtl: 20,
    // The TTL to be set when the application chooses a potentially non-optimal provider, e.g. default or geo default.
    errorTtl: 20
};
/**
 *
 * @param items
 * @param property
 * @param name
 */
const findByProperty = <T>(items: T[], property, name) => items.find(item => item[property] == name );

/**
 * returns index of Lowest value in array
 * @param array
 */
const getLowest = (array: number[]): number => array.indexOf(Math.min(...array));

/**
 * returns object which have lowest value in property
 * @param array
 * @param property
 */
const getLowestByProperty = <T>(array: T[], property):T => array[getLowest(array.map(item => item[property]))];

/**
 * Return response if proper candidate found for Country or Continent rule
 * @param location
 * @param res
 */
const getGeoResponse = (location, res: IResponse):IResponse | null => {
    let candidate;
    const {providers, countryToProvider, continentToProvider, defaultTtl, errorTtl} = configuration;

    candidate = findByProperty(providers, 'name', countryToProvider[location.country]);
    if (candidate) {
        return {
            addr: candidate.cname,
            ttl: res.ttl || defaultTtl
        };
    }

    //if override for country not found we will try to look for continent override
    candidate = findByProperty(providers, 'name', continentToProvider[location.continent]);
    if (candidate) {
        return {
            addr: candidate.cname,
            ttl: res.ttl || defaultTtl
        };
    }
    return null;
};

async function onRequest(request: IRequest, response: IResponse) {
    let location = request.location, candidate, res;
    const {providers, geoDefault, geoOverride, asnOverride, asnToProvider, availabilityThreshold, defaultTtl, defaultProvider, errorTtl} = configuration;

    //Check if geoOverride is enabled and return response of override if it matches its rules
    if (geoOverride) {
        res = getGeoResponse(location, response);
        if (res) return res;
    }

    //Check if asn_override is enabled and return response of override if it matches its rules
    if (asnOverride && location.subnet.asn) {
        candidate = findByProperty(providers, 'name', asnToProvider[location.subnet.asn]);
        if (candidate) {
            return {
                addr: candidate.cname,
                ttl: response.ttl || defaultTtl
            };
        }
    }

    //If no overrides enabled or none of they'rs rules passed we will check answers with they'r strict rules
    let candidates = providers.filter((item) => {
        if (item.except_countries &&
            location.country &&
            item.except_countries.indexOf(location.country) !== -1) {
            return false;
        }

        if (item.countries &&
            location.country &&
            item.countries.indexOf(location.country) === -1) {
            return false
        }

        if (item.continents &&
            location.continent &&
            item.continents.indexOf(location.continent) === -1) {
            return false;
        }

        if (item.asns &&
            location.subnet.asn &&
            item.asns.indexOf(location.subnet.asn) === -1) {
            return false;
        }

        return (location.country &&
            fetchCdnRumUptime(item.name, 'country', location.country) ||
            fetchCdnRumUptime(item.name)) >= availabilityThreshold;
    });

    //If we found proper candidates for answer, we store its CDN rum performance
    // and apply additional bonus or penalty and return lowest one
    if (candidates.length) {
        candidates.forEach((element, index) => {
            let cdnPerformance = (location.country ?
                fetchCdnRumPerformance(element.name, 'country', location.country) :
                fetchCdnRumPerformance(element.name));
            candidates[index].cdnPerformance = cdnPerformance * (1 + element.padding / 100);
        });

        return  {
            addr: getLowestByProperty(candidates, 'cdnPerformance').cname,
            ttl: response.ttl | defaultTtl
        };
    }

    //Even if geoOverride disabled but we didnt found proper answer till that time, if geoDefault is enabled
    //we will try to find answer with geoOverrides
    if (geoDefault) {
        res = getGeoResponse(location, response);
        if (res) return res;
    }

    //return default
    candidate = findByProperty(providers, 'name', defaultProvider);
    if (candidate){
        return {
            addr: candidate,
            ttl: response.ttl | defaultTtl
        };
    }
    // Default Candidate also not found. Looks like configuration error
    response.ttl = errorTtl;
    return  response
}
