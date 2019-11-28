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
            padding: 10
        },
        {
            name: 'cloudflare' as TCDNProvider,
            cname: 'www.baz.com',
            padding: 0
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

async function onRequest(req: IRequest, res: IResponse) {
    const {availabilityThreshold, defaultProvider, providers, defaultTtl} = configuration;
    let decision;

    // Filter by availability threshold
    const availableProviders = providers.filter(provider => fetchCdnRumUptime(provider.name) > availabilityThreshold);

    // Get performance and apply paddings for available providers
    const providersPerformance = availableProviders.map(
        (provider) => ({
            provider,
            performance: fetchCdnRumPerformance(provider.name) + provider.padding
        })
    );

    // If we have a providers to choose from - choose one with the best performance
    if (providersPerformance.length) {
        decision = getLowestByProperty(providersPerformance, 'performance').provider;
        return {
            addr: decision.cname,
            ttl: decision.ttl ? decision.ttl : defaultTtl
        };
    }

    // No available providers - return default
    decision = providers.find(provider => provider.name === defaultProvider);

    // Prepare response
    return {
        addr: decision.cname,
        ttl: decision.ttl ? decision.ttl : defaultTtl
    }
}
