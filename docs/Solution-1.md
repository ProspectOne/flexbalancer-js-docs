## Solution 1: The Optimal Round Trip Time with The Monitor Availability. <a name="case1"></a>

The Case: we have the bunch of answers, that are inspected by our previously created [Monitors](https://panel.perfops.net). 
We need to get answer that has:
* Corresponding Monitor online, 
* CDN provider availability for the last hour higher than 90%
* The best CDN provider performance for the last hour. 

In case of all monitors are down it should simply return a random answer. And if all CDN uptimes are 'poor' it should fall back with the answer that has the highest provider uptime (we will use our [fetchCDN-functions](Custom-Answers-API#fetchcdnrumuptime)). 

Let's create our `configuration` object:
```typescript
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
```
We took our Monitors IDs `monitorId: (302 as TMonitor),` from the [PerfOps Panel Monitors Page](https://panel.perfops.net/monitors) and defined the availability threshold to 90 (percent).

Now, let's fill in our `functions` block with the set of functions that determine highest and lowest values for arrays and properties. Notice: that functions are pretty useful and can be added to other scripts if you use the `configuration` approach described above.
```typescript
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
```
Let's parse the configuration and get all providers that have monitors online, we will use our `isMonitorOnline` function (more info at [Custom Answers API](Custom-Answers-API#ismonitoronline)):
```typescript
    const { providers, defaultTtl, availabilityThreshold } = configuration;
    // Filter providers by monitor - check if the monitor is 'UP'
    const monitorFilteredProviders = providers.filter(
        (provider) => isMonitorOnline(provider.monitorId)
    );
```
Well... bad thing happened and all our monitors are down. We can't determine the best availabilities so let's simply return a random answer from our list:
```typescript
    // If all monitors states are 'DOWN', choose random provider.
    if (monitorFilteredProviders.length === 0) {
        res.setAddr(providers[Math.floor(Math.random() * providers.length)].cname);
        res.setTTL(defaultTtl);
        return;
    }
```
If everything is fine and we have providers with working monitors - let's keep only those CDN providers that have availability more than 90 percent for the last hour:
```typescript
    // Filter the previously obtained result. Choose providers that have 'UPTIME' value more that threshold.
    const availableFilteredProviders = monitorFilteredProviders.filter(
        (provider) => fetchCdnRumUptime(provider.name) > availabilityThreshold
    );
```
Everything is perfect, we have the list of CDN providers with good uptime, let's analyze their performance data and return the one with the lowest performance value for the last hour as the answer. Remember - [the lower 'performance' value - the better](https://www.cdnperf.com/) - it represents value based on response time, so yes- we need the lowest one.
```typescript
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
```
In case we have the CDN availability lower than our threshold - we simply return the answer with the best provider uptime as `fallback`:
```typescript
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
```
That's it!
**Here is our final script code:**
```typescript
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
```