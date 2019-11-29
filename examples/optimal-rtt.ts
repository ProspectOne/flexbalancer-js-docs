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
    availability_threshold: 90,

    // Set to `true` to enable the geo override feature
    geo_override: false,
    // A mapping of continent codes to CDN provider name { 'AF': 'belugacdn', 'AS': 'ovh-cdn' }
    continent_to_provider: {},
    // A mapping of ISO 3166-1 country codes to CND provider name { 'DZ': 'belugacdn', 'AO': 'ovh-cdn' }
    country_to_provider: {},
    // Set to `true` to enable the geo default feature
    geo_default: false,

    // Set to `true` to enable the asn override feature
    asn_override: false,
    // A mapping of ASN codes to provider aliases:  asn_to_provider: { 123: 'belugacdn', 124: 'ovh-cdn' }
    asn_to_provider: {},

    // Selected if an optimal provider can't be determined
    default_provider: ('fastly' as TCDNProvider),
    // The TTL to be set when the application chooses an optimal provider, including geo override.
    default_ttl: 20,
    // The TTL to be set when the application chooses a potentially non-optimal provider, e.g. default or geo default.
    error_ttl: 20
};

const findProviderByName = (name: TCDNProvider) => {
    return configuration.providers.find( item => item.name == name );
};

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
 * set answer as response for provided override rule and return status of this operation
 * @param override
 * @param subject
 * @param response
 */
const setOverrideResponse = (override: object, subject: any, response: IResponse): boolean => {
    if (override[subject]) {
        let candidate = findProviderByName(override[subject]);
        if (candidate) {
            response.addr = candidate.cname;
            response.ttl = response.ttl || configuration.default_ttl;
            return true;
        } else {
            response.ttl = response.ttl || configuration.error_ttl;
            return  false;
        }
    }
    return  false;
};

async function onRequest(request: IRequest, response: IResponse) {
    let location = request.location;

    //Check if geo_override is enabled and return response of override if it matches its rules
    if (configuration.geo_override) {
        if (setOverrideResponse(
            configuration.country_to_provider,
            location.country,
            response)) return response;

        //if override for country not found we will try to look for continent override
        if (setOverrideResponse(
            configuration.continent_to_provider,
            location.continent,
            response
        )) return response;
    }

    //Check if asn_override is enabled and return response of override if it matches its rules
    if (configuration.asn_override) {
        if (setOverrideResponse(
            configuration.asn_to_provider,
            location.subnet.asn,
            response
        )) return response;
    }

    //If no overrides enabled or none of they'rs rules passed we will check answers with they'r strict rules
    let candidates = configuration.providers.filter((item) => {
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

        if ((location.country &&
            fetchCdnRumUptime(item.name, 'country', location.country)
            || fetchCdnRumUptime(item.name)) < configuration.availability_threshold) {
            return false;
        }

        return true;
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

        let resultCandidate = getLowestByProperty(candidates, 'cdnPerformance');

        response.addr = resultCandidate.cname;
        response.ttl = response.ttl | configuration.default_ttl;

        return  response;
    }

    //Even if geo_override disabled but we didnt found proper answer till that time, if geo_default is enabled
    //we will try to find answer with geo_overrides
    if (configuration.geo_default) {
        if (setOverrideResponse(
            configuration.country_to_provider,
            location.country,
            response)) return response;

        if (setOverrideResponse(
            configuration.continent_to_provider,
            location.continent,
            response
        )) return response;
    }

    //return default
    let defaultResponse = findProviderByName(configuration.default_provider);
    if (defaultResponse){
        response.addr = defaultResponse.cname;
        response.ttl = response.ttl | configuration.default_ttl;
    }

    return  response;
}
