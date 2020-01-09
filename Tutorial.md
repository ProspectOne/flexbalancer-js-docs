# Writing code of your Custom FlexBalancer Answer.

* [Lesson 1: Check if the user ip is at the specific range.](#specificrange)
* [Lesson 2: City Lookup based answer.](#citybased)
* [Lesson 3: The ASN Lookup usage.](#asnbased)
* [Lesson 4: Choice based on the CDN RUM uptime.](#cdnuptime)
* [Lesson 5: CDN RUM performance based choice.](#cdnperformance)
* [Lesson 6: The answer based on Uptime Monitors.](#monuptime)
* [Lesson 7: The simple country-based answer.](#countrysimple)
* [Lesson 8: Different answers for different countries.](#diffcountries)
* [Lesson 9: Countries based answers with random selection.](#countrieswithrandom)

First of all, couple of words regarding the script structure. All main Custom Answer logic is placed inside the 'Main' function `onRequest`. It has two params: `req` (Request) and `res` (Response). 

* **req** (Request) - provides you with all available information regarding user request.
* **res** (Response) - helps you to form the specific answer, has `setAddr` and `setTTL` methods for that.

Our types, interfaces and functions are described here: [[Custom-Answers-API|Custom-Answers-API]] 

## Lesson 1: Check if the user ip is at the specific range. <a name="specificrange"></a>

First of all, let's create the simpliest answer. It will check the user ip and if it is in specific range - return `answer.formyiprange.net` with TTL 10. If it is not - return `answer.otherranges.net` with TTL 15.

We have the user IP at our IRequest interface:

```typescript
    ...
    readonly ip: TIp;
    ...
```

So log in, proceed to the FlexBalancers page, add new FlexBalancer with the Custom answer, set a fallback (we just made it as `fallback.mydomain.com`) and you will be redirected to the Editing page. Flex creations and management is described at our 'Quick Start` Document - you may want to take a look at that: [[Quick Start|Quick-Start]] 

Let's set up some IP ranges for specific answer:

```typescript
const ipFrom = '134.249.200.0';
const ipTo = '134.249.250.0';
```

Let's presume that our current ip is at that range, so it should be processed by custom answer. You can use your own IP with own range, just be sure that your IP is in that range.

So let's edit our 'onRequest' logic. We will use our predefined **isIpInRange(ip: TIp, startIp: TIp, endIp: TIp):boolean** function, you can find out more about it at [Custom Answers API](Custom-Answers-API#isipinrange): 

```typescript
function onRequest(req: IRequest, res: IResponse) {
    if (isIpInRange(req.ip, ipFrom, ipTo) === true) { // Check if IP is in range
        res.setAddr('answer.formyiprange.net'); // Set 'addr' for answer
        res.setTTL(10); // Set TTL

        return;
    }
}
```

And if the user IP is not at that range it should return `answer.otherranges.net` with TTL 15:

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

function onRequest(req: IRequest, res: IResponse) {
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

Now press the `Test and Publish` Button. This **is important** otherwise nothing will work.

And now when we dig our balancer with the IP address inside that range, we get:
```
;; ANSWER SECTION:
testcustom.0b62ec.flexbalancer.net. 10 IN CNAME answer.formyiprange.net.
```

and if we are using another IP that is not in the predefined range we get
```
;; ANSWER SECTION:
testcustom.0b62ec.flexbalancer.net. 15 IN CNAME answer.otherranges.net.
```

Pretty simple, isn't it?

## Lesson 2: City Lookup based answer. <a name="citybased">

We provide useful set of `lookup-type` functions - those can get user location information based on the user IP.

For example, you want to assign specific answer for all users at 100km radius from `Amsterdam`. From [MaxMind GeoLite2 Databases](https://dev.maxmind.com/geoip/geoip2/geolite2/) we get the `Amsterdam` geoname ID and it is equal to `2759794`.

Our `lookup` functions can be used with `ip` as a single parameter and also accept additional parameters:
```typescript
lookupCity(ip: string) // We won't need this now. And in most cases we have that info at req.location.city
...
lookupCity(ip: string, target: number, threshold: number) // This is one we need
```
You can find out more information in our documentation [Custom Answers API](Custom-Answers-API#lookupcity)

First let's define the city and the answers:
```typescript
const cityToCheckGeoNameId = 2759794; // our city geoname ID
const cityToCheckAnswer = 'amsterdam.myanswer.net'; // answer for that city
const distanceThreshold = 100; // 100 km radius
const defaultAnswer = 'othercity.myanswer.net'; // answer for other cities
```
We will use `lookupCity` function three arguments (user IP, city geoname ID and threshold), that returns `bool` result.

Now we implement the simple logic:
```typescript
    const userInRadius = lookupCity(req.ip, cityToCheckGeoNameId, distanceThreshold);
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

function onRequest(req: IRequest, res: IResponse) {
    const userInRadius = lookupCity(req.ip, cityToCheckGeoNameId, distanceThreshold);
    if(userInRadius  === true) { // 'yes', user is in 100km from Amsterdam
        res.setAddr(cityToCheckAnswer); // set answer for Amsterdam
        return;
    }
    res.setAddr(defaultAnswer); // It is not Amsterdam, return answer for other cities
    return;
}
```

And our tests show us expected answer:
```
;; ANSWER SECTION:
testcustom.0b62ec.flexbalancer.net. 10 IN CNAME amsterdam.myanswer.net.
```

## Lesson 3: The ASN Lookup usage. <a name="asnbased">

Another `lookup` function that we provide is `lookupAsn` (more info at [Custom Answers API](Custom-Answers-API#lookupasn)), that returns info regarding the [Autonomous System Number](#https://en.wikipedia.org/wiki/Autonomous_system_(Internet)) of the IP provided:
```typescript
declare interface IAsnResponse {
    readonly autonomousSystemNumber: number;
    readonly autonomousSystemOrganization: string;
}
```
The simple case - if the user IP has the ASN `20473` - the answer should be `20473answer.myanswers.net` with the TTL `20` and if it is not - should return the `fallback` (remember, we have made it as `fallback.mydomain.com` with the TTL `10`).
Ok, our constants will be:
```typescript
const asnToCheck = 20473;
const asnAnswer = '20473answer.myanswers.net';
const asnTTL = 20;
```
And the whole code will be really simple:
```typescript
const asnToCheck = 20473;
const asnAnswer = '20473answer.myanswers.net';
const asnTTL = 20;

function onRequest(req: IRequest, res: IResponse) {
    let asnInfo = lookupAsn(req.ip);
    if(asnInfo && asnInfo.autonomousSystemNumber == asnToCheck) {
        res.setAddr(asnAnswer);
        res.setTTL(asnTTL);
    }
    return; // either asn related data or fallback 
}
```
Let's check how our script works:
For IPs with the ASN Number equal to `20473`:
```
;; ANSWER SECTION:
testcustom1.0b62ec.flexbalancer.net. 20 IN CNAME 20473answer.myanswers.net.
```
For other IPs:
```
;; ANSWER SECTION:
testcustom1.0b62ec.flexbalancer.net. 10 IN CNAME fallback.mydomain.com.
```
Great, we've done it.

## Lesson 4: Choice based on the CDN RUM uptime. <a name="cdnuptime">

Let's imagine that you have two answers hosted on two different CDN providers: `jsdelivr.myanswer.net` and `googlecloud.myanswer.net`.

[CDNPerf](#https://www.cdnperf.com/) provides the CDN Uptime value, based on the RUM (Real User Metrics) data from users all over the world. You want to check that Uptimes for the last hour and return answer from CDN with better uptime. And if uptimes are equal - return random answer. 

First, let make an array of our answers:
```typescript
const answers = [
    'jsdelivr.myanswer.net',
    'googlecloud.myanswer.net'
];
```
Then, get the CDN Uptime values, using `fetchCdnRumUptime` function, provided by our [Custom Answers API](Custom-Answers-API#fetchcdnrumuptime) (it returns CDN provider uptime for the last hour):
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
And if those are not equal - return answer from the CDN with better uptime:
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

function onRequest(req: IRequest, res: IResponse) {
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
depending on the best CDN uptime.

## Lesson 5: CDN RUM performance based choice. <a name="cdnperformance">

[CDNPerf](#https://www.cdnperf.com/) also provides the CDN Performance value, also based on the Real User Metrics data collected from users all over the world. So you can use that performance as the criteria.

The code is very similar to the previous one - let's just focus on differences. [Custom Answers API](Custom-Answers-API#fetchcdnrumperformance) provides `fetchCdnRumPerformance` function (that returns CDN provider performance for the last hour), all we need is to modify the code of the previous lesson:

```typescript
    // get Performance values
    const jsDelivrPerf = fetchCdnRumPerformance('jsdelivr-cdn');
    const googleCloudPerf = fetchCdnRumPerformance('google-cloud-cdn');
```
If the performances are not equal - we return answer from the CDN with faster performance. This is quite opposite to Uptime - the bigger Uptime is - the better and the lower Performance value is (query speed in milliseconds) - the faster query speed is:
```typescript
    // get answer based on faster performance
    const answer = (jsDelivrPerf < googleCloudUp) ? answers[0] : answers[1];

    res.setAddr(answer); // return answer
    return;
```
As the result, we get our script:
```typescript
const answers = [
    'jsdelivr.myanswer.net',
    'googlecloud.myanswer.net'
];

function onRequest(req: IRequest, res: IResponse) {
    // get Performance values
    const jsDelivrPerf = fetchCdnRumPerformance('jsdelivr-cdn');
    const googleCloudPerf = fetchCdnRumPerformance('google-cloud-cdn');

    // if query speeds are equal - return random answer
    if(jsDelivrPerf == googleCloudPerf) {
        const randomAnswer = answers[Math.floor(Math.random()*answers.length)];
        res.setAddr(randomAnswer);
        return;
    }

    // get answer based on faster performance
    const answer = (jsDelivrPerf < googleCloudUp) ? answers[0] : answers[1];

    res.setAddr(answer); // return answer
    return;
}
```

So we get either:
```
;; ANSWER SECTION:
testcustom.0b62ec.flexbalancer.net. 10 IN CNAME jsdelivr.myanswer.net.
```
or
```
;; ANSWER SECTION:
testcustom.0b62ec.flexbalancer.net. 10 IN CNAME googlecloud.myanswer.net.
```
depending on the faster CDN performance.

There is another way to perform balancing based on `Uptime`, let's take `Monitors-based` example.

## Lesson 6: The answer based on Uptime Monitors. <a name="monuptime">
[PerfOps](https://perfops.net/) provides Monitor Uptime feature that allows you to set monitor to each of your answers and use that uptime statistics for balancing. Let's use that statistics in our example.

Each monitor has its own ID, that is listed at ['Monitors page'](https://panel.perfops.net/monitors). In our example case that IDs are `593` for the `first.myanswer.net` and `594` for the `second.myanswer.net`.

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
Notice, that the Monitor IDs must be of `TMonitor` type:
```typescript
declare type TMonitor = 593 | 594; // your monitor IDs
```
And we are going to use our *fetchMonitorUptime(monitor: TMonitor)* and *isMonitorOnline(monitor: TMonitor)* functions, described at [Custom Answers API](Custom-Answers-API#fetchmonitoruptime).

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

function onRequest(req: IRequest, res: IResponse) {
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
depending on our Monitor Uptimes.

## Lesson 7: The simple country-based answer. <a name="countrysimple"></a>

In some cases you may want to 'tie up' your custom answer to the particular country the user request came from, or exclude some countries and make special answers for them. 

For example, you want to have the answer `countries.myanswers.net` for all countries, but you want to have special answer `us.myanswers.net` for the US. And if the user country is not detected - use the fallback.

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
We need the USA ISO code - 'US'. Let's define our constants:
```typescript
const allCountriesAnswer = 'countries.myanswers.net';
const specCountryIso = 'US';
const specCountryAnswer = 'us.myanswers.net'; // the answer for the US
```
And start our logical process:
```typescript
    if(!req.location.country) {
        return; // Country is not detected -> fallback
    }
```
That means the user request does not have any information regarding the country. Fine, we use fallback.
If it has the country info - let's check it is not the US and return `common` answer:
```typescript
    if(req.location.country != specCountryIso) {
        res.setAddr(allCountriesAnswer); // any country but the USA
        return;
    }
```
And, finally - the US answer:
```typescript
    res.setAddr(specCountryAnswer); // the US answer
    return;
```

So, our script code will look like:
```typescript
const allCountriesAnswer = 'countries.myanswers.net';
const specCountryIso = 'US';
const specCountryAnswer = 'us.myanswers.net'; // the answer for the US

function onRequest(req: IRequest, res: IResponse) {
    if(!req.location.country) {
        return; // Country is not detected -> fallback
    }

    if(req.location.country != specCountryIso) {
        res.setAddr(allCountriesAnswer); // any country but the USA
        return;
    }

    res.setAddr(specCountryAnswer); // the US answer
    return;
}
```

Let's check it. For every country but the US we get:
```
;; ANSWER SECTION:
testcustom1.0b62ec.flexbalancer.net. 10 IN CNAME countries.myanswers.net.
```
And for the USA:
```
;; ANSWER SECTION:
testcustom1.0b62ec.flexbalancer.net. 10 IN CNAME us.myanswers.net.
```
And if no country detected:
```
;; ANSWER SECTION:
testcustom1.0b62ec.flexbalancer.net. 10 IN CNAME fallback.mydomain.com.
```

Let's take a look at a little bit more complicated case.

## Lesson 8: Different answers for different countries. <a name="diffcountries"></a>

Imagine that you have three different 'addresses' for the US, France and Ukraine. Those are 'us.myanswers.net', 'fr.myanswers.net' and 'ua.myanswers.net'. And you want to use country-based answer depending on location user came from.

First of all, let's create the array of country objects

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

Let's set the default response first, it will be used if the user country is not in that countries list created above:

```typescript
function onRequest(req: IRequest, res: IResponse) {
    res.setAddr('answer.othercountries.net');
    res.setTTL(15);
    ...
}
```

So let's check & process the case when `country` is empty, does not have any value at `req`, so it will return default response:

```typescript
function onRequest(req: IRequest, res: IResponse) {
    res.setAddr('answer.othercountries.net');
    res.setTTL(15);

    if (!req.location.country) { // unable to determine user country or it is empty
        return;
    }
    ...
}
```

Then, let's cycle through our country objects and if the user country matches any of our listed countries - set the appropriate answer.

```typescript
function onRequest(req: IRequest, res: IResponse) {
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
with the IP from Ukraine:
```
;; ANSWER SECTION:
testcustom.0b62ec.flexbalancer.net. 11 IN CNAME ua.myanswers.net.
```
And if we use, for example, Australian IP (that is not in the list) we get the default answer:
```
;; ANSWER SECTION:
testcustom.0b62ec.flexbalancer.net. 15 IN CNAME answer.othercountries.net.
```
Works great!

## Lesson 9: Countries based answers with random selection. <a name="countrieswithrandom"></a>

Now, let's create more complicated answer. This is modified and simplified (with Monitors removed) version of one of our sample scripts (also available at our repository). In this script we will use the recommended script structure, described at [Basic Structure.](Advanced-Use-Cases#basic-structure). You will see this structure if you take a look at our [Advanced Use Cases](Advanced-Use-Cases#basic-structure) or [Migration Solutions](Migration-Solutions) sections.  

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

So, the answer, for example, for France, should be randomly picked one from `frone.myanswers.com` and `frtwo.myanswers.com`.
Let's define function for random selection:
```typescript
/**
 * Pick random item from array of items
 */
const getRandomElement = <T>(items: T[]): T => {
    return items[Math.floor(Math.random() * items.length)];
};
```
Now it is **onRequest** time! First of all let's parse our configuration and determine the user country:
```typescript
function onRequest(req: IRequest, res: IResponse) {
    const {countriesAnswersSets, providers, defaultTtl} = configuration; // Parse config
    
    let requestCountry = req.location.country as TCountry; // Get user country
    ...
}
```
Now, let's find if the user country matches any of those listed in our configuration:
```typescript
function onRequest(req: IRequest, res: IResponse) {
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
And if we have the user with a country not listed at our configuration - we should return the default answer:
```typescript
function onRequest(req: IRequest, res: IResponse) {
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

function onRequest(req: IRequest, res: IResponse) {
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
So, now if we dig our balancer with the French IP we randomly get either:
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
