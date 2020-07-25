///<reference path="../docs/definitions.d.ts"/>
// Main configuration object
const configuration = {
    /** List of  providers configuration */
    providers: [
        {
            name: ('belugacdn' as TCDNProvider), // CDN Provider alias to work with
            cname: 'www.foo.com', // cname to pick as a result
            padding: 0, //  additional bonus or penalty
            countries: (['UA'] as TCountry[])
        },
        {
            name: ('ovh-cdn' as TCDNProvider),
            cname: 'www.bar.com',
            padding: 0,
            continents: (['NA', 'EU'] as TContinent[])
        },
        {
            name: ('cloudflare' as TCDNProvider),
            cname: 'www.baz.com',
            padding: 0,
            asns: [123, 321]
        },
        {
            name: ('fastly'  as TCDNProvider),
            cname: 'www.qux.com',
            padding: 0,
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
 * Pick single item with property equal to value
 */
const findByProperty = <T>(items: T[], property, value) => items.find(item => item[property] == value );

/**
 * Pick index of lowest number in array of numbers
 */
const getLowest = (array: number[]): number => array.indexOf(Math.min(...array));

/**
 * Pick item with lowest value in property from array of items
 */
const getLowestByProperty = <T>(array: T[], property):T => array[getLowest(array.map(item => item[property]))];

/**
 * Return response if proper candidate found for Country or Continent rule else returns null
 */
const getGeoResponse = (location) => {
    let candidate;
    const {providers, countryToProvider, continentToProvider, defaultTtl} = configuration;

    candidate = findByProperty(providers, 'name', countryToProvider[location.country]);
    if (candidate) {
        return {
            addr: candidate.cname,
            ttl: defaultTtl
        };
    }

    //if override for country not found we will try to look for continent override
    candidate = findByProperty(providers, 'name', continentToProvider[location.continent]);
    if (candidate) {
        return {
            addr: candidate.cname,
            ttl: defaultTtl
        };
    }
    return null;
};

function onRequest(request: IRequest, response: IResponse) {
    let location = request.location, candidate, res;
    const {providers, geoDefault, geoOverride, asnOverride, asnToProvider, availabilityThreshold, defaultTtl, defaultProvider, errorTtl} = configuration;

    //Check if geoOverride is enabled and return response of override if it matches its rules
    if (geoOverride) {
        let resGeo = getGeoResponse(location);
        if (resGeo) {
            response.setCNAMERecord(resGeo.addr);
            response.setTTL(resGeo.ttl);
            return;
        }
    }

    //Check if asn_override is enabled and return response of override if it matches its rules
    if (asnOverride && location.subnet.asn) {
        candidate = findByProperty(providers, 'name', asnToProvider[location.subnet.asn]);
        if (candidate) {
            response.setCNAMERecord(candidate.cname);
            response.setTTL(defaultTtl);
            return;
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
        const performanceMapData = candidates.map(
            (provider) => ({
                provider,
                cdnPerformance: (location.country ?
                    fetchCdnRumPerformance(provider.name, 'country', location.country) :
                    fetchCdnRumPerformance(provider.name)) * (1 + provider.padding / 100)
            })
        );
        response.setCNAMERecord(getLowestByProperty(performanceMapData, 'cdnPerformance').provider.cname);
        response.setTTL(defaultTtl);
        return;
    }

    //Even if geoOverride disabled but we didnt found proper answer till that time, if geoDefault is enabled
    //we will try to find answer with geoOverrides
    if (geoDefault) {
        let res = getGeoResponse(location);
        if (res) {
            response.setCNAMERecord(res.addr);
            response.setTTL(res.ttl);
            return;
        }
    }

    //return default
    candidate = findByProperty(providers, 'name', defaultProvider);
    if (candidate){
        response.setCNAMERecord(candidate);
        response.setTTL(defaultTtl);
        return;
    }
    // Default Candidate also not found. Looks like configuration error
    response.setTTL(errorTtl);
    return;
}
