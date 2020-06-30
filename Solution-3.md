## Solution 3: The Weighted Random Selection. <a name="case3"></a>
In this example we will add 'weight' properties to our providers. We will also have the availability threshold and if all providers uptimes are less or equal to that (or only one provider 'passes' test) - will simply return the answer based on 'cname' related to the provider with the best uptime for the last hour. And if we have more than one provider with required availability - we will choose the answer based on the weighted random selection that will use our new 'weight' property. We will use our [fetchCDN-functions](Custom-Answers-API#fetchcdnrumuptime) to get CDNs uptimes and performances.

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
If all providers have 'bad' uptime, or the Sum of `available` providers = 0 - we will return the answer based on provider with the best uptime for the last hour:
```typescript
    // If the filtered providers list is empty or total weight is less or equal to 0 - go with fallback option
    if (availableProviders.length === 0 || totalWeight <= 0) {
        // Create the map with 'uptime' value for each provider
        const CDNUptimeData = providers.map(
            // uptime data for the last hour
            (provider) => ({
                provider,
                uptime: fetchCdnRumUptime(provider.name)
            })
        );
        // Set the response TTL to the default TTL, select the provider with the best uptime value
        // and set the response Address to the cname associated with that provider
        res.setCNAMERecord(getHighestByProperty(CDNUptimeData, 'uptime').provider.cname);
        res.setTTL(defaultTtl);
        return;
```
If we have the single provider in our list - we return `cname`, associated with this provider, with default TTL:
```typescript
    // If we have single available provider simply set the defaultTTL and cname of that provider as Addr
    if (availableProviders.length === 1) {
        res.setCNAMERecord(availableProviders[0].cname);
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
    res.setCNAMERecord(availableProviders[weightedProviderIndex].cname);
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
        res.setCNAMERecord(getHighestByProperty(CDNUptimeData, 'uptime').provider.cname);
        res.setTTL(defaultTtl);
        return;
    }
    // If we have single available provider simply set the defaultTTL and cname of that provider as Addr
    if (availableProviders.length === 1) {
        res.setCNAMERecord(availableProviders[0].cname);
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
    res.setCNAMERecord(availableProviders[weightedProviderIndex].cname);
    res.setTTL(defaultTtl);
    return;
}
```
