type Configuration = {
    providers: {
        name: TCDNProvider;
        cname: string;
        padding: number;
        ttl?: number;
    }[],
    default_provider: TCDNProvider;
    default_ttl: number;
    availability_threshold: number;
}

const configuration: Configuration = {
    providers: [
        {
            name: 'jsdelivr-cdn',
            cname: 'www.foo.com',
            padding: 0,
            ttl: 20,
        },
        {
            name: 'akamai',
            cname: 'www.bar.com',
            padding: 10
        },
        {
            name: 'cloudflare',
            cname: 'www.baz.com',
            padding: 0
        }
    ],
    // Selected if a provider can't be determined
    default_provider: 'jsdelivr-cdn',

    // The TTL to be set when the application chooses a geo provider.
    default_ttl: 30,

    // The TTL to be set when the application chooses the default provider.
    availability_threshold: 97,
};

async function onRequest(req: IRequest, res: IResponse) {
    // Get availability
    const providersAvailability = configuration.providers.map((provider) => {
        return { provider, availability: fetchCdnRumUptime(provider.name) }
    });

    // Filter by availability threshold
    const availableProviders = providersAvailability.filter(data => data.availability > configuration.availability_threshold);

    // Get performance data with paddings for available
    const providersPerformance = availableProviders.map(data => ({
        provider: data.provider,
        performance: fetchCdnRumPerformance(data.provider.name) + data.provider.padding
    }));

    let decision: any = null;
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
