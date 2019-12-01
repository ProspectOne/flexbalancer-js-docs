# Writing code of your Custom FlexBalancer Answer.

* [Check if user ip is at specific range.](#specificrange)
* [Different answers for different countries.](#diffcountries)
* [Countries based answers with random selection.](#countrieswithrandom)

First of all - let's take a look at our 'main' asynchronous function `onRequest`. It has two params: `req` (Request) and `res` Response). 

* **req** (Request) - provides you with all available information regarding requesting user.
* **res** (Response) - helps you to form specific answer.

Our types, interfaces and functions are described here: [[Custom-Answers-API|Custom-Answers-API]] 

## Check if user ip is at specific range. <a name="specificrange"></a>

First of all let's create the simpliest answer. It will check user ip and if it is at specific range - return `answer.formyiprange.net` with TTL 10. If it does not - return `answer.otherranges.net` with TTL 15.

We have user IP at our IRequest interface:

```typescript
    ...
    readonly ip: TIp;
    ...
```

So log in, proceed to FlexBalancers page, add new FlexBalancer with Custom answer, set fallback (I just made it as `fallback.mydomain.com` with TTL 10) and you will be redirected to Editing page. Flex creations and management is described at our 'Quick Start` Document - you may want to take a look at that: [[Quick Start|Quick-Start]] 

Let's set up IP ranges for specific answer:

```typescript
const ipFrom = '134.249.200.0';
const ipTo = '134.249.250.0';
```

Let's presume that our current ip is at that range, so it should be processed by custom answer.

So let's edit our 'onRequest' logic. We will use our predefined **isIpInRange(ip: TIp, startIp: TIp, endIp: TIp):boolean** function: 

```typescript
async function onRequest(req: IRequest, res: IResponse) {
    if (isIpInRange(req.ip, ipFrom, ipTo) === true) {
        res.addr = 'answer.formyiprange.net';
        res.ttl = 10;

        return res;
    }
}
```

And if IP is not at that range:

```typescript
    ...
    }
    res.addr = 'answer.otherranges.net';
    res.ttl = 15;

    return res;
}
``` 

So finally, our answer looks like:

```typescript
const ipFrom = '134.249.200.0';
const ipTo = '134.249.250.0';

async function onRequest(req: IRequest, res: IResponse) {
    if (isIpInRange(req.ip, ipFrom, ipTo) === true) {
        res.addr = 'answer.formyiprange.net';
        res.ttl = 10;

        return res;
    }
    res.addr = 'answer.otherranges.net';
    res.ttl = 15;

    return res;
}
```

Now press `Test and Publish` Button. This **is important** otherwise nothing will work.

And now when I dig my balancer with IP address inside that range, I get:
```
;; ANSWER SECTION:
testcustom.0b62ec.flexbalancer.net. 10 IN CNAME answer.formyiprange.net.
```

and if I am using another IP that does not fit predefined range I get
```
;; ANSWER SECTION:
testcustom.0b62ec.flexbalancer.net. 15 IN CNAME answer.otherranges.net.
```

Pretty simple, isn't it?

Let's take a look at a little bit more complicated case.

## Different answers for different countries. <a name="diffcountries"></a>

Imagine that you have three different addresses for the US, France and Ukraine. Those are 'us.myanswers.net', 'fr.myanswers.net' and 'ua.myanswers.net'. And you want to use country-based answer depending on location user came from.

Our request already can handle user locations:

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
        iso: 'FR',
        answer: 'fr.myanswers.net',
        ttl: 10
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

Let's set default response first:

```typescript
async function onRequest(req: IRequest, res: IResponse) {
    res.addr = 'answer.othercountries.net';
    res.ttl = 15;
    ...
}
```

And check & process the case when `country` does not have any value at `req`, so we will just return default response:

```typescript
async function onRequest(req: IRequest, res: IResponse) {
    res.addr = 'answer.othercountries.net';
    res.ttl = 15;

    if (!req.location.country) {
        return res;
    }
    ...
}
```

Then, let's cycle through our country object and if user country matches any of 'our' countries - set appropriate answer.

```typescript
async function onRequest(req: IRequest, res: IResponse) {
    res.addr = 'answer.othercountries.net'; // Set default addr
    res.ttl = 15; // And default TTL

    if (!req.location.country) { // If no country at request
        return res; // Use default answer
    }
    
    for (let country of countries) {
        if(req.location.country == country.iso) { // If user country matches one of ours
            res.addr = country.answer; // Set addr and ttl to response
            res.ttl = country.ttl;
        }
    }

    return res; // Return new res, or default if no country matches
}
```

That's it!

So, now, when I dig my balancer with IP from France - I get:
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
And if I use Australian IP I get default answer:
```
;; ANSWER SECTION:
testcustom.0b62ec.flexbalancer.net. 15 IN CNAME answer.othercountries.net.
```
Works great!

## Countries based answers with random selection. <a name="countrieswithrandom"></a>

Now, let's create more complicated answer. This will be modified and simplified (with Monitors removed) version of one of our sample scripts (also available at our repository).

The goal is to have two possible answers (casndidates) for each country from our list and randomly select one of them if user country matches with our list countries (France, the US or Ukraine).

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
    defaultTtl: 20, // we'll use one TTL
};
```

So, answer, for example, for France should be randomly picked one from `frone.myanswers.com` and `frtwo.myanswers.com`.
Let's create function for random selection:
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
Now, let's find if user country matches any of those at our list:
```typescript
async function onRequest(req: IRequest, res: IResponse) {
    ...
    // Check if user country was detected and we have it at our list
    if (requestCountry && countriesAnswersSets[requestCountry]) {
        // Choose our candidate addrs and those also are proper candidates
        let geoFilteredCandidates = providers.filter(
            (provider) => countriesAnswersSets[requestCountry].includes(provider.name)
        );
        // If we get proper candidates list for particullar country- let's select one of them randomly
        if (geoFilteredCandidates.length) {
            return {
                addr: getRandomElement(geoFilteredCandidates).cname,
                ttl: defaultTtl
            }
        }
    }
    ...
}
``` 
And if we have user with country not listed at our configuration - we should return default answer:
```typescript
async function onRequest(req: IRequest, res: IResponse) {
    ...
    return {
        addr: 'answer.othercountries.net',
        ttl: defaultTtl
    };
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
    defaultTtl: 20, // we'll use one TTL
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
        // Choose our candidate addrs and those also are proper candidates
        let geoFilteredCandidates = providers.filter(
            (provider) => countriesAnswersSets[requestCountry].includes(provider.name)
        );
        // If we get proper candidates list for particullar country- let's select one of them randomly
        if (geoFilteredCandidates.length) {
            return {
                addr: getRandomElement(geoFilteredCandidates).cname,
                ttl: defaultTtl
            }
        }
    }
    return {
        addr: 'answer.othercountries.net',
        ttl: defaultTtl
    };
}
```
So, now if I dig my balancer with French IP I randomly get either:
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
 