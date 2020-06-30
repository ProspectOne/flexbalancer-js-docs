## Case 2.1: Balancing based on the CDN with the better Performance <a name="case2.1"></a>

The Case: A customer uses 2+ CDN providers. Their user is simply balanced to the better performing one.

We will use [fetchCdnRumPerformance](Custom-Answers-API#fetchcdnrumperformance) function provided by PerfOps that gets CDN Performance for the last hour. For the Performance, the lower result - the better (means the better query speed, see the  statistics at [CDNPerf](https://www.cdnperf.com/)).    

First of all let's prepare out `configuration`, let's make it simple, with only two providers:
```typescript
const configuration = {
    /** List of  providers configuration*/
    providers: [
        {
            name: ('jsdelivr-cdn' as TCDNProvider), // CDN Provider alias to work with
            cname: 'www.foo.com' // cname to pick as a result
        },
        {
            name: ('cloudflare' as TCDNProvider),
            cname: 'www.bar.com'
        }
    ],
    defaultTtl: 20 // The DNS TTL to be applied to DNS responses in seconds.
};
```
As far as we need the lowest (the fastest response) performance value - let's add appropriate functions:
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
Now, time for our main `onRequest` function. Let's parse the configuration and get performances for our providers:
```typescript
function onRequest(req: IRequest, res: IResponse) {
    const { providers, defaultTtl } = configuration;

    // get Providers performances
    const perfProvidersData = providers.map(
        (provider) => ({
            provider,
            perf: fetchCdnRumPerformance(provider.name)
        })
    );
    ...
}
```
And all you have to do now - retreive the provider with the lowest performance value, get `cname` for the answer and finish our script:
```typescript
    res.setCNAMERecord(getLowestByProperty(perfProvidersData, 'perf').provider.cname);
    res.setTTL(defaultTtl);
    return;
```
And that's it! Quite simple but very useful. Here is the whole script code:

```typescript
const configuration = {
    /** List of  providers configuration*/
    providers: [
        {
            name: ('jsdelivr-cdn' as TCDNProvider), // CDN Provider alias to work with
            cname: 'www.foo.com' // cname to pick as a result
        },
        {
            name: ('cloudflare' as TCDNProvider),
            cname: 'www.bar.com'
        }
    ],
    defaultTtl: 20 // The DNS TTL to be applied to DNS responses in seconds.
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
    const { providers, defaultTtl } = configuration;

    // get Providers performances
    const perfProvidersData = providers.map(
        (provider) => ({
            provider,
            perf: fetchCdnRumPerformance(provider.name)
        })
    );

    res.setCNAMERecord(getLowestByProperty(perfProvidersData, 'perf').provider.cname);
    res.setTTL(defaultTtl);
    return;
}
```

