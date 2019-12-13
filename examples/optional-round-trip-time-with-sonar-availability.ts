///<reference path="../docs/definitions.d.ts"/>
// Optimal Round Trip Time with Sonar Availability
// Main configuration
const configuration = {
    /** List of  providers configuration*/
    providers: [
        {
            name: ('jsdelivr-cdn' as TCDNProvider), // CDN Provider alias to work with
            monitorId: (301 as TMonitor), // Monitor ID which is created by user to monitor hostname
            cname: 'www.foo.com' // cname to pick as a result
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
    defaultTtl: 20, // The DNS TTL to be applied to DNS responses in seconds.
    availabilityThreshold: 90 // Board value for providers to compare with
};
/**
 * Returns index of highest number in array
 */
const getHighest = (array: number[]): number => array.indexOf(Math.max(...array));
/**
 * Pick item which highest value in property
 */
const getHighestByProperty = <T>(array: T[], property):T => array[getHighest(array.map(item => item[property]))];
/**
 * Returns index of lowest number in array
 */
const getLowest = (array: number[]): number => array.indexOf(Math.min(...array));
/**
 * Pick item which lowest value in property
 */
const getLowestByProperty = <T>(array: T[], property):T => array[getLowest(array.map(item => item[property]))];

function onRequest(req: IRequest, res: IResponse) {
    const { providers, defaultTtl, availabilityThreshold } = configuration;
    // Filter providers by monitor, check it's state to be 'UP'
    const monitorFilteredProviders = providers.filter(
        (provider) => isMonitorOnline(provider.monitorId)
    );
    // If all monitors are 'DOWN' state, choose random provider.
    if (monitorFilteredProviders.length === 0) {
        res.setAddr(providers[Math.floor(Math.random() * providers.length)].cname);
        res.setTTL(defaultTtl);
        return;
    }
    // Filter from result. Choose providers that have 'UPTIME' value more that threshold.
    const availableFilteredProviders = monitorFilteredProviders.filter(
        (provider) => fetchCdnRumUptime(provider.name) > availabilityThreshold
    );
    // If list filter result is not empty
    if (availableFilteredProviders.length) {
        // Create array map with performance data for each providers left in result
        const perfProvidersData = availableFilteredProviders.map(
            (provider) => ({
                provider,
                perf: fetchCdnRumPerformance(provider.name)
            })
        );
        // Return as a result Object with defaultTtl and take providers from array with lowest performance value
        res.setAddr(getLowestByProperty(perfProvidersData, 'perf').provider.cname);
        res.setTTL(defaultTtl);
        return;
    }

    // Fallback. Create array map with performance data for each providers from original list
    const perfProvidersData = providers.map(
        (provider) => ({
            provider,
            perf: fetchCdnRumPerformance(provider.name)
        })
    );
    // Return as a result Object with defaultTtl and take providers from array with highest performance value
    res.setAddr(getHighestByProperty(perfProvidersData, 'perf').provider.cname);
    res.setTTL(defaultTtl);
    return;
}
