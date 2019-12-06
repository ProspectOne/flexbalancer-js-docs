# Writing code of your Custom FlexBalancer Answer.

* [Check if user ip is at specific range.](#specificrange)
* [City Lookup based answer.](#citybased)
* [Choice based on CDN RUM uptime.](#cdnuptime)
* [Uptime Monitors based answer.](#monuptime)
* [Different answers for different countries.](#diffcountries)
* [Countries based answers with random selection.](#countrieswithrandom)

First of all, couple of words regarding script structure. All main Custom Answer logic is placed inside asynchronous function `onRequest`. It has two params: `req` (Request) and `res` (Response). 

* **req** (Request) - provides you with all available information regarding requesting user.
* **res** (Response) - helps you to form specific answer, has `setAddr` and `setTTL` methods for that.

Our types, interfaces and functions are described here: [[Custom-Answers-API|Custom-Answers-API]] 

## Check if user ip is at specific range. <a name="specificrange"></a>

First of all, let's create the simpliest answer. It will check user ip and if it is in specific range - return `answer.formyiprange.net` with TTL 10. If it is not - return `answer.otherranges.net` with TTL 15.

We have user IP at our IRequest interface:

```typescript
    ...
    readonly ip: TIp;
    ...
```

So log in, proceed to FlexBalancers page, add new FlexBalancer with Custom answer, set fallback (we just made it as `fallback.mydomain.com`) and you will be redirected to Editing page. Flex creations and management is described at our 'Quick Start` Document - you may want to take a look at that: [[Quick Start|Quick-Start]] 

Let's set up IP ranges for specific answer:

```typescript
const ipFrom = '134.249.200.0';
const ipTo = '134.249.250.0';
```

Let's presume that our current ip is at that range, so it should be processed by custom answer. You can use your own IP with own range, just be sure your IP is in that range.

So let's edit our 'onRequest' logic. We will use our predefined **isIpInRange(ip: TIp, startIp: TIp, endIp: TIp):boolean** function: 

```typescript
async function onRequest(req: IRequest, res: IResponse) {
    if (isIpInRange(req.ip, ipFrom, ipTo) === true) { // Check if IP is in range
        res.setAddr('answer.formyiprange.net'); // Set 'addr' for answer
        res.setTTL(10); // Set TTL

        return;
    }
}
```

And if IP is not at that range it should return `answer.otherranges.net` with TTL 15:

```typescript
    ...
    }
    res.setAddr('answer.otherranges.net');
    res.setTTL(15);

    return;
}
``` 

So finally, our answer looks like:

```typescript
const ipFrom = '134.249.200.0';
const ipTo = '134.249.250.0';

async function onRequest(req: IRequest, res: IResponse) {
    if (isIpInRange(req.ip, ipFrom, ipTo) === true) { // Check if IP is in range
        res.setAddr('answer.formyiprange.net'); // It is, set 'addr' for answer
        res.setTTL(10); // Set TTL

        return;
    }
    // IP is not in that range
    res.setAddr('answer.otherranges.net');
    res.setTTL(15);

    return;
}
```

Now press `Test and Publish` Button. This **is important** otherwise nothing will work.

And now when we dig my balancer with IP address inside that range, we get:
```
;; ANSWER SECTION:
testcustom.0b62ec.flexbalancer.net. 10 IN CNAME answer.formyiprange.net.
```

and if we are using another IP that is not in range we get
```
;; ANSWER SECTION:
testcustom.0b62ec.flexbalancer.net. 15 IN CNAME answer.otherranges.net.
```

Pretty simple, isn't it?

## City Lookup based answer. <a name="citybased">

We provide useful set of `lookup-type` functions - those can get user location information based on user IP.

For example, you want to assign specific answer for all users at 100km radius from `Amsterdam`. From [MaxMind GeoLite2 Databases](https://dev.maxmind.com/geoip/geoip2/geolite2/) we get `Amsterdam` geoname ID and it is equal to `2759794`.

Our `lookup` functions can be used with `ip` as a single parameter and also accept additional parameters:
```typescript
lookupCity(ip: string) // We won't need this now. And in most cases we have that info at req.location.city
...
lookupCity(ip: string, target: number, threshold: number) // This is one we need
```
You can find out more information in our documentation [[Custom Answers API|Custom-Answers-API]]

First let's define city and answers:
```typescript
const cityToCheckGeoNameId = 2759794; // our city geoname ID
const cityToCheckAnswer = 'amsterdam.myanswer.net'; // answer for that city
const distanceThreshold = 100; // 100 km radius
const defaultAnswer = 'othercity.myanswer.net'; // answer for other cities
```
We will use `lookupCity` function three arguments (user IP, city geoname ID and threshold), that returns Promise. If resolved - it gives us `bool` result.

Now we implement the simple logic:
```typescript
    const userInRadius = await lookupCity(req.ip, cityToCheckGeoNameId, distanceThreshold);
    if(userInRadius  === true) { // 'yes', user is in 100km from Amsterdam
        res.setAddr(cityToCheckAnswer); // set answer for Amsterdam
        return;
    }
    res.setAddr(defaultAnswer); // It is not Amsterdam, return answer for other cities
    return;
```

So we have script:
```typescript
const cityToCheckGeoNameId = 2759794; // our city geoname ID
const cityToCheckAnswer = 'amsterdam.myanswer.net'; // answer for that city
const distanceThreshold = 100; // 100 km radius
const defaultAnswer = 'othercity.myanswer.net'; // answer for other cities

async function onRequest(req: IRequest, res: IResponse) {
    const userInRadius = await lookupCity(req.ip, cityToCheckGeoNameId, distanceThreshold);
    if(userInRadius  === true) { // 'yes', user is in 100km from Amsterdam
        res.setAddr(cityToCheckAnswer); // set answer for Amsterdam
        return;
    }
    res.setAddr(defaultAnswer); // It is not Amsterdam, return answer for other cities
    return;
}
```

And tests show us expected answer:
```
;; ANSWER SECTION:
testcustom.0b62ec.flexbalancer.net. 10 IN CNAME amsterdam.myanswer.net.
```

## Choice based on CDN RUM uptime. <a name="cdnuptime">

Let's imagine that you have two answers hosted on two different CDN providers: `jsdelivr.myanswer.net` and `googlecloud.myanswer.net`.

[CDNPerf](#https://www.cdnperf.com/) provides CDN Uptime value, based on RUM (Real User Metrics) data from users all over the world. You want to check that Uptimes and return answer from CDN with better uptime. And if uptimes are equal - return random answer. 

First, let make an array of our answers:
```typescript
const answers = [
    'jsdelivr.myanswer.net',
    'googlecloud.myanswer.net'
];
```
Then, get CDN Performance values, using `fetchCdnRumUptime` function, provided by our [[Custom Answers API|Custom-Answers-API]]:
```typescript
    // get Uptime values
    const jsDelivrUp = fetchCdnRumUptime('jsdelivr-cdn');
    const googleCloudUp = fetchCdnRumUptime('google-cloud-cdn');
```
Now, if values are equal - we'll return random answer from our array:
```typescript
    // if Uptime values are equal - return random answer
    if(jsDelivrUp == googleCloudUp) {
        const randomAnswer = answers[Math.floor(Math.random()*answers.length)];
        res.setAddr(randomAnswer);
        return;
    }
```
And if those are not equal - return answer from CDN with better uptime:
```typescript
    // get answer based on higher uptime
    const answer = (jsDelivrUp > googleCloudUp) ? answers[0] : answers[1];

    res.setAddr(answer); // return answer
    return;
```
As the result, we get our final script:
```typescript
const answers = [
    'jsdelivr.myanswer.net',
    'googlecloud.myanswer.net'
];

async function onRequest(req: IRequest, res: IResponse) {
    // get Uptime values
    const jsDelivrUp = fetchCdnRumUptime('jsdelivr-cdn');
    const googleCloudUp = fetchCdnRumUptime('google-cloud-cdn');

    // if Uptime values are equal - return random answer
    if(jsDelivrUp == googleCloudUp) {
        const randomAnswer = answers[Math.floor(Math.random()*answers.length)];
        res.setAddr(randomAnswer);
        return;
    }

    // get answer based on higher uptime
    const answer = (jsDelivrUp > googleCloudUp) ? answers[0] : answers[1];

    res.setAddr(answer); // return answer
    return;
}
```

And that's it!
So now we get either:
```
;; ANSWER SECTION:
testcustom.0b62ec.flexbalancer.net. 10 IN CNAME jsdelivr.myanswer.net.
```
or
```
;; ANSWER SECTION:
testcustom.0b62ec.flexbalancer.net. 10 IN CNAME googlecloud.myanswer.net.
```
depending on best CDN uptime.

There is another way to perform balancing based on `Uptime`, let's take `Monitors-based` example.

## Uptime Monitors based answer. <a name="monuptime">
[PerfOps](https://perfops.net/) provides Monitor Uptime feature that allows you to set monitor to each of your answers and use that uptime statistics for balancing. Let's use that statistics in our example.

Each monitor has its own ID, that is listed at ['Monitors page'](https://panel.perfops.net/monitors). In our example case that IDs are `593` for `first.myanswer.net` and `594` for `second.myanswer.net`.

First, let's describe our answers and related monitors:
```typescript
const answerOne = {
    answer: 'first.myanswer.net',
    monitor: 593 as TMonitor
}; // 'first' answer and its monitor
const answerTwo = {
    answer: 'second.myanswer.net',
    monitor: 594 as TMonitor
}; // 'second' answer and its monitor
```
Notice, that Monitor IDs must be of `TMonitor` type:
```typescript
declare type TMonitor = 593 | 594; // your monitor IDs
```
And we are going to use *fetchMonitorUptime(monitor: TMonitor)* and *isMonitorOnline(monitor: TMonitor)* functions, described at [[Custom Answers API|Custom-Answers-API]].

Now, let's write our script. First, we check if our monitors are online:
```typescript
    // check if Monitors are online
    const firstOnline = isMonitorOnline(answerOne.monitor);
    const secondOnline = isMonitorOnline(answerTwo.monitor);
```
And fetch uptime results or set uptime to 0 depending on online status:
```typescript
    // get Monitor Uptime values if Monitors are online, otherwise set it to 0
    const firstUp = (firstOnline === true) ? fetchMonitorUptime(answerOne.monitor) : 0;
    const secondUp = (secondOnline === true) ? fetchMonitorUptime(answerTwo.monitor) : 0;
```
The rest of the code will be quite similar to our previous example so we won't explain it in details.
Finally, we get:
```typescript
const answerOne = {
    answer: 'first.myanswer.net',
    monitor: 593 as TMonitor
}; // 'first' answer and its monitor
const answerTwo = {
    answer: 'second.myanswer.net',
    monitor: 594 as TMonitor
}; // 'second' answer and its monitor

async function onRequest(req: IRequest, res: IResponse) {
    // check if Monitors are online
    const firstOnline = isMonitorOnline(answerOne.monitor);
    const secondOnline = isMonitorOnline(answerTwo.monitor);
    
    // get Monitor Uptime values if Monitors are online, otherwise set it to 0
    const firstUp = (firstOnline === true) ? fetchMonitorUptime(answerOne.monitor) : 0;
    const secondUp = (secondOnline === true) ? fetchMonitorUptime(answerTwo.monitor) : 0;

    // if Uptime values are equal - return random answer
    if(firstUp == secondUp) {
        const answers = [answerOne.answer, answerTwo.answer]; // form answers array
        const randomAnswer = answers[Math.floor(Math.random()*answers.length)];
        res.setAddr(randomAnswer);
        return;
    }

    // get answer based on higher uptime
    const answer = (firstUp > secondUp) ? answerOne.answer : answerTwo.answer;

    res.setAddr(answer); // return answer
    return;
}
```
Here we go!

And we get either:
```
;; ANSWER SECTION:
testcustom.0b62ec.flexbalancer.net. 10 IN CNAME first.myanswer.net.
```
or
```
;; ANSWER SECTION:
testcustom.0b62ec.flexbalancer.net. 10 IN CNAME second.myanswer.net.
```
depending on Monitor Uptimes.

Let's take a look at a little bit more complicated case.

## Different answers for different countries. <a name="diffcountries"></a>

Imagine that you have three different 'addresses' for the US, France and Ukraine. Those are 'us.myanswers.net', 'fr.myanswers.net' and 'ua.myanswers.net'. And you want to use country-based answer depending on location user came from.

Our `Request` already can handle user locations:

```typescript
readonly location: {
    ...
    country?: TCountry;
    ...
};
```

And TCountry is the list of countries ISO-codes (can be found at [ISO codes on Wikipedia](http://en.wikipedia.org/wiki/ISO_3166-1_alpha-2#Officially_assigned_code_elements)).

```typescript
declare type TCountry = 'DZ' | 'AO' | 'BJ' | 'BW' | 'BF' ...  'PR' | 'GU';
```

First of all, let's create array of country objects

```typescript
const countries = [
    {
        iso: 'FR', // country ISO code
        answer: 'fr.myanswers.net', // answer 'addr'
        ttl: 10 // answer 'ttl'
    },
    {
        iso: 'UA',
        answer: 'ua.myanswers.net',
        ttl: 11
    },
    {
        iso: 'US',
        answer: 'us.myanswers.net',
        ttl: 12
    }
];
```

Let's set default response first, it will be used if user country is not in that countries list created above:

```typescript
async function onRequest(req: IRequest, res: IResponse) {
    res.setAddr('answer.othercountries.net');
    res.setTTL(15);
    ...
}
```

So let's check & process the case when `country` is empty, does not have any value at `req`, and it will return default response:

```typescript
async function onRequest(req: IRequest, res: IResponse) {
    res.setAddr('answer.othercountries.net');
    res.setTTL(15);

    if (!req.location.country) { // unable to determine user country or it is empty
        return;
    }
    ...
}
```

Then, let's cycle through our country objects and if user country matches any of our listed countries - set appropriate answer.

```typescript
async function onRequest(req: IRequest, res: IResponse) {
    res.setAddr('answer.othercountries.net'); // Set default addr
    res.setTTL(15); // And default TTL

    if (!req.location.country) { // If no country at request
        return; // Use default answer
    }
    
    for (let country of countries) {
        if(req.location.country == country.iso) { // If user country matches one of ours
            res.setAddr(country.answer); // Set addr and ttl to response
            res.setTTL(country.ttl);
        }
    }

    return; // Return new res, or default if no country matches
}
```

That's it!

So, now, when we dig our balancer with IP from France - we get:
```
;; ANSWER SECTION:
testcustom.0b62ec.flexbalancer.net. 10 IN CNAME fr.myanswers.net.
```
with the US IP:
```
;; ANSWER SECTION:
testcustom.0b62ec.flexbalancer.net. 12 IN CNAME us.myanswers.net.
```
with IP from Ukraine:
```
;; ANSWER SECTION:
testcustom.0b62ec.flexbalancer.net. 11 IN CNAME ua.myanswers.net.
```
And if we use, for example. Australian IP (that is not in the list) we get default answer:
```
;; ANSWER SECTION:
testcustom.0b62ec.flexbalancer.net. 15 IN CNAME answer.othercountries.net.
```
Works great!

## Countries based answers with random selection. <a name="countrieswithrandom"></a>

Now, let's create more complicated answer. This is modified and simplified (with Monitors removed) version of one of our sample scripts (also available at our repository).

The goal is to have two possible answers (candidates) for each country from our list and randomly select one of them if user country matches with any country from our list (we use the same countries: France, the US and Ukraine). And if no matches - return default `answer.othercountries.net` addr.

Let's create configuration for countries:
```typescript
const configuration = {
    providers: [
        {
            name: 'us1', // candidate name
            cname: 'usone.myanswers.com', // cname to pick for 'addr'
        },
        {
            name: 'us2',
            cname: 'ustwo.myanswers.com',
        },
        {
            name: 'fr1',
            cname: 'frone.myanswers.com',
        },
        {
            name: 'fr2',
            cname: 'frtwo.myanswers.com'
        },
        {
            name: 'ua1',
            cname: 'uaone.myanswers.com'
        },
        {
            name: 'ua2',
            cname: 'uatwo.myanswers.com'
        }
    ],
    countriesAnswersSets: { // lists of candidates-answers per country 
        'FR': ['fr1', 'fr2'],
        'US': ['us1', 'us2'],
        'UA': ['ua1', 'ua2']
    },
    defaultTtl: 20, // we'll use the same TTL everywhere
};
```

So, answer, for example, for France should be randomly picked one from `frone.myanswers.com` and `frtwo.myanswers.com`.
Let's define function for random selection:
```typescript
/**
 * Pick random item from array of items
 */
const getRandomElement = <T>(items: T[]): T => {
    return items[Math.floor(Math.random() * items.length)];
};
```
Now it is **onRequest** time! First of all let's parse our configuration and determine user country:
```typescript
async function onRequest(req: IRequest, res: IResponse) {
    const {countriesAnswersSets, providers, defaultTtl} = configuration; // Parse config
    
    let requestCountry = req.location.country as TCountry; // Get user country
    ...
}
```
Now, let's find if user country matches any of those listed in our configuration:
```typescript
async function onRequest(req: IRequest, res: IResponse) {
    ...
    // Check if user country was detected and we have it in list
    if (requestCountry && countriesAnswersSets[requestCountry]) {
        // Pick our candidate addrs and check if those also are proper candidates
        let geoFilteredCandidates = providers.filter(
            (provider) => countriesAnswersSets[requestCountry].includes(provider.name)
        );
        // If we get proper candidates list for particullar country- let's select one of them randomly
        if (geoFilteredCandidates.length) {
            res.setAddr(getRandomElement(geoFilteredCandidates).cname);
            res.setTTL(defaultTtl);
            return;
        }
    }
    ...
}
``` 
And if we have user with country not listed at our configuration - we should return default answer:
```typescript
async function onRequest(req: IRequest, res: IResponse) {
    ...
    res.setAddr('answer.othercountries.net');
    res.setTTL(defaultTtl);
    return;
}
```
We are done, here is our script :
```typescript
const configuration = {
    providers: [
        {
            name: 'us1', // candidate name
            cname: 'usone.myanswers.com', // cname to pick for 'addr'
        },
        {
            name: 'us2',
            cname: 'ustwo.myanswers.com',
        },
        {
            name: 'fr1',
            cname: 'frone.myanswers.com',
        },
        {
            name: 'fr2',
            cname: 'frtwo.myanswers.com'
        },
        {
            name: 'ua1',
            cname: 'uaone.myanswers.com'
        },
        {
            name: 'ua2',
            cname: 'uatwo.myanswers.com'
        }
    ],
    countriesAnswersSets: { // lists of candidates-answers per country 
        'FR': ['fr1', 'fr2'],
        'US': ['us1', 'us2'],
        'UA': ['ua1', 'ua2']
    },
    defaultTtl: 20, // we'll use the same TTL
};

/**
 * Pick random item from array of items
 */
const getRandomElement = <T>(items: T[]): T => {
    return items[Math.floor(Math.random() * items.length)];
};

async function onRequest(req: IRequest, res: IResponse) {
    const {countriesAnswersSets, providers, defaultTtl} = configuration; // Parse config
    
    let requestCountry = req.location.country as TCountry; // Get user country
    
    // Check if user country was detected and we have it at our list
    if (requestCountry && countriesAnswersSets[requestCountry]) {
        // Pick our candidate addrs and check that those are proper candidates
        let geoFilteredCandidates = providers.filter(
            (provider) => countriesAnswersSets[requestCountry].includes(provider.name)
        );
        // If we get proper candidates list for particular country- let's select one of them randomly
        if (geoFilteredCandidates.length) {
            res.setAddr(getRandomElement(geoFilteredCandidates).cname);
            res.setTTL(defaultTtl);
            return;
        }
    }
    res.setAddr('answer.othercountries.net');
    res.setTTL(defaultTtl);
    return;
}
```
So, now if we dig our balancer with French IP we randomly get either:
```
;; ANSWER SECTION:
testcustom.0b62ec.flexbalancer.net. 20 IN CNAME frtwo.myanswers.com.
```
or
```
;; ANSWER SECTION:
testcustom.0b62ec.flexbalancer.net. 20 IN CNAME frone.myanswers.com.
```
For the US:
```
;; ANSWER SECTION:
testcustom.0b62ec.flexbalancer.net. 20 IN CNAME usone.myanswers.com.
```
```
;; ANSWER SECTION:
testcustom.0b62ec.flexbalancer.net. 20 IN CNAME ustwo.myanswers.com.
```
And for Ukraine those are:
```
;; ANSWER SECTION:
testcustom.0b62ec.flexbalancer.net. 20 IN CNAME uatwo.myanswers.com.
```
```
;; ANSWER SECTION:
testcustom.0b62ec.flexbalancer.net. 20 IN CNAME uaone.myanswers.com.
```
Congratulations! Everything works fine!

As we have mentioned - the last script was simplified version of one of our sample scripts, that are available at our repository. Feel free to investigate!

## Good Luck!!!
