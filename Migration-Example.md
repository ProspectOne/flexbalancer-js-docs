# The Performance-Based Answer with Preferred Market Weights
## The Case
We have a set of answers with CDN providers. Each provider in our set has special `ratio` number for every continent, that determines the location penalties / boosts for that particular provider. For example, we want the users from Europe get preferred (so appear more oftenly) answer from `CDN provider 1`, and users from South America should preferrably get answer from `CDN Provider 2`.

Here goes the `original` Cedexis Openmix Application script:

```javascript
/**
 * Sample based on Openmix
 */
var handler = new OpenmixApplication({
    providers: {
        'custom_defined_measured_cdn': {
            cname: 'www.custom-cdn.com',
            preferred_markets: {
                'EU': 1.00, // penalties / boosts ratio per continent
                'NA': 1.00,
                'SA': 1.00,
                'AF': 1.00,
                'AS': 1.00,
                'OC': 1.00,
            }
        },
        'jsdelivr': {
            cname: 'www.foo.com',
            preferred_markets: {
                'EU': 1.40,
                'NA': 1.00,
                'SA': 0.10,
                'AF': 1.00,
                'AS': 1.30,
                'OC': 1.00,
            }
        },
        'stackpath': {
            cname: 'www.bar.com',
            preferred_markets: {
                'EU': 0.80,
                'NA': 0.80,
                'SA': 0.50,
                'AF': 0.80,
                'AS': 0.50,
                'OC': 0.80,
            }
        },
        'verizon_edgecast': {
            cname: 'www.baz.com',
            preferred_markets: {
                'EU': 1.00,
                'NA': 1.20,
                'SA': 1.30,
                'AF': 1.00,
                'AS': 1.40,
                'OC': 1.00,
            }
        },
    },
    default_ttl: 300,
    profile: 'rtt'
});
​
function init(config) {
    'use strict';
    handler.do_init(config);
}
​
function onRequest(request, response) {
    'use strict';
    handler.handle_request(request, response);
}
​
/** @constructor */
function OpenmixApplication(settings) {
    'use strict';
​
  var aliases = settings.providers === undefined ? [] : Object.keys(settings.providers);
​
  /**
   * @param {OpenmixConfiguration} config
   */
  this.do_init = function(config) {
      var i = aliases.length;
​
    while (i --) {
        config.requireProvider(aliases[i]);
    }
  };
​
  /**
   * @param {OpenmixRequest} request
   * @param {OpenmixResponse} response
   */
  this.handle_request = function(request, response) {
      var dataKbps = request.getProbe('http_kbps'),
          dataRtt = request.getProbe('http_rtt'),
          market = request.market,
          allReasons,
          decisionProvider,
          decisionReason = '',
          candidateAliases,
          profiles,
          totalScore,
          scoreInformation = {};
​
    profiles = {
        rtt: {
            http_rtt: 1.9,
            http_kbps: 0.1
        }
    };
​
    allReasons = {
        most_points: 'A',
        data_problem: 'B',
        all_providers_eliminated: 'C'
    };
​
    /**
     * @param data
     * @param property
     * @param preferLower
     */
    function rankPlatforms(data, property, preferLower) {
        var maxPoints = 1000,
            min = getLowestValue(data, property),
            max = getHighestValue(data, property),
            score = {},
            keys = Object.keys(data),
            key,
            i = keys.length;
​
        if (preferLower) {
            while (i --) {
                key = keys[i];
                if (data[key][property] > 0) {
                    score[key] = Math.floor((min / data[key][property]) * maxPoints);
                    score[key] *= profiles[settings.profile][property];
                } else {
                    score[key] = 0;
                }
​
            }
        } else {
            while (i --) {
                key = keys[i];
                if (max > 0) {
                    score[key] = Math.floor((data[key][property] / max) * maxPoints);
                    score[key] *= profiles[settings.profile][property];
                } else {
                    score[key] = 0;
                }
​
            }
        }
        return score;
    }
​
    /**
     * @param candidateAliases
     * @param scoreInformation
     */
    function calculateTotalScore(candidateAliases, scoreInformation) {

        var totalScore = {},
            key,
            i = candidateAliases.length,
            subKeys,
            subKey,
            j;
​
      while (i --) {
          key = candidateAliases[i];
          totalScore[key] = 0;
          subKeys = Object.keys(scoreInformation);
          j = subKeys.length;
          while (j --) {
              subKey = subKeys[j];
              totalScore[key] += scoreInformation[subKey][key];
          }
          // apply penalties / boosts
          if (settings.providers[key].preferred_markets[market] !== undefined) {
              totalScore[key] = totalScore[key] * settings.providers[key].preferred_markets[market];
          }
      }
        return totalScore;
    }
​
    candidateAliases = aliases.slice();

    candidateAliases = intersectObjects(
        intersectObjects(candidateAliases, dataRtt),
        dataKbps
    );
​
    if (candidateAliases.length === 0) {
        // process the fallback
        decisionProvider = aliases[Math.floor(Math.random() * aliases.length)];
        decisionReason = allReasons.all_providers_eliminated;
    } else {
        // prepare the metrics
        scoreInformation.rtt = rankPlatforms(dataRtt, 'http_rtt', true);
        scoreInformation.kbps = rankPlatforms(dataKbps, 'http_kbps', false);
​
        // Get the total score and apply pricing penalties / boosts
        totalScore = calculateTotalScore(candidateAliases, scoreInformation);
​
        // find the highest scored CDN
        if (Object.keys(totalScore).length > 0) {
            decisionProvider = getHighest(totalScore);
            decisionReason = allReasons.most_points;
        }
    }
​
      // if no decision - use the fallback
      if (decisionProvider === undefined) {
          decisionProvider = aliases[Math.floor(Math.random() * aliases.length)];
          decisionReason = allReasons.data_problem;
      }
​
    response.respond(decisionProvider, settings.providers[decisionProvider].cname);
      response.setTTL(settings.default_ttl);
      response.setReasonCode(decisionReason);
  };
​
  /**
   * @param {!Object} target
   * @param {Object} source
   */
  function intersectObjects(target, source) {
      var i = target.length,
          key;
      while (i --) {
          key = target[i];
          if (source[key] === undefined) {
              target.splice(i, 1);
          }
      }
      return target;
  }
​
  /**
   * @param {!Object} source
   * @param {string} property
   */
  function getLowestValue(source, property) {
      var keys = Object.keys(source),
          i = keys.length,
          key,
          min = Infinity,
          value;
      while (i --) {
          key = keys[i];
          value = source[key][property];
          if (value < min) {
              min = value;
          }
      }
      return min;
  }
​
  /**
   * @param {!Object} source
   */
  function getHighest(source) {
      var keys = Object.keys(source),
          i = keys.length,
          key,
          candidate,
          max = -Infinity,
          value;
​
    while (i --) {
        key = keys[i];
        value = source[key];
        if (value > max) {
            candidate = key;
            max = value;
        }
    }
​
    return candidate;
  }
​
  /**
   * @param {!Object} source
   * @param {string} property
   */
  function getHighestValue(source, property) {
      var keys = Object.keys(source),
          i = keys.length,
          key,
          max = -Infinity,
          value;
​
    while (i --) {
        key = keys[i];
        value = source[key][property];
        if (value > max) {
            max = value;
        }
    }
​
    return max;
  }
​
}
```
Quite complicated, isn't it?

