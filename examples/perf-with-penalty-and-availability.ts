///<reference path="../docs/definitions.d.ts"/>
// Basic configuration object for our FlexBalancer application
const configuration = {
    // List of providers we are interested in
    // `name` must be one of the valid provider aliases from TCDNProvider type
    providers: [
        {
            name: 'jsdelivr-cdn' as TCDNProvider,
            cname: 'www.foo.com',
            padding: 0,
            ttl: 20, // We can provide different TTL for different providers
        },
        {
            name: 'akamai' as TCDNProvider,
            cname: 'www.bar.com',
            padding: 0,
        },
        {
            name: 'cloudflare' as TCDNProvider,
            cname: 'www.baz.com',
            padding: 5,
        }
    ],

    // Default provider which will be chosen if no suitable providers will be found.
    defaultProvider: 'jsdelivr-cdn',

    // The TTL to be set when the application chooses a provider.
    defaultTtl: 30,

    // Minimum threshold under which provider will be considered unavailable
    availabilityThreshold: 97,
};

/**
 * Returns index of lowest number in array
 */
const getLowest = (array: number[]): number => array.indexOf(Math.min(...array));
/**
 * Pick item with lowest value in property
 */
const getLowestByProperty = <T>(array: T[], property):T => array[getLowest(array.map(item => item[property]))];

function onRequest(req: IRequest, res: IResponse) {
    const {availabilityThreshold, defaultProvider, providers, defaultTtl} = configuration;
    let decision;

    // Filter by availability threshold
    const availableProviders = providers.filter(
        (provider) => (req.location.country ?
            fetchCdnRumUptime(provider.name, 'country', req.location.country) :
            fetchCdnRumUptime(provider.name)) > availabilityThreshold);

    // Get performance and apply paddings for available providers
    const providersPerformance = availableProviders.map(
        (provider) => ({
            provider,
            performance: req.location.country ?
                // Get performance for country if we know it
                fetchCdnRumPerformance(provider.name, 'country', req.location.country) + provider.padding :
                // Get global performance instead
                fetchCdnRumPerformance(provider.name) + provider.padding
        })
    );

    // If we have a providers to choose from - choose one with the best performance
    if (providersPerformance.length) {
        decision = getLowestByProperty(providersPerformance, 'performance').provider;
        res.setAddr(decision.cname);
        res.setTTL(decision.ttl ? decision.ttl : defaultTtl);
        return;
    }

    // No available providers - return default
    decision = providers.find(provider => provider.name === defaultProvider);

    // Prepare response
    res.setAddr(decision.cname);
    res.setTTL(decision.ttl ? decision.ttl : defaultTtl);
    return;
}
