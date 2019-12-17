# Advanced Use Cases
1. [Basic Structure.](#basic-structure)
2. [Use Cases:](#use-cases)
    * [Case 1: The Optimal Round Trip Time with The Sonar Availability.](#case1)
    * [Case 2: The Performance with Penalty and Availability.](#case2)
    * [Case 3: The Weighted Random Selection.](#case3)

# Basic Structure <a name="basic-structure"></a>
In fact, a Custom Answer Configuration structure does not have any strict rules. Below, we just describe the *recommended* structure, that, in our opinion, is the best one for a Custom Answer Script. So feel free to use your own approach, experiment and invent.

A typical Custom Answer has three 'sections':

```typescript
// configuration
const configuration = {
    ...
};
// functions
const someFunction = () => ... ;
...
function anotherFunction() {
...
};
...
// onRequest
function onRequest(req: IRequest, res: IResponse) {
   ...
};
```

* **configuration** - here you place a `configuration` object, it can define providers with some properties, useful sets of data, default properties etc. For example:
```typescript
const configuration = {
    providers: [
        {
            providerName: ('belugacdn' as TCDNProvider), // CDN Provider alias
            cname: 'www.foo.com', // cname to pick as a result
            padding: 0, //  additional bonus or penalty
            countries: (['UA'] as TCountry[]) // countries to apply additional rules
        },
        {
            providerName: ('ovh-cdn' as TCDNProvider),
            cname: 'www.bar.com', // in most cases it is your Answer
            padding: 0,
            continents: (['NA', 'EU'] as TContinent[]) // to apply additional rules
        },
        {
            providerName: ('cloudflare' as TCDNProvider),
            cname: 'www.baz.com',
            padding: 0,
            asns: [12345, 54321] // ASN Numbers to apply additional rules
        },
        {
            providerName: ('fastly'  as TCDNProvider),
            cname: 'www.foo-bar.com',
            padding: 0,
            except_countries: (['CN'] as TCountry[]) // Exception for rules
        },
        {
            providerName: ('some-expensive-cdn'  as TCDNProvider), // example!
            cname: 'www.expensiveanswer.com',
            padding: 100, // the penalty - will show what is it for below
            except_countries: (['CN'] as TCountry[]) // Exception for rules
        },
        ...
        {
            providerName: ('does-not-exist'  as TCDNProvider)
            whatever: 'some value', // 
            you: ['Y','O','U'],
            want_to_have: 1000,
            here: { here: 'now' }
        }
    ],
    defaultTtl: 20, // The DNS TTL to be applied to DNS responses in seconds.
    geoDefault: false,
    asnOverride: false, // Set to `true` to enable the asn override feature
    defaultProvider: ('fastly' as TCDNProvider),
    ...
    nyNiceProperty: 'anything'
    ...
}
``` 
* **functions** - if you need additional funcs- that is the right place to put those:
```typescript
/**
 * Pick index of lowest number in array of numbers
 */
const getLowest = (array: number[]): number => array.indexOf(Math.min(...array));
...
```
* **onRequest** - The `Main` Custom Answers function we operate with.
```typescript
function onRequest(req: IRequest, res: IResponse) {
    let resultAnswer;
    // Logic goes here
    ...
    // Prepare response
    res.setAddr(resultAnswer ? resultAnswer : defaultAnswer);
    res.setTTL(defaultTtl);
    return;
}
``` 
As we have mentioned, feel free to implement your own structure and solutions. The only **the must** is  `onRequest(req: IRequest, res: IResponse)` (Main function) usage.

# Use Cases: <a name="use-cases"></a> 
## Case 1: The Optimal Round Trip Time with The Sonar Availability. <a name="case1"></a>

The Case: we have the bunch of answers, that are inspected by our previously created [Monitors](https://panel.perfops.net). 
We need to get answer that has:
* Corresponding Monitor online, 
* CDN provider availability higher than 90%
* The best CDN provider performance. 

In case of all monitors are down it should simply return a random answer. And if all CDN uptimes are 'poor' it should fall back with the answer that has the highest provider uptime.

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
Let's parse the configuration and get all providers that have monitors online:
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
If everything is fine and we have providers with working monitors - let's keep only those CDN providers that have availability more than 90 percent:
```typescript
    // Filter the previously obtained result. Choose providers that have 'UPTIME' value more that threshold.
    const availableFilteredProviders = monitorFilteredProviders.filter(
        (provider) => fetchCdnRumUptime(provider.name) > availabilityThreshold
    );
```
Everything is perfect, we have the list of CDN providers with good uptime, let's analyze their performance data and return the one with the lowest performance value as the answer. Remember - [the lower 'performance' value - the better](https://www.cdnperf.com/) - it represents value based on response time, so yes- we need the lowest one.
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
## Case 2: The Performance with Penalty and Availability. <a name="case2"></a>
The case: we need to select the answer with the best provider performance and uptime(availability) bigger than 97 percents. 

We also want to apply penalty for the particular provider performance, making it bigger...

**Why?**

Well, it might happen that one of our CDN Providers has stable better performance statistics than others and thus always will be the only one selected, so all our 'balancing' with the single provider will make no sense. So we are going to apply 'penalty' - let's call it `padding` and worsen the performance results with the purpose to have our answers balanced.

If all providers have 'low' availability - we will use the `default` provider.  

First - our `configuration`:
```typescript
const configuration = {
    // The List of the CDN providers we are interested in
    // The `name` must be one of the valid provider aliases from TCDNProvider type
    providers: [
        {
            name: 'jsdelivr-cdn' as TCDNProvider,
            cname: 'www.foo.com',
            padding: 0,
            ttl: 20, // We can provide different TTLs for different providers
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

    // The Default provider which will be chosen if no suitable providers are found.
    defaultProvider: 'jsdelivr-cdn',

    // The Default TTL to be set when the application chooses a provider.
    defaultTtl: 30,

    // The Minimal threshold under which a provider will be considered unavailable
    availabilityThreshold: 97,
};
```
Notice that we have added `padding` property. It can also be negative number and in that case it works as `bonus` to a provider performance. 

Now, add our functions (the same we have used in the previous case):
```typescript
/**
 * Returns index of lowest number in array
 */
const getLowest = (array: number[]): number => array.indexOf(Math.min(...array));
/**
 * Picks item with lowest value in property
 */
const getLowestByProperty = <T>(array: T[], property):T => array[getLowest(array.map(item => item[property]))];
```

Let's parse our `configuration` and keep providers with availability more than 97 percent:
```typescript
    const {availabilityThreshold, defaultProvider, providers, defaultTtl} = configuration;
    let decision;

    // Filter by the availability threshold
    const availableProviders = providers.filter(
        (provider) => (req.location.country ?
            fetchCdnRumUptime(provider.name, 'country', req.location.country) :
            fetchCdnRumUptime(provider.name)) > availabilityThreshold);
```
Let's use our `req` (Request) to determine the country user came from - it provides such information:
```typescript
    readonly location: {
        ...
        city?: number;
        country?: TCountry; // This is one we need
        state?: TState | null;
        continent?: TContinent;
        ...
    };
```
You can get more information regarding our `Request` at [[Custom Answers API|Custom-Answers-API]].

In case the country is not determined we will use the global (world) CDN provider performance.

Now, let's get all CDN performances and apply the penalties. 
```typescript
    // Get CDN performances and apply the paddings for the providers available 
    const providersPerformance = availableProviders.map(
        (provider) => ({
            provider,
            performance: req.location.country ?
                // Get the performance for the country if we know it
                fetchCdnRumPerformance(provider.name, 'country', req.location.country) + provider.padding :
                // If we don't know the country - we get the global performance instead
                fetchCdnRumPerformance(provider.name) + provider.padding
        })
    );
```
If we have non-empty list of the CDN providers with required availability - we choose the provider with the best performance:
```typescript
    // If we have a providers to choose from - choose the one with the best performance
    if (providersPerformance.length) {
        decision = getLowestByProperty(providersPerformance, 'performance').provider;
        res.setAddr(decision.cname);
        res.setTTL(decision.ttl ? decision.ttl : defaultTtl);
        return;
    }
```
If no providers with the desired uptime - we just use the `default` one:
```typescript
    // No available providers - return default
    decision = providers.find(provider => provider.name === defaultProvider);

    // Prepare the response
    res.setAddr(decision.cname);
    res.setTTL(decision.ttl ? decision.ttl : defaultTtl);
    return;
```
That's it! **Take a look at the complete script**:
```typescript
const configuration = {
    // The List of the CDN providers we are interested in
    // The `name` must be one of the valid provider aliases from TCDNProvider type
    providers: [
        {
            name: 'jsdelivr-cdn' as TCDNProvider,
            cname: 'www.foo.com',
            padding: 0,
            ttl: 20, // We can provide different TTLs for different providers
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

    // The Default provider which will be chosen if no suitable providers are found.
    defaultProvider: 'jsdelivr-cdn',

    // The Default TTL to be set when the application chooses a provider.
    defaultTtl: 30,

    // The Minimal threshold under which a provider will be considered unavailable
    availabilityThreshold: 97,
};

/**
 * Returns index of lowest number in array
 */
const getLowest = (array: number[]): number => array.indexOf(Math.min(...array));
/**
 * Picks item with lowest value in property
 */
const getLowestByProperty = <T>(array: T[], property):T => array[getLowest(array.map(item => item[property]))];

function onRequest(req: IRequest, res: IResponse) {
    const {availabilityThreshold, defaultProvider, providers, defaultTtl} = configuration;
    let decision;

    // Filter by the availability threshold
    const availableProviders = providers.filter(
        (provider) => (req.location.country ?
            fetchCdnRumUptime(provider.name, 'country', req.location.country) :
            fetchCdnRumUptime(provider.name)) > availabilityThreshold);

    // Get CDN performances and apply the paddings for the providers available
    const providersPerformance = availableProviders.map(
        (provider) => ({
            provider,
            performance: req.location.country ?
                // Get the performance for the country if we know it
                fetchCdnRumPerformance(provider.name, 'country', req.location.country) + provider.padding :
                // If we don't know the country - we get the global performance instead
                fetchCdnRumPerformance(provider.name) + provider.padding
        })
    );

    // If we have a providers to choose from - choose the one with the best performance
    if (providersPerformance.length) {
        decision = getLowestByProperty(providersPerformance, 'performance').provider;
        res.setAddr(decision.cname);
        res.setTTL(decision.ttl ? decision.ttl : defaultTtl);
        return;
    }

    // No available providers - return default
    decision = providers.find(provider => provider.name === defaultProvider);

    // Prepare the response
    res.setAddr(decision.cname);
    res.setTTL(decision.ttl ? decision.ttl : defaultTtl);
    return;
}
```
## Case 3: The Weighted Random Selection. <a name="case3"></a>
In this example we will add 'weight' properties to our providers. We will also have the availability threshold and if all providers uptimes are less or equal to that (or only one provider 'passes' test) - will simply return the answer based on 'cname' related to the provider with the best uptime. And if we have more than one provider with required availability - we will choose the answer based on the weighted random selection that will use our new 'weight' property.

Our `configuration` goes first:
```typescript
const configuration = {
    /** List of providers configuration */
    providers: [
        {
            name: ('jsdelivr-cdn' as TCDNProvider),// CDN Provider alias to work with
            cname: 'cname1.foo.com',// cname to pick as a result
            weight: 50// Weight number for this choice
        },
        {
            name: ('google-cloud-cdn' as TCDNProvider),
            cname: 'cname2.foo.com',
            weight: 30
        },
        {
            name: ('cloudflare' as TCDNProvider),
            cname: 'cname3.foo.com',
            weight: 20
        }
    ],
    defaultTtl: 20, // The DNS TTL to be applied to the DNS responses in seconds.
    availabilityThreshold: 90 // The Board value for the providers 'Uptime' to compare with
};
```
As you can see- we just added the new property, other structure is almost the same with the previous examples.

Now, let's set up our `functions` section:
```typescript
/**
 * Picks the highest value in an array of numbers
 */
const getHighest = (array: number[]): number => array.indexOf(Math.max(...array));
/**
 * Picks object item with the highest property value from an array of items
 */
const getHighestByProperty = <T>(array: T[], property):T => array[getHighest(array.map(item => item[property]))];
/**
 * Calculates SUM of property values for all objects in an array
 */
const getSumByProperty = <T>(items:T[], property): number => items.reduce((sum, item) => sum += item[property],0);
```
And proceed with our logic. Parse configuration and get the list of providers with required availability:

```typescript
    const {providers, defaultTtl, availabilityThreshold} = configuration;

    // Choose providers that have 'UPTIME' value more than the default threshold
    const availableProviders = providers.filter(
        (provider) => fetchCdnRumUptime(provider.name) > availabilityThreshold
    );
```
Then let's calculate the weight SUM of that 'available' providers from the list, we'll need it for the weighted random later:
```typescript
    // Calculate the total weight for available providers
    const totalWeight = getSumByProperty(availableProviders, 'weight');
```
If all providers have 'bad' uptime, or the Sum of `available` providers = 0 - we will return the answer based on provider with the best uptime:
```typescript
    // If the filtered providers list is empty or total weight is less or equal to 0 - go with fallback option
    if (availableProviders.length === 0 || totalWeight <= 0) {
        // Create the map with 'uptime' value for each provider
        const CDNUptimeData = providers.map(
            // uptime data for 10 minutes
            (provider) => ({
                provider,
                uptime: fetchCdnRumUptime(provider.name)
            })
        );
        // Set the response TTL to the default TTL, select the provider with the best uptime value
        // and set the response Address to the cname associated with that provider
        res.setAddr(getHighestByProperty(CDNUptimeData, 'uptime').provider.cname);
        res.setTTL(defaultTtl);
        return;
```
If we have the single provider in our list - we return `cname`, associated with this provider, with default TTL:
```typescript
    // If we have single available provider simply set the defaultTTL and cname of that provider as Addr
    if (availableProviders.length === 1) {
        res.setAddr(availableProviders[0].cname);
        res.setTTL(defaultTtl);
        return;
    }
```
And finally, if we have more than one provider in our `available providers` list - we apply weighted random logic, select one of them and use it for our response:
```typescript
    // If we have a bunch of available results - we pick a result using weighted random
    const random = Math.floor(Math.random() * totalWeight);
    let mark = 0;
    let weightedProviderIndex = 0;
    for(let i = 0; i< availableProviders.length; i += 1) {
        mark += availableProviders[i].weight;
        if (random < mark) {
            weightedProviderIndex = i;
            break;
        }
    }
    // Set the response TTL to the default TTL, and Addr to the cname associated with the chosen provider
    res.setAddr(availableProviders[weightedProviderIndex].cname);
    res.setTTL(defaultTtl);
    return;
```
Our script is ready, **here is the whole code**:

```typescript
// Main configuration
const configuration = {
    /** List of providers configuration */
    providers: [
        {
            name: ('jsdelivr-cdn' as TCDNProvider),// CDN Provider alias to work with
            cname: 'cname1.foo.com',// cname to pick as a result
            weight: 50// Weight number for this choice
        },
        {
            name: ('google-cloud-cdn' as TCDNProvider),
            cname: 'cname2.foo.com',
            weight: 30
        },
        {
            name: ('cloudflare' as TCDNProvider),
            cname: 'cname3.foo.com',
            weight: 20
        }
    ],
    defaultTtl: 20, // The DNS TTL to be applied to the DNS responses in seconds.
    availabilityThreshold: 90 // The Board value for the providers 'Uptime' to compare with
};

/**
 * Picks the highest value in an array of numbers
 */
const getHighest = (array: number[]): number => array.indexOf(Math.max(...array));
/**
 * Picks object item with the highest property value from an array of items
 */
const getHighestByProperty = <T>(array: T[], property):T => array[getHighest(array.map(item => item[property]))];
/**
 * Calculates SUM of property values for all objects in an array
 */
const getSumByProperty = <T>(items:T[], property): number => items.reduce((sum, item) => sum += item[property],0);

function onRequest(req: IRequest, res: IResponse) {
    const {providers, defaultTtl, availabilityThreshold} = configuration;

    // Choose providers that have 'UPTIME' value more than the default threshold
    const availableProviders = providers.filter(
        (provider) => fetchCdnRumUptime(provider.name) > availabilityThreshold
    );
    // Calculate the total weight for available providers
    const totalWeight = getSumByProperty(availableProviders, 'weight');

    // If the filtered providers list is empty or total weight is less or equal to 0 - go with fallback option
    if (availableProviders.length === 0 || totalWeight <= 0) {
        // Create the map with 'uptime' value for each provider
        const CDNUptimeData = providers.map(
            // uptime data for 10 minutes
            (provider) => ({
                provider,
                uptime: fetchCdnRumUptime(provider.name)
            })
        );
        // Set the response TTL to the default TTL, select the provider with the best uptime value
        // and set the response Address to the cname associated with that provider
        res.setAddr(getHighestByProperty(CDNUptimeData, 'uptime').provider.cname);
        res.setTTL(defaultTtl);
        return;
    }
    // If we have single available provider simply set the defaultTTL and cname of that provider as Addr
    if (availableProviders.length === 1) {
        res.setAddr(availableProviders[0].cname);
        res.setTTL(defaultTtl);
        return;
    }
    // If we have a bunch of available results - we pick a result using weighted random
    const random = Math.floor(Math.random() * totalWeight);
    let mark = 0;
    let weightedProviderIndex = 0;
    for(let i = 0; i< availableProviders.length; i += 1) {
        mark += availableProviders[i].weight;
        if (random < mark) {
            weightedProviderIndex = i;
            break;
        }
    }
    // Set the response TTL to the default TTL, and Addr to the cname associated with the chosen provider
    res.setAddr(availableProviders[weightedProviderIndex].cname);
    res.setTTL(defaultTtl);
    return;
}
``` 
## More Advanced Use Cases coming soon!