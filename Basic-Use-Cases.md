# Basic Use Cases
1. [Main Structure.](#basic-structure)
2. [Use Cases.](#use-cases)

# Main Structure <a name="basic-structure"></a>
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

# Use Cases <a name="use-cases"></a>
## Case 1.1: Provider Availability with Weights. <a name="case1.1"></a>
**The Case**: A customer uses 2+ CDN providers. A user is directed to the CDN that is available at a given point in time. If both CDNs are available the decision is based on weight. [Go to the Use Case](Case-1.1)
## Case 1.2: Availability based on Monitor Uptime. <a name="case1.2"></a>
**The Case**: A customer uses 2+ nodes, monitored by [PerfOps Monitoring Feature](https://panel.perfops.net/monitors). A user is directed to the node that has the best Monitor Uptime at a given point in time. If both Monitors are down returns random answer. [Go to the Use Case](Case-1.2)
## Case 2.1: Balancing based on the CDN with the better Performance <a name="case2.1"></a>
**The Case**: A customer uses 2+ CDN providers. Their user is simply balanced to the better performing one. [Go to the Use Case](Case-2.1)
## Case 3.1: Geolocation with excluded country <a name="case3.1"></a>
**The Case**: User has different providers for 2 regions - using 1 CDN for the USA and another CDN for the rest of the world. [Go to the Use Case](Case-3.1)
## Case 3.2: The specific answer for the specific region <a name="case3.2"></a>
**The Case**: User has different CDN provider for each continent, we need to set corresponding answer or fallback if continent is not determined. [Go to the Use Case](Case-3.2)
## Case 4.1: Using country-based answers from remote sources <a name="case4.1"></a>
**The Case**: A customer keeps his answers-for-countries information as JSON at some remote source, wants to retrieve it and use for balancing. [Go to the Use Case](Case-4.1)  
## More Use Cases coming soon!