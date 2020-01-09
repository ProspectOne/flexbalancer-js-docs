## Case 3.1: Geolocation with excluded country <a name="case3.1"></a>

The Case: User has different providers for 2 regions - using 1 CDN for the USA and another CDN for the rest of the world.

First of all let's create our `configuration`. We will add an `iso` property for the provider that needs to be used in case the user 'came' from the particular country. We will also set properties for the default provider and fallback (we have set the default provider in our sample, but in your case you may not have one and want to use a fallback).
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
            cname: 'www.bar.com',
            iso: 'US'
        }
    ],
    defaultProvider: 'jsdelivr-cdn', // Use If no country match
    defaultTtl: 20, // The DNS TTL to be applied to DNS responses in seconds.
    fallBack: 'www.baz.com'
};
```
We do not need any special functions here, so let's proceed with `onRequest`, parse the configuration and determine the default answer candidate:
```typescript
function onRequest(req: IRequest, res: IResponse) {
    const { providers, defaultProvider, defaultTtl, fallBack } = configuration;

    // Select default candidate from providers list
    let defaultCandidate = providers.find(
        (provider) => provider.name == defaultProvider
    );
    ...
}
```
We have the default provider (that is used for all countries other than the USA) in our configuration example, but in case you are not going to have it - let's set a fallback and prepare the default response:
```typescript
    // Set default answer
    let defaultAnswer = (defaultCandidate) ? defaultCandidate.cname : fallBack;
    res.setAddr(defaultAnswer);
    res.setTTL(defaultTtl);
```
The rest of the code is pretty simple, we check if the user country was determined and if it is and it is the USA - set answer to appropriate provider cname:
```typescript
    // Check if user country is determined and has corresponding provider
    if (req.location.country) {
        let candidate = providers.find(
            (provider) => provider.iso == req.location.country 
        );

        if (candidate) {
            res.setAddr(candidate.cname);
        }
    }
```
Done! Here goes our script:
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
            cname: 'www.bar.com',
            iso: 'US'
        }
    ],
    defaultProvider: 'jsdelivr-cdn', // Use If no country match
    defaultTtl: 20, // The DNS TTL to be applied to DNS responses in seconds.
    fallBack: 'www.baz.com'
};

function onRequest(req: IRequest, res: IResponse) {
    const { providers, defaultProvider, defaultTtl, fallBack } = configuration;

    // Select default candidate from providers list
    let defaultCandidate = providers.find(
        (provider) => provider.name == defaultProvider
    );

    // Set default answer
    let defaultAnswer = (defaultCandidate) ? defaultCandidate.cname : fallBack;
    res.setAddr(defaultAnswer);
    res.setTTL(defaultTtl);

    // Check if user country is determined and has corresponding provider
    if (req.location.country) {
        let candidate = providers.find(
            (provider) => provider.iso == req.location.country 
        );

        if (candidate) {
            res.setAddr(candidate.cname);
        }
    }
    return;
}
```