## Case 1.2: Availability based on Monitor Uptime. <a name="case1.2"></a>

The Case: A customer uses 2+ nodes, monitored by [PerfOps Monitoring Feature](https://panel.perfops.net/monitors). A user is directed to the node that has the best Monitor Uptime at a given point in time. If both Monitors are down returns random answer. 

Our configuration goes first:
```typescript
const configuration = {
    /** List of  providers configuration*/
    providers: [
        {
            monitorId: (301 as TMonitor), // The ID of the Monitor that is created by user to monitor hostname
            cname: 'www.foo.com' // cname to pick as a result
        },
        {
            monitorId: (302 as TMonitor),
            cname: 'www.bar.com'
        },
        {
            monitorId: (303 as TMonitor),
            cname: 'www.baz.com'
        }
    ],
    defaultTtl: 20, // The DNS TTL to be applied to DNS responses in seconds.
    availabilityThreshold: 90 // The Board value for providers to compare with
};
```
The monitor IDs (be sure you have created a monitors) can be found [at your Monitors List](https://panel.perfops.net/monitors).

Let's add some 'standard' functions to get the highest uptime value:
```typescript
/**
 * Returns index of highest number in array
 */
const getHighest = (array: number[]): number => array.indexOf(Math.max(...array));
/**
 * Picks item which highest value in property
 */
const getHighestByProperty = <T>(array: T[], property):T => array[getHighest(array.map(item => item[property]))];
```
Let's proceed to `onRequest`. We will use [fetchMonitorUptime](Custom-Answers-API#fetchmonitoruptime) and [isMonitorOnline](Custom-Answers-API#ismonitoronline) functions, provided by PerfOps that determine particular monitor availability and uptime value.
```typescript
function onRequest(req: IRequest, res: IResponse) {
    const { providers, defaultTtl, availabilityThreshold } = configuration;
    // Filter providers by monitor - check if the monitor is 'UP'
    ...
}
```
Get the answers list with Monitors online:
```typescript
    // Filter providers by monitor - check if the monitor is 'UP'
    const monitorFilteredProviders = providers.filter(
        (provider) => isMonitorOnline(provider.monitorId)
    );
```
If all Monitors are down - return a random answer:
```typescript
    // If all monitors states are 'DOWN', choose random answer.
    if (monitorFilteredProviders.length === 0) {
        res.setAddr(providers[Math.floor(Math.random() * providers.length)].cname);
        res.setTTL(defaultTtl);
        return;
    }
```
If there are working Monitors - select the answer with the best uptime value and compose our Response:
```typescript
    // Create array map with the monitored uptime for each answer we have in the results list
    const perfProvidersData = monitorFilteredProviders.map(
        (provider) => ({
            provider,
            uptime: fetchMonitorUptime(provider.monitorId)
        })
    );
        // Set the response TTL to the defaultTtl, select the answer with the best monitor uptime
    res.setAddr(getHighestByProperty(perfProvidersData, 'uptime').provider.cname);
    res.setTTL(defaultTtl);
    return;
```
Here we go! Our full script:
```typescript
const configuration = {
    /** List of  providers configuration*/
    providers: [
        {
            monitorId: (301 as TMonitor), // The ID of the Monitor that is created by user to monitor hostname
            cname: 'www.foo.com' // cname to pick as a result
        },
        {
            monitorId: (302 as TMonitor),
            cname: 'www.bar.com'
        },
        {
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

function onRequest(req: IRequest, res: IResponse) {
    const { providers, defaultTtl, availabilityThreshold } = configuration;
    // Filter providers by monitor - check if the monitor is 'UP'
    const monitorFilteredProviders = providers.filter(
        (provider) => isMonitorOnline(provider.monitorId)
    );
    // If all monitors states are 'DOWN', choose random answer.
    if (monitorFilteredProviders.length === 0) {
        res.setAddr(providers[Math.floor(Math.random() * providers.length)].cname);
        res.setTTL(defaultTtl);
        return;
    }
    // Create array map with the monitored uptime for each answer we have in the results list
    const perfProvidersData = monitorFilteredProviders.map(
        (provider) => ({
            provider,
            uptime: fetchMonitorUptime(provider.monitorId)
        })
    );
        // Set the response TTL to the defaultTtl, select the answer with the best monitor uptime
    res.setAddr(getHighestByProperty(perfProvidersData, 'uptime').provider.cname);
    res.setTTL(defaultTtl);
    return;
}
```