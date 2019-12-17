///<reference path="../docs/definitions.d.ts"/>
// Optimal Round Trip Time with Sonar Availability
// Main configuration
const configuration = {
    /** List of  providers configuration*/
    providers: [
        {
            name: ('jsdelivr-cdn' as TCDNProvider), // CDN Provider alias to work with
            monitorId: (301 as TMonitor), // The ID of the Monitor that is created by user to monitor hostname
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
    availabilityThreshold: 90 // The Board value for providers to compare with
};
/**
 * Returns index of highest number in array
 */
const getHighest = (array: number[]): number => array.indexOf(Math.max(...array));
/**
 * Picks item which highest value in property
 */
const getHighestByProperty = <T>(array: T[], property):T => array[getHighest(array.map(item => item[property]))];
/**
 * Returns index of lowest number in array
 */
const getLowest = (array: number[]): number => array.indexOf(Math.min(...array));
/**
 * Picks item which lowest value in property
 */
const getLowestByProperty = <T>(array: T[], property):T => array[getLowest(array.map(item => item[property]))];

function onRequest(req: IRequest, res: IResponse) {
    const { providers, defaultTtl, availabilityThreshold } = configuration;
    // Filter providers by monitor - check if the monitor is 'UP'
    const monitorFilteredProviders = providers.filter(
        (provider) => isMonitorOnline(provider.monitorId)
    );
    // If all monitors states are 'DOWN', choose random provider.
    if (monitorFilteredProviders.length === 0) {
        res.setAddr(providers[Math.floor(Math.random() * providers.length)].cname);
        res.setTTL(defaultTtl);
        return;
    }
    // Filter the previously obtained result. Choose providers that have 'UPTIME' value more that threshold.
    const availableFilteredProviders = monitorFilteredProviders.filter(
        (provider) => fetchCdnRumUptime(provider.name) > availabilityThreshold
    );
    // If the filtered results list is not empty
    if (availableFilteredProviders.length) {
        // Create array map with the performance data for each provider we have in the results list
        const perfProvidersData = availableFilteredProviders.map(
            (provider) => ({
                provider,
                perf: fetchCdnRumPerformance(provider.name)
            })
        );
        // Set the response TTL to the defaultTtl, select the provider with the best (lowest) performance value
        // and set the response Address to the cname associated with that provider
        res.setAddr(getLowestByProperty(perfProvidersData, 'perf').provider.cname);
        res.setTTL(defaultTtl);
        return;
    }

    // Fallback. Create the map with the availability (uptime data) for each provider from the original list
    const uptimeProvidersData = providers.map(
        (provider) => ({
            provider,
            uptime: fetchCdnRumUptime(provider.name)
        })
    );
    // Set the response TTL to the defaultTtl and the response Address to the cname
    // associated with the provider with the best uptime
    res.setAddr(getHighestByProperty(uptimeProvidersData, 'uptime').provider.cname);
    res.setTTL(defaultTtl);
    return;
}
