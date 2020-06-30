## Case 1.1: Provider Availability with Weights. <a name="case1.1"></a>

The Case: A customer uses 2+ CDN providers. A user is directed to the CDN that is available at a given point in time. If both CDNs are available the decision is based on weight.

Let's create our `configuration` object. We should have 'cname' (answer), 'name' (CDN alias) and 'weight' properties:
```typescript
const configuration = {
    /** List of  providers configuration*/
    providers: [
        {
            name: ('jsdelivr-cdn' as TCDNProvider), // CDN Provider alias to work with
            cname: 'www.foo.com', // cname to pick as a result
            weight: 50 // 
        },
        {
            name: ('cloudflare' as TCDNProvider),
            cname: 'www.bar.com',
            weight: 30
        },
        {
            name: ('google-cloud-cdn' as TCDNProvider),
            cname: 'www.zoo.com',
            weight: 20
        }
    ],
    defaultTtl: 20 // The DNS TTL to be applied to DNS responses in seconds.
};
```
We have only three providers but there can be as many as you need.

We will also need to define functions that will allow us to select the highest availability or weight values:
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
 * Get max value of property from objects array
 */
const getMaxPropertyValue = <T>(array: T[], property):number => Math.max(...array.map(item => item[property]));
```
Now, we should create our 'main' onRequest function, parse our configuration and get uptime values:
```typescript
    const { providers, defaultTtl } = configuration;

    // get Providers uptimes
    const uptimeProvidersData = providers.map(
        (provider) => ({
            provider,
            uptime: fetchCdnRumUptime(provider.name)
        })
    );
```
Now let's determine the maximal provider 'uptime' value and get the provider/list of the providers with that uptime:
```typescript
    const maxUptime = getMaxPropertyValue(uptimeProvidersData, 'uptime');

    const filteredProvidersData = uptimeProvidersData.filter(item => item.uptime >= maxUptime);
```
If there is the only one provider -  set answer to `cname` associated with it & finish script:
```typescript
    // If we have single result, then return it
    if (filteredProvidersData.length === 1) {
        res.setCNAMERecord(filteredProvidersData[0].provider.cname);
        res.setTTL(defaultTtl);
        return;
    }
```
Well in that case when more than one providers have equal uptimes - let's pick the one with the highest weight and return its `cname`:
```typescript
    // If we have few results with same uptime, return cname of the provider with highest weight
    res.setCNAMERecord(getHighestByProperty(filteredProvidersData.map(item => item.provider), 'weight').cname);
    res.setTTL(defaultTtl);
    return;
```
Here we go!

The full code of our script is here:
```typescript
const configuration = {
    /** List of  providers configuration*/
    providers: [
        {
            name: ('jsdelivr-cdn' as TCDNProvider), // CDN Provider alias to work with
            cname: 'www.foo.com', // cname to pick as a result
            weight: 50 // 
        },
        {
            name: ('cloudflare' as TCDNProvider),
            cname: 'www.bar.com',
            weight: 30
        },
        {
            name: ('google-cloud-cdn' as TCDNProvider),
            cname: 'www.zoo.com',
            weight: 20
        }
    ],
    defaultTtl: 20 // The DNS TTL to be applied to DNS responses in seconds.
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
 * Get max value of property from objects array
 */
const getMaxPropertyValue = <T>(array: T[], property):number => Math.max(...array.map(item => item[property]));

function onRequest(req: IRequest, res: IResponse) {
    const { providers, defaultTtl } = configuration;

    // get Providers uptimes
    const uptimeProvidersData = providers.map(
        (provider) => ({
            provider,
            uptime: fetchCdnRumUptime(provider.name)
        })
    );

    const maxUptime = getMaxPropertyValue(uptimeProvidersData, 'uptime');

    const filteredProvidersData = uptimeProvidersData.filter(item => item.uptime >= maxUptime);

    // If we have single result, then return it
    if (filteredProvidersData.length === 1) {
        res.setCNAMERecord(filteredProvidersData[0].provider.cname);
        res.setTTL(defaultTtl);
        return;
    }

    // If we have few results with same uptime, return cname of the provider with highest weight
    res.setCNAMERecord(getHighestByProperty(filteredProvidersData.map(item => item.provider), 'weight').cname);
    res.setTTL(defaultTtl);
    return;
}
```