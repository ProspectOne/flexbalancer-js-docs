## Solution 2: The Performance with Penalty and Availability. <a name="case2"></a>
The case: we need to select the answer with the best provider performance and uptime(availability) bigger than 97 percents (both for the last hour, as it is provided by `fetchCdnRumUptime` and `fetchCdnRumPerformance` [functions](Custom-Answers-API#fetchcdnrumuptime)). 

We also want to apply penalty for the particular provider performance, making it bigger...

**Why?**

Well, it might happen that one of our CDN Providers has stable better performance statistics than others and thus always will be the only one selected, so all our 'balancing' with the single provider will make no sense. So we are going to apply 'penalty' - let's call it `padding` and worsen the performance results with the purpose to have our answers balanced.

If all providers have 'low' availability for the last hour - we will use the `default` provider.  

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
You can get more information regarding our `Request` at [Custom Answers API](Custom-Answers-API#interfaces).

In case the country is not determined we will use the global (world) CDN provider performance for the last hour.

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

    // If we have a providers to choose from - choose the one with the best performance for the last hour
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