# Advanced Use Cases
1. [Basic Structure.](#basic-structure)
2. Use Cases:
    * [Case 1: The Optimal Round Trip Time with The Sonar Availability.](Case-1)
    * [Case 2: The Performance with Penalty and Availability.](Case-2)
    * [Case 3: The Weighted Random Selection.](Case-3)
    * [Case 4: Multi Geo-Random with Monitor Overrides.](Case-4)

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
* CDN provider availability for the last hour higher than 90%
* The best CDN provider performance for the last hour. 

In case of all monitors are down it should simply return a random answer. And if all CDN uptimes are 'poor' it should fall back with the answer that has the highest provider uptime. [Go to the Use Case](Case-1)
## Case 2: The Performance with Penalty and Availability. <a name="case2"></a>
The Case: we need to select the answer with the best provider performance and uptime(availability) bigger than 97 percents (both for the last hour, as it is provided by `fetchCdnRumUptime` and `fetchCdnRumPerformance` [functions](Custom-Answers-API#fetchcdnrumuptime)). 

We also want to apply penalty for the particular provider performance, making it bigger...

**Why?**

Well, it might happen that one of our CDN Providers has stable better performance statistics than others and thus always will be the only one selected, so all our 'balancing' with the single provider will make no sense. So we are going to apply 'penalty' - let's call it `padding` and worsen the performance results with the purpose to have our answers balanced.

If all providers have 'low' availability for the last hour - we will use the `default` provider. [Go to the Use Case](Case-2) 
## Case 3: The Weighted Random Selection. <a name="case3"></a>
In this example we will add 'weight' properties to our providers. We will also have the availability threshold and if all providers uptimes are less or equal to that (or only one provider 'passes' test) - will simply return the answer based on 'cname' related to the provider with the best uptime for the last hour. And if we have more than one provider with required availability - we will choose the answer based on the weighted random selection that will use our new 'weight' property. We will use our [fetchCDN-functions](Custom-Answers-API#fetchcdnrumuptime) to get CDNs uptimes and performances. [Go to the Use Case](Case-3)
## Case 4: Multi Geo-Random with Monitor Overrides <a name="case4"></a>
This one is the 'full' version of the script that we used in our [Tutorial](Tutorial#countrieswithrandom). 

The goal is:
* to define specific answers (and even answer sets) for particular countries
* to provide random selection logic in case if there is more than one answer candidate for the country 
* to implement boolean property `requireMonitorData` that validates only answers with Monitors online (if set to `true`)

If country is not in our list - we will use a random answer from our list. In this case, if Monitors validation is 'on' and there are no answers with Monitors online at all - we should fall back. [Go to the Use Case](Case-4)

## More Advanced Use Cases coming soon!