// Optimal Round Trip Time with Sonar Availability
const configuration = {
    providers: [
        {
            name: ('jsdelivr-cdn' as TCDNProvider),
            monitorId: (301 as TMonitor),
            cname: 'www.foo.com'
        },
        {
            name: ('cloudflare' as TCDNProvider),
            monitorId: (302 as TMonitor),
            cname: 'www.bar.com'
        },
        {
            name: ('google-cloud-cdn' as TCDNProvider),
            monitorId: (303 as TMonitor),
            cname: 'www.baz.com'
        }
    ],

    // The DNS TTL to be applied to DNS responses in seconds.
    defaultTtl: 20,
    availabilityThreshold: 90
};

const getHighest = (array: number[]): number => array.indexOf(Math.max(...array));
const getHighestByProperty = <T>(array: T[], property):T => array[getHighest(array.map(item => item[property]))];
const getLowest = (array: number[]): number => array.indexOf(Math.min(...array));
const getLowestByProperty = <T>(array: T[], property):T => array[getLowest(array.map(item => item[property]))];

async function onRequest(req: Request, res: Response) {
    const { providers, defaultTtl, availabilityThreshold } = configuration;

    const monitorFilteredProviders = providers.filter(
        (provider) => isMonitorOnline(provider.monitorId)
    );
    // If all providers are down return random
    if (monitorFilteredProviders.length === 0) {
        return {
            addr: providers[Math.floor(Math.random() * providers.length)].cname,
            ttl: defaultTtl
        }
    }
    const availableFilteredProviders = monitorFilteredProviders.filter(
        (provider) => fetchCdnRumUptime(provider.name) > availabilityThreshold
    );
    // If available providers return with lowest performance
    if (availableFilteredProviders.length) {
        const perfProvidersData = availableFilteredProviders.map(
            (provider) => ({
                provider,
                perf: fetchCdnRumPerformance(provider.name)
            })
        );
        return {
            addr: getLowestByProperty(perfProvidersData, 'perf').provider.cname,
            ttl: defaultTtl
        }
    }

    // Fallback. Take highest performance from All providers
    const perfProvidersData = providers.map(
        (provider) => ({
            provider,
            perf: fetchCdnRumPerformance(provider.name)
        })
    );
    return {
        addr: getHighestByProperty(perfProvidersData, 'perf').provider.cname,
        ttl: defaultTtl
    }
}
