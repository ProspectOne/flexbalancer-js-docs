## Case 3.2: The specific answer for the specific region <a name="case3.2"></a>

The Case: User has different CDN provider for each continent, we need to set corresponding answer or fallback if continent is not determined.

This case is quite similar to the previous one, First of all let's create our `configuration`. 
We have the special type for continents that represent their ISO codes:
```typescript
declare type TContinent = 'AF' | 'AS' | 'EU' | 'NA' | 'OC' | 'SA';
```
We add an `iso` property for the provider that assigns the continent for the answer and also set our fallback answer.
```typescript
const configuration = {
    /** List of  providers configuration*/
    providers: [
        {
            name: ('jsdelivr-cdn' as TCDNProvider), // CDN Provider alias to work with
            cname: 'af.foo.com', // cname to pick as a result
            iso: ('AF' as TContinent)
        },
        {
            name: ('cloudflare' as TCDNProvider),
            cname: 'as.bar.com',
            iso: ('AS' as TContinent)
        },
                {
            name: ('akamai' as TCDNProvider),
            cname: 'eu.foo.com',
            iso: ('EU' as TContinent)
        },
        {
            name: ('google-cloud-cdn' as TCDNProvider),
            cname: 'na.bar.com',
            iso: ('NA' as TContinent)
        },
        {
            name: ('ovh-cdn' as TCDNProvider),
            cname: 'oc.foo.com',
            iso: ('OC' as TContinent)
        },
        {
            name: ('belugacdn' as TCDNProvider),
            cname: 'sa.bar.com',
            iso: ('SA' as TContinent)
        }
    ],
    defaultTtl: 20, // The DNS TTL to be applied to DNS responses in seconds.
    fallBack: 'www.baz.com' // If continent is not determined - use fallback answer
};
```
Let's proceed with `onRequest`, parse the configuration and set fallback answer:
```typescript
function onRequest(req: IRequest, res: IResponse) {
    const { providers, defaultTtl, fallBack } = configuration;

    // Set fallback as default answer
    res.setAddr(fallBack);
    res.setTTL(defaultTtl);
    ...
}
```
The rest of the code is almost the same as at the previous sample, we just check if the user continent was recognized and if it is - set answer to the corresponding one:
```typescript
    // Check if user continent is determined and select corresponding answer
    if (req.location.continent) {
        let candidate = providers.find(
            (provider) => provider.iso == req.location.continent 
        );

        if (candidate) {
            res.setAddr(candidate.cname);
        }
    }
    return;
```
That's all! Here goes our script:
```typescript
const configuration = {
    /** List of  providers configuration*/
    providers: [
        {
            name: ('jsdelivr-cdn' as TCDNProvider), // CDN Provider alias to work with
            cname: 'af.foo.com', // cname to pick as a result
            iso: ('AF' as TContinent)
        },
        {
            name: ('cloudflare' as TCDNProvider),
            cname: 'as.bar.com',
            iso: ('AS' as TContinent)
        },
                {
            name: ('akamai' as TCDNProvider),
            cname: 'eu.foo.com',
            iso: ('EU' as TContinent)
        },
        {
            name: ('google-cloud-cdn' as TCDNProvider),
            cname: 'na.bar.com',
            iso: ('NA' as TContinent)
        },
        {
            name: ('ovh-cdn' as TCDNProvider),
            cname: 'oc.foo.com',
            iso: ('OC' as TContinent)
        },
        {
            name: ('belugacdn' as TCDNProvider),
            cname: 'sa.bar.com',
            iso: ('SA' as TContinent)
        }
    ],
    defaultTtl: 20, // The DNS TTL to be applied to DNS responses in seconds.
    fallBack: 'www.baz.com' // If continent is not determined - use fallback answer
};

function onRequest(req: IRequest, res: IResponse) {
    const { providers, defaultTtl, fallBack } = configuration;

    // Set fallback as default answer
    res.setAddr(fallBack);
    res.setTTL(defaultTtl);

    // Check if user continent is determined and select corresponding answer
    if (req.location.continent) {
        let candidate = providers.find(
            (provider) => provider.iso == req.location.continent 
        );

        if (candidate) {
            res.setAddr(candidate.cname);
        }
    }
    return;
}
```