The important thing to mention is that PerfOps uses quite different from `Openmix getProbe` approach for the performance monitoring. It is based on [Real User Metrics(RUM) data](https://www.cdnperf.com/) collected from users all over the world.

So, our task is to rewrite that script for [fetchCdnRumUptime](Custom-Answers-API#fetchcdnrumuptime) and [fetchCdnRumPerformance](Custom-Answers-API#fetchcdnrumperformance) functionalities provided by [PerfOps Custom Answers](Custom-Answers-API), and use `typescript` syntax. Our script, in fact, will be written from scratch and will be very different from the original one both in logic and syntax. 
 
Let's do it step by step, according to our [Recommended Structure](Basic-Use-Cases#basic-structure) rules. Those are not mandatory, but recommended. 

## Configuration
Let's create our `configuration` using original config. Let's take the `providers list`, `ttl` and `profile` from OpenmixApplication argument:
```javascript
var handler = new OpenmixApplication({
    providers: {
        'custom_defined_measured_cdn': {
            cname: 'www.custom-cdn.com',
            preferred_markets: {
                'EU': 1.00, // penalties / boosts ratio per continent
                'NA': 1.00,
                'SA': 1.00,
                'AF': 1.00,
                'AS': 1.00,
                'OC': 1.00,
            }
        },
        ...
    },
    default_ttl: 300,
    profile: 'rtt'
});
```
We modify the structure by adding 'name' property for our CDN Providers and we use `TCDNProvider` type that contains aliases for all CDN Providers we monitor:
```typescript
    providers: [
        {
         ...
        },
        {   
            name: ('jsdelivr-cdn' as TCDNProvider),
            cname: 'www.foo.com',
            ...
        }
   ...     
```
And find in original script everything that can be moved to configuration. First, we take `profiles`:
```javascript
    profiles = {
        rtt: {
            http_rtt: 1.9,
            http_kbps: 0.1
        }
    };
```
Instead of original `getProbe` we will use [CDN Uptime](https://www.cdnperf.com/#!rum) and [CDN Performance](https://www.cdnperf.com/) data for provider ranking. We do not collect throughput statistics, so we do not need `http_kbps` - we will take `rtt` ratio only - and also define minimum `Uptime` value for a CDN Provider `availabilityThreshold` (`80` means `80% uptime`, for Openmix apps default Availability Threshold it is also `80` ):
```typescript
    profiles: <any>{
        'rtt': 1.9, // rtt (Round Trip Time),
    },
    ...
    availabilityThreshold: 80 // Board value for providers 'Uptime' to compare with
``` 
We have got out `configuration` now!
```typescript
const configuration = {
    /** List of providers configuration */
    providers: [
        {
            name: ('custom_defined_measured_cdn' as TCDNProvider),// CDN Provider alias to work with
            cname: 'www.custom-cdn.com',// cname to pick as a result
            preferredMarkets: {
                'EU': 1.00,
                'NA': 1.00,
                'SA': 1.00,
                'AF': 1.00,
                'AS': 1.00,
                'OC': 1.00,
            }
        },
        {
            name: ('jsdelivr-cdn' as TCDNProvider),
            cname: 'www.foo.com',
            preferredMarkets: {
                'EU': 1.40,
                'NA': 1.00,
                'SA': 0.10,
                'AF': 1.00,
                'AS': 1.30,
                'OC': 1.00,
            }
        },
        {
            name: ('stackpath-cdn' as TCDNProvider),
            cname: 'www.bar.com',
            preferredMarkets: {
                'EU': 0.80,
                'NA': 0.80,
                'SA': 0.50,
                'AF': 0.80,
                'AS': 0.50,
                'OC': 0.80,
            }
        },
        {
            name: ('verizon-edgecast-cdn' as TCDNProvider),
            cname: 'www.baz.com',
            preferredMarkets: {
                'EU': 1.00,
                'NA': 1.20,
                'SA': 1.30,
                'AF': 1.00,
                'AS': 1.40,
                'OC': 1.00,
            }
        },
    ],
    profiles: <any>{
        'rtt': 1.9, // rtt (Round Trip Time),
    },
    defaultProfile: 'rtt',
    defaultTtl: 300, // The DNS TTL to be applied to DNS responses in seconds.
    availabilityThreshold: 80 // Board value for providers 'Uptime' to compare with
};
```
## Functions

As we have mentioned, we do not collect `throughput` statistics, so we don't need `intersectObjects` function at all. We won't need `getLowestValue`, `getHighestValue` as well, we will have one function for highest value from array:
```typescript
/**
 * Pick highest value from given array of numbers
 */
const getHighest = (array: number[]): number => array.indexOf(Math.max(...array));
``` 

And one for random answer for the case of all providers availability is low:
```typescript
/**
 * Pick random element from given array of type
 */
const getRandom = <T>(items:T[]):T =>  items[Math.floor(Math.random() * items.length)];
```
We will also need two functions: `rankPlatforms` and `calculateTotalScore`, but those will be very different from 'original' and we will define them while writing our 'main' `onRequest` function.  

## Main Section
Now, our logic. It will be placed inside 'main' `onRequest` function:
```typescript
function onRequest(request: IRequest, response: IResponse) {
    ...
    return;
}
```
We hope you have already took a look at our [Request and Response interfaces](Custom-Answers-API#interfaces), we will use `request` to determine a user location.

First let's parse our configuration, get the user location, then, filter all providers, removing those with uptime lower than `availabilityThreshold`. We will use [fetchCdnRumUptime](Custom-Answers-API#fetchcdnrumuptime) for uptime data retrieving, if we are able to detect user `continent`(`market`) - we operate with that continent statistics **fetchCdnRumUptime(provider.name, 'continent', continent)** and if not - we take the 'world' data by **fetchCdnRumUptime(provider.name))**:
```typescript
    const { providers, defaultTtl, availabilityThreshold } = configuration;
    const { continent } = request.location;

    // Filter providers by uptime
    const availableProviders = providers.filter(
        (provider) =>
            (continent &&
                fetchCdnRumUptime(provider.name, 'continent', continent) ||
                fetchCdnRumUptime(provider.name)) > availabilityThreshold // uptime data for 60 minutes
    );
```  
If `availableProviders` is empty, so no providers match our criteria - we pick a random one as an answer, remember, we have added the `getRandom` function earlier:
```typescript
    // 'Bad' uptime, return random provider from available.
    if (!availableProviders.length) { // availableProviders
        response.setAddr(getRandom(providers).cname);
        response.setTTL(defaultTtl);
        return;
    }
```
So, if everything is 'bad' - we return a random answer.

In case it goes fine and we have the array of available providers - we get performances for the every available provider, using [fetchCdnRumPerformance](Custom-Answers-API#fetchcdnrumperformance) either for user continent (if it is determined) of for 'world' performance:
```typescript
    // Else create array with performance data for each provider
    const cdnPerformanceData = availableProviders.map(
        (provider) => ({
            provider,
            perf:
                continent &&
                fetchCdnRumPerformance(provider.name, 'continent', continent) ||
                fetchCdnRumPerformance(provider.name)
        })
    );
```
Now, we have the `cdnPerformanceData` array with providers and Real User Metric Performance per provider. Ant it is time to create our `calculateTotalScore` and `rankPlatforms` functions.

Having `cdnPerformanceData`, let's find the best CDN performance (minimal, because the lower response in milliseconds- the better), and calculate rank based on the formula `floor((best_performance / current_cdn_performance) * 1000) * profile_ratio`. In fact, we have the only one `profile`, so could just skip related functionality, but we might need it for future features, so let's keep it. 

Here goes the code:
```typescript
/**
 * Generates rank by performance data
 */
function rankPlatforms(cdnPerformanceData) {
    // Get array of all providers and performance in milliseconds for each one.
    const maxPoints = 1000;
    const min = Math.min(...cdnPerformanceData.map((item) => item.perf));
    const {  profiles, defaultProfile } = configuration;

    return cdnPerformanceData.map((provider): number => {
        if (provider.perf <= 0) { // It won't happen most likely
            return 0;
        }
        const flooredPoints = Math.floor((min / provider.perf) * maxPoints);
        return flooredPoints * profiles[defaultProfile];
    });
}
```
Now we have ranks, let's apply continents(markets)-related penalties or boosts using `preferredMarket` value for particular continent and get the total score:
```typescript
/**
 * Calculate Total Score from given score and data
 */
function calculateTotalScore(
    cdnPerformanceData, // our providers data and performances
    scores: number[], // the ranks array we got with the rankPlatforms function
    continent?: TContinent, // user continent (if detected)
): number[] {
    return cdnPerformanceData.map((provider, index) => {
        let totalScore = scores[index];

        // apply pricing penalties / boosts if user continent is detected
        if (continent && provider.provider.preferredMarkets[continent]) {
            totalScore *= provider.provider.preferredMarkets[continent];
        }

        return totalScore;
    });
}
```
We are done with our functions, let's get back to our `onRequest` section and use our `calculateTotalScore` function to get score per provider:
```typescript
    // Calculate total score
    const totalScores = calculateTotalScore(
        cdnPerformanceData,
        rankPlatforms(cdnPerformanceData),
        request.location.continent
    );
```
And finally - return the best one, using `getHighest` function:
```typescript
    response.setAddr(cdnPerformanceData[getHighest(totalScores)].provider.cname);
    response.setTTL(defaultTtl);
    return;
```
Here we go. **Our script looks like**:
```typescript
// Main configuration
const configuration = {
     /** List of providers configuration */
     providers: [
         {
             name: ('custom_defined_measured_cdn' as TCDNProvider),// CDN Provider alias to work with
             cname: 'www.custom-cdn.com',// cname to pick as a result
             preferredMarkets: {
                 'EU': 1.00,
                 'NA': 1.00,
                 'SA': 1.00,
                 'AF': 1.00,
                 'AS': 1.00,
                 'OC': 1.00,
             }
         },
         {
             name: ('jsdelivr-cdn' as TCDNProvider),
             cname: 'www.foo.com',
             preferredMarkets: {
                 'EU': 1.40,
                 'NA': 1.00,
                 'SA': 0.10,
                 'AF': 1.00,
                 'AS': 1.30,
                 'OC': 1.00,
             }
         },
         {
             name: ('stackpath-cdn' as TCDNProvider),
             cname: 'www.bar.com',
             preferredMarkets: {
                 'EU': 0.80,
                 'NA': 0.80,
                 'SA': 0.50,
                 'AF': 0.80,
                 'AS': 0.50,
                 'OC': 0.80,
             }
         },
         {
             name: ('verizon-edgecast-cdn' as TCDNProvider),
             cname: 'www.baz.com',
             preferredMarkets: {
                 'EU': 1.00,
                 'NA': 1.20,
                 'SA': 1.30,
                 'AF': 1.00,
                 'AS': 1.40,
                 'OC': 1.00,
             }
         },
     ],
     profiles: <any>{
         'rtt': 1.9, // rtt (Round Trip Time),
     },
     defaultProfile: 'rtt',
     defaultTtl: 300, // The DNS TTL to be applied to DNS responses in seconds.
     availabilityThreshold: 80 // Board value for providers 'Uptime' to compare with
 };

/**
 * Generates rank by performance data
 */
function rankPlatforms(cdnPerformanceData) {
    // Get array of all providers and performance in milliseconds for each one.
    const maxPoints = 1000;
    const min = Math.min(...cdnPerformanceData.map((item) => item.perf));
    const {  profiles, defaultProfile } = configuration;

    return cdnPerformanceData.map((provider): number => {
        if (provider.perf <= 0) { // It won't happen most likely
            return 0;
        }
        const flooredPoints = Math.floor((min / provider.perf) * maxPoints);
        return flooredPoints * profiles[defaultProfile];
    });
}

/**
 * Calculate Total Score from given score and data
 */
function calculateTotalScore(
    cdnPerformanceData, // our providers data and performances
    scores: number[], // the ranks array we got with the rankPlatforms function
    continent?: TContinent, // user continent (if detected)
): number[] {
    return cdnPerformanceData.map((provider, index) => {
        let totalScore = scores[index];

        // apply pricing penalties / boosts if user continent is detected
        if (continent && provider.provider.preferredMarkets[continent]) {
            totalScore *= provider.provider.preferredMarkets[continent];
        }

        return totalScore;
    });
}

/**
 * Pick highest value from given array of numbers
 */
const getHighest = (array: number[]): number => array.indexOf(Math.max(...array));
/**
 * Pick random element from given array of type
 */
const getRandom = <T>(items:T[]):T =>  items[Math.floor(Math.random() * items.length)];

function onRequest(request: IRequest, response: IResponse) {
    const { providers, defaultTtl, availabilityThreshold } = configuration;
    const { continent } = request.location;

    // Filter providers by uptime
    const availableProviders = providers.filter(
        (provider) =>
            (continent &&
                fetchCdnRumUptime(provider.name, 'continent', continent) ||
                fetchCdnRumUptime(provider.name)) > availabilityThreshold // uptime data for 60 minutes
    );

    // 'Bad' uptime, return random provider from available.
    if (!availableProviders.length) { // availableProviders
        response.setAddr(getRandom(providers).cname);
        response.setTTL(defaultTtl);
        return;
    }

    // Else create array with performance data for each provider
    const cdnPerformanceData = availableProviders.map(
        (provider) => ({
            provider,
            perf:
                continent &&
                fetchCdnRumPerformance(provider.name, 'continent', continent) ||
                fetchCdnRumPerformance(provider.name)
        })
    );

    // Calculate total score
    const totalScores = calculateTotalScore(
        cdnPerformanceData,
        rankPlatforms(cdnPerformanceData),
        request.location.continent
    );

    // Return as default, provider with highest score
    response.setAddr(cdnPerformanceData[getHighest(totalScores)].provider.cname);
    response.setTTL(defaultTtl);
    return;
}
``` 
