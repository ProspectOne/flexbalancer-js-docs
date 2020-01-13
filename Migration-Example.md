# The Performance-Based Answer with Preferred Market Weights
## The Case
We have a set of answers with CDN providers. Each provider in our set has special `weigth` number for every continent, that determines the location penalties / boosts for that particular provider. For example, we want the users from Europe get preferred (so appear more oftenly) answer from `CDN provider 1`, and users from South America should preferrably get answer from `CDN Provider 2`.

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

Our task is to modify that script using [fetchCdnRumUptime](Custom-Answers-API#fetchcdnrumuptime) and [fetchCdnRumPerformance](Custom-Answers-API#fetchcdnrumperformance) functionalities provided by [PerfOps Custom Answers](Custom-Answers-API), and rewrite it in `typescript`. Let's do it step by step, using our [Recommended Structure](Basic-Use-Cases#basic-structure) rules. Those are not mandatory, but recommended, and you will see the reason why. 

## Configuration
Let's create our `configuration` using original config. Let's take the providers list, ttl and profile from OpenmixApplication argument:
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
Instead of original `getProbe` we will use [CDN Uptime](https://www.cdnperf.com/#!rum) and [CDN Performance](https://www.cdnperf.com/) data for provider ranking. That's why we do not need `http_kbps` we will just take `rtt` ratio and also define minimum `Uptime` value for a CDN Provider `availabilityThreshold` (`80` means 80% uptime):
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

Now let's prepare the function for platforms ranking. We will find the best CDN performance (minimal), and calculate rank based on formula `floor((best_performance / current_cdn_performance) * 1000) * profile_ratio`:
```typescript
/**
 * Generates rank by performance data
 */
function rankPlatforms(cdnPerformanceData) {
    // Get array of all providers and rtt in milliseconds
    // for each one.
    const maxPoints = 1000;
    const min = Math.min(...cdnPerformanceData.map((item) => item.perf));
    const {  profiles, defaultProfile } = configuration;

    // Score is not based on the range, so I don't expect scores of 0 (which makes the weights in the next step more effective)
    // For RTT
    // 1000 for min, x for max
    return cdnPerformanceData.map((provider): number => {
        if (provider.perf <= 0) {
            return 0;
        }
        const flooredPoints = Math.floor((min / provider.perf) * maxPoints);
        return flooredPoints * profiles[defaultProfile];
    });
}

```
And total score formula that will use preferredMarket value for particular continent:
```typescript
/**
 * Calculate Total Score from given score and data
 */
function calculateTotalScore(
    cdnPerformanceData,
    scores: number[],
    continent?: TContinent,
): number[] {
    return cdnPerformanceData.map((provider, index) => {
        let totalScore = scores[index];

        // apply pricing penalties / boosts for (non) EU/NA traffic
        if (continent && provider.provider.preferredMarkets[continent]) {
            totalScore *= provider.provider.preferredMarkets[continent];
        }

        return totalScore;
    });
}
```
We will also add our common `getHighest` and `getRandom` functions.
```typescript
/**
 * Pick highest value from given array of numbers
 */
const getHighest = (array: number[]): number => array.indexOf(Math.max(...array));
/**
 * Pick random element from given array of type
 */
const getRandom = <T>(items:T[]):T =>  items[Math.floor(Math.random() * items.length)];
```

Now, our logic. First let's parse our configuration, get the user location and filter all providers, removing those with no continent and 'bad' uptime:
```typescript
    const { providers, defaultTtl, availabilityThreshold } = configuration;
    const { continent } = request.location;

    // Filter providers by uptime more the
    const availableProviders = providers.filter(
        (provider) =>
            (continent &&
                fetchCdnRumUptime(provider.name, 'continent', continent) ||
                fetchCdnRumUptime(provider.name)) > availabilityThreshold // uptime data for 60 minutes
    );
```  
If they are all 'bad' - let's pick a random one as an answer:
```typescript
    // Return random provider from available.
    if (!availableProviders.length) { // availableProviders
        response.setAddr(getRandom(providers).cname);
        response.setTTL(defaultTtl);
        return;
    }
```
If we have the array of providers - let's get performances for the every available provider:
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
And use our Total Score function to get score per provider:
```typescript
    // Calculate total score by
    const totalScores = calculateTotalScore(
        cdnPerformanceData,
        rankPlatforms(cdnPerformanceData),
        request.location.continent
    );
```
And finally - return the best one:
```typescript
    // Return as default, provider with highest score
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
            name: ('stackpath-cdn' as TCDNProvider),
            cname: 'www.foo.com',
            preferredMarkets: {
                'EU': 1.30,
                'NA': 1.00,
                'SA': 0.01,
                'AF': 1.00,
                'AS': 1.20,
                'OC': 1.00,
            }
        },
        {
            name: ('stackpath-cdn' as TCDNProvider),
            cname: 'www.bar.com',
            preferredMarkets: {
                'EU': 0.75,
                'NA': 0.75,
                'SA': 0.50,
                'AF': 0.75,
                'AS': 0.50,
                'OC': 0.75,
            }
        },
        {
            name: ('verizon-edgecast-cdn' as TCDNProvider),
            cname: 'www.baz.com',
            preferredMarkets: {
                'EU': 1.00,
                'NA': 1.10,
                'SA': 1.20,
                'AF': 1.00,
                'AS': 1.20,
                'OC': 1.00,
            }
        },
    ],
    profiles: <any>{
        'rtt': 1.9, // rtt (Round Trip Time) Use for small files,
        'std': 1.25, // std (Standard) Combination of RTT and TRP
        'trp': 0.5 // trp (Throughput) Use for large (> 100kb) files
    },
    defaultProfile: 'rtt',
    defaultTtl: 300, // The DNS TTL to be applied to DNS responses in seconds.
    availabilityThreshold: 80 // Board value for providers 'Uptime' to compare with
};

/**
 * Generates rank by performance data
 */
function rankPlatforms(cdnPerformanceData) {
    // Get array of all providers and rtt in milliseconds
    // for each one.
    const maxPoints = 1000;
    const min = Math.min(...cdnPerformanceData.map((item) => item.perf));
    const {  profiles, defaultProfile } = configuration;

    // Score is not based on the range, so I don't expect scores of 0 (which makes the weights in the next step more effective)
    // For RTT
    // 1000 for min, x for max
    return cdnPerformanceData.map((provider): number => {
        if (provider.perf <= 0) {
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
    cdnPerformanceData,
    scores: number[],
    continent?: TContinent,
): number[] {
    return cdnPerformanceData.map((provider, index) => {
        let totalScore = scores[index];

        // apply pricing penalties / boosts for (non) EU/NA traffic
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

    // Filter providers by uptime more the
    const availableProviders = providers.filter(
        (provider) =>
            (continent &&
                fetchCdnRumUptime(provider.name, 'continent', continent) ||
                fetchCdnRumUptime(provider.name)) > availabilityThreshold // uptime data for 10 minutes
    );

    // Return random provider from available.
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

    // Calculate total score by
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
