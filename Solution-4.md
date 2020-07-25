## Solution 4: Multi Geo-Random with Monitor Overrides <a name="case4"></a>
This one is the 'full' version of the script that we used in our [Tutorial](Tutorial#countrieswithrandom). 

The goal is:
* to define specific answers (and even answer sets) for particular countries
* to provide random selection logic in case if there is more than one answer candidate for the country 
* to implement boolean property `requireMonitorData` that validates only answers with Monitors online (if set to `true`)

If country is not in our list - we will use a random answer from our list. In this case, if Monitors validation is 'on' and there are no answers with Monitors online at all - we should fall back.

Yes, it may sound complicated, but in fact it's not that bad. Our `configuration` section goes first: 
```typescript
const configuration = {
    providers: [
        {
            name: 'foo', // candidate name
            cname: 'www.foo.com', // cname to pick as a result for the response Addr
            monitor: (304 as TMonitor) // Monitor ID that is created by user to monitor hostname
        },
        {
            name: 'bar',
            cname: 'www.bar.com',
            monitor: (305 as TMonitor)
        },
        {
            name: 'baz',
            cname: 'www.baz.com'
        }
    ],
    countriesAnswersSets: {
        'PL': ['bar', 'baz'],
        'JP': ['foo']
    },
    defaultTtl: 20,
    requireMonitorData: false // in this case answer monitor being online is not required
};
```
We have defined three answer providers, created sets for two countries (Poland and Japan), at `countriesAnswersSets` assigned two of our answer candidate 'names' to Poland and one - to Japan. We have added that mentioned above boolean property `requireMonitorData` and set it to 'false' for our example. 

Now we add one our 'common' function for random element:
```typescript
/**
 * Picks random item from array of items
 */
const getRandomElement = <T>(items: T[]): T => {
    return items[Math.floor(Math.random() * items.length)];
};
```
And we also create function that validates answer candidate. It returns either answer Monitor online status (if `requireMonitorData` is set to `true`) or just `true` if we don't care about Monitors statuses:
```typescript
/**
 * If monitor is set for candidate - returns its availability, else returns true if monitor is not required
 */
const isProperCandidate = (candidate, requireMonitorData) => {
    if (candidate.monitor) {
        return isMonitorOnline(candidate.monitor)
    }
    return !requireMonitorData;
};
```
Now let's implement our logic inside `onResponse` (Main) function.

First, we parse our `configuration` and try to determine the user country:
```typescript
    const {countriesAnswersSets, providers, defaultTtl, requireMonitorData} = configuration;

    // Country where request was made from
    let requestCountry = req.location.country as TCountry;
```
Now we check if we were able to get the country, and if it is one of the countries from our list (Poland or Japan) - check if there is answers set for it and if the answer candidates are valid. In our particular example all of them are valid, because `requireMonitorData` is set to `false`. But if you enable it - it won't validate any candidates with Monitors `offline`.
```typescript
    // Checking if we were able to detect country, and if our country is listed in countriesAnswersSets list
    if (requestCountry && countriesAnswersSets[requestCountry]) {
        // Choose candidates that are listed in countriesAnswersSets and are proper candidates
        let geoFilteredCandidates = providers.filter(
            (provider) => countriesAnswersSets[requestCountry].includes(provider.name)
                && isProperCandidate(provider, requireMonitorData)
        );
```
If we get the user from Poland or Japan and the validation of the candidate(candidates) for that country has passed - we randomly pick the answer from the country answers set and use its `cname` for Response Address:
```typescript
        // If we found proper geo candidates, pick one of them randomly and use cname for the answer
        if (geoFilteredCandidates.length) {
            res.setCNAMERecord(getRandomElement(geoFilteredCandidates).cname);
            res.setTTL(defaultTtl);
            return;
        }
```  
If the user is from any other country, or country is 'unknown' - we pick random candidate and use its `cname` for Response. If `requireMonitorData` is set to `true` - we pick the candidate only from those with Monitors online.
```typescript
    //If there was no geo candidates, we choose new ones from whole list by monitor filter
    const properCandidates = providers.filter(item => isProperCandidate(item, requireMonitorData));

    //Choose random candidate cname as response Addr (if we have any)
    if (properCandidates.length) {
        res.setCNAMERecord(getRandomElement(properCandidates).cname);
        res.setTTL(defaultTtl);
        return;
    }
```
In case all monitors are offline - we use the `fallback`:
```typescript
    // If not - set fallback 
    res.setCNAMERecord('our.fallback.com');
    res.setTTL(defaultTtl);
    return;
```
Here we go! **And here is our script:**
```typescript
const configuration = {
    providers: [
        {
            name: 'foo', // candidate name
            cname: 'www.foo.com', // cname to pick as a result for the response Addr
            monitor: (304 as TMonitor) // Monitor ID that is created by user to monitor hostname
        },
        {
            name: 'bar',
            cname: 'www.bar.com',
            monitor: (305 as TMonitor)
        },
        {
            name: 'baz',
            cname: 'www.baz.com'
        }
    ],
    countriesAnswersSets: {
        'PL': ['bar', 'baz'],
        'JP': ['foo']
    },
    defaultTtl: 20,
    requireMonitorData: false // in this case answer monitor being online is not required
};

/**
 * Picks random item from array of items
 */
const getRandomElement = <T>(items: T[]): T => {
    return items[Math.floor(Math.random() * items.length)];
};

/**
 * If monitor is set for candidate - returns its availability, else returns true if monitor is not required
 */
const isProperCandidate = (candidate, requireMonitorData) => {
    if (candidate.monitor) {
        return isMonitorOnline(candidate.monitor)
    }
    return !requireMonitorData;
};

function onRequest(req: IRequest, res: IResponse) {
    const {countriesAnswersSets, providers, defaultTtl, requireMonitorData} = configuration;

    // Country where request was made from
    let requestCountry = req.location.country as TCountry;

    // Checking if we were able to detect country, and if our country is listed in countriesAnswersSets list
    if (requestCountry && countriesAnswersSets[requestCountry]) {
        // Choose candidates that are listed in countriesAnswersSets and are proper candidates
        let geoFilteredCandidates = providers.filter(
            (provider) => countriesAnswersSets[requestCountry].includes(provider.name)
                && isProperCandidate(provider, requireMonitorData)
        );
        // If we found proper geo candidates, pick one of them randomly and use cname for the answer
        if (geoFilteredCandidates.length) {
            res.setCNAMERecord(getRandomElement(geoFilteredCandidates).cname);
            res.setTTL(defaultTtl);
            return;
        }
    }

    //If there was no geo candidates, we choose new ones from whole list by monitor filter
    const properCandidates = providers.filter(item => isProperCandidate(item, requireMonitorData));

    //Choose random candidate cname as response Addr (if we have any)
    if (properCandidates.length) {
        res.setCNAMERecord(getRandomElement(properCandidates).cname);
        res.setTTL(defaultTtl);
        return;
    }
    // If not - set fallback 
    res.setCNAMERecord('our.fallback.com');
    res.setTTL(defaultTtl);
    return;
}
```