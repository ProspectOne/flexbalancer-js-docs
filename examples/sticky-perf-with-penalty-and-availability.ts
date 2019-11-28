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
    default_provider: 'jsdelivr-cdn',

    // The TTL to be set when the application chooses a provider.
    default_ttl: 30,

    // Minimum threshold under which provider will be considered unavailable
    availability_threshold: 97,
};

async function onRequest(req: IRequest, res: IResponse) {
    // Get availability for each provider
    const providersAvailability = configuration.providers.map((provider) => {
        return { provider, availability: fetchCdnRumUptime(provider.name) }
    });

    // Filter by availability threshold
    const availableProviders = providersAvailability.filter(data => data.availability > configuration.availability_threshold);

    // Get performance and apply paddings for available providers
    const providersPerformance = availableProviders.map(data => ({
        provider: data.provider,
        performance: fetchCdnRumPerformance(data.provider.name) + data.provider.padding
    }));

    // Start decision process
    let decision: any = null;

    // If we have a providers to choose from - choose one with the best performance
    if (providersPerformance.length) {
        decision = providersPerformance.sort((a, b) => a.performance - b.performance)[0].provider;
    }

    // No available providers - return default
    if (!decision) {
        decision = configuration.providers.find(provider => provider.name === configuration.default_provider)
    }

    // Prepare response
    res.addr = decision.cname;
    res.ttl = decision.ttl ? decision.ttl : configuration.default_ttl;

    return res;
}