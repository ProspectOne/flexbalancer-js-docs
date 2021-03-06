# FlexBalancer Custom Answers API
1. [Application](#application)
    * [The Main function (onRequest)](#the-main-function)
    * [Interfaces](#interfaces)
2. [Provided functions](#provided-functions)
    * [Types](#types)
    * [Functions](#functions)
        * [fetchMonitorUptime](#fetchmonitoruptime)
        * [isMonitorOnline](#ismonitoronline)
        * [fetchCdnRumUptime](#fetchcdnrumuptime)
        * [fetchCdnRumPerformance](#fetchcdnrumperformance)
        * [fetchCloudProviderUptime](#fetchclouduptime)
        * [fetchCloudProviderPerformance](#fetchcloudperformance)
        * [lookupCity](#lookupcity)
        * [lookupState](#lookupstate)
        * [lookupCountry](#lookupcountry)
        * [lookupContinent](#lookupContinent)
        * [lookupAsn](#lookupasn)
        * [isIpInRange](#isipinrange)
        * [isIpInMask](#isipinmask)
        * [fetchRemote](#fetchremote)

## Application 

We have chosen [TypeScript](https://www.typescriptlang.org/) as a programming language for our Custom Answers. It has a lot of advantages and in most cases does not cause any problems for people who used JavaScript before.  

### The Main Function

**onRequest(request: IRequest, response: IResponse)**

* **request** - *(IRequest)* - User request data passed to answer by flexbalancer.
* **response** - *(IResponse)* - Answer response, that is modified by custom answer logic.

The main function that determines answer behavior. Usually all logic is stored inside this function.
For example, you want to set particular answer for users from `France`.

```typescript
function onRequest(req: IRequest, res: IResponse) {
    if(req.location.country && req.location.country == 'FR') {
        res.setCNAMERecord('answer.mysite.fr');
        res.setTTL(25);

        return;
    }

    res.setCNAMERecord('mysite.net');
    return;
}
```

### onSetup Function

**onSetup(): IApplicationConfig**

This function is mostly used for adding remote sources (external APIs etc):

```typescript
function onSetup():IApplicationConfig {
    return {
        remotes: {
            // Set up remote data source
            'mydata': { url: 'https://get.some.important.data.com/test.json' }
        }
    }
}
```

### Interfaces

The interfaces implemented by `request` and `response` : 

**IRequest**

```typescript
declare interface IRequest {
    /**
    * User ip address
    **/
    readonly ip: TIp;

    /**
    * Ip or Hostname of dns which
    * were requested resolve.
    **/
    readonly dnsAddress: TIp | string;

    readonly location: {
        subnet: {
            minAddress: number;
            maxAddress: number;
            asn?: number;
        };
        city?: number;
        country?: TCountry;
        state?: TState | null;
        continent?: TContinent;
        latitude?: number;
        longitude?: number;
    };
}
```
***
**IResponse**

```typescript
declare interface IResponse {
    /**
    * Set the result to a single A record
    */
    setARecord(addr: string): void;

    /**
     * Add address to the results for a multi-record (A-records) answer
     */
    addARecord(addr: string): void;

    /**
     * Set CNAME record as an answer
     */
    setCNAMERecord(hostname: string): void;

    /**
     * Time to live in seconds
     */
    setTTL(ttl: number): void;
}
```
***
**IApplicationConfig**

The interface that `onSetup` function returns.

```typescript
declare interface IApplicationConfig {
    remotes?: {
        [key: string]: {
            url: string
            headers?: {
                [key: string]: string;
            }
        }
    }
}
```
Used to specify remote sources. You are also able to set headers (such as `Authorization` etc).
***
**ILogger** interface and constant **logger**

```typescript
/**
 * Logger interface
 */
declare interface ILogger {
    /**
     * Write a message to the log.
     *
     * Logged messages will be visible in the Raw Logs for
     * current Flex Balancer in the Panel
     */
    write(message: string): void;
}
```
```typescript
declare const logger: ILogger;
```
Useful when you need to log any events that can be seen at the Raw Logs list of the [PerfOps Panel](https://panel.perfops.net)

```typescript
function onRequest(req: IRequest, res: IResponse) {
    ...
    // Write log
    logger.write('start processing');
    ...
    logger.write('finished');
    ...
}
```

***
Types that are used at `IRequest` and `IResponse` interfaces are listed at the section below.

## Provided functions

We have prepared the list of helpful types and functions that can be used inside your application.

### Types

**TIp**

The IP-address type.
```typescript
declare type TIp = string;
```
***
**TCountry**

This enumeration contains countries ISO-codes.
```typescript
declare type TCountry = 'DZ' | 'AO' | 'BJ' | 'BW' | 'BF' ...  'PR' | 'GU';
```
See [ISO codes on Wikipedia](http://en.wikipedia.org/wiki/ISO_3166-1_alpha-2#Officially_assigned_code_elements) for the full list.
***
**TContinent**

The ISO codes for the continents enumeration.
```typescript
declare type TContinent = 'AF' | 'AS' | 'EU' | 'NA' | 'OC' | 'SA';
```
***
**TState**

The ISO codes for the US states.
```typescript
declare type TState = 'AL' | 'AK' | 'AZ' | 'AR' | 'CA' ...  'WI' | 'WY';
```
See [US-states ISO codes on Wikipedia](https://en.wikipedia.org/wiki/ISO_3166-2:US#Current_codes) for the full list.
***
**TCDNProvider**

This type represents the list of the CDN providers aliases:

```typescript
/**
 * Generated list of CDN providers IDs,
 * which are available for user usage
 * inside custom code
 */
declare type TCDNProvider = 'belugacdn' | 'ovh-cdn' | ... | 'medianova';
```
The aliases for the CDN Providers:

| Alias | CDN Provider |
|:------|:----------------|
| belugacdn | NuSEC CDN |
| ovh-cdn | OVH CDN |
| cloudflare | Cloudflare CDN |
| fastly | Fastly CDN |
| aws-cloudfront | AWS CloudFront CDN |
| keycdn | KeyCDN |
| google-cloud-cdn | Google Cloud CDN |
| g-core-labs | G-Core Labs CDN |
| cdn77 | CDN77 |
| akamai | Akamai CDN |
| bunnycdn | BunnyCDN |
| jsdelivr-cdn | jsDelivr CDN |
| stackpath-cdn | StackPath CDN |
| cdnnet | CDN.NET |
| quantil| CDNetworks |
| verizon-edgecast-cdn | Verizon (Edgecast) CDN |
| azure-cdn | Azure CDN |
| cachefly | CacheFly |
| medianova | Medianova |
***
**TCloudProvider**

This type represents the list of the Cloud providers aliases:

```typescript
/**
 * Generated list of Cloud provider IDs
 */
declare type TCloudProvider = 'aws:us-east-2' | 'aws:us-east-1' | ... 'digitalocean:nyc' | ... 'vultr:ga-us' | ... 'gce:us-west2';
```
The aliases for the Cloud Providers:

| Alias | Cloud Provider |
|:------|:----------------|
| aws | Amazon Web Services |
| digitalocean | DigitalOcean |
| vultr | Vultr |
| gce | Google Cloud |

The regions for the particular Cloud Provider are attached after alias name, followed by `:`, for example:
```typescript
let cloudPerformance = fetchCloudProviderPerformance('aws:us-east-1');
```
The full list of the Cloud Providers with regions is available via Custom Answers Editor ToolTip.
***
**TMonitor**

This type is generated based on the list of your monitors IDs. If you don't have any - it is equal to `null`.

```typescript
/**
 * Generated list of
 * monitor IDs, which are available
 * for usage inside custom code
 */
declare type TMonitor = null;
```

For example, it can be:
```typescript
declare type TMonitor = 307 | 308;
```
If you have created monitors that got the ids 307 and 308.
***
**TSubnetMask**

Implement if you need to use a subnet parameter.

```typescript
declare type TSubnetMask = string;
```
***
**TLocationSelectorState**
**TLocationSelectorCountry**
**TLocationSelectorContinent**

That types are related fo the second param of *fetchCdnRumUptime*, *fetchCdnRumPerformance* functions, that are listed below. Are used to determine location type for search by the ISO code.

```typescript
declare type TLocationSelectorState = 'state';
declare type TLocationSelectorCountry = 'country';
declare type TLocationSelectorContinent = 'continent';
```

### Functions

**fetchMonitorUptime(monitor: TMonitor): number** <a name="fetchmonitoruptime"></a>

* **monitor** - *(TMonitor)* - User Monitor ID.

Returns your monitor uptime value, a monitor id is passed as an argument. **Monitors data is collected every 10 seconds.**

Example:

```typescript
function onRequest(req: IRequest, res: IResponse) {
    ...
    if(fetchMonitorUptime(305) > 95) {
    ...
    }
...
}
```
***
**isMonitorOnline(monitor: TMonitor): boolean** <a name="ismonitoronline"></a>

* **monitor** - *(TMonitor)* - User Monitor ID.

Returns boolean value depending on your monitor online status (active/inactive).

Example:

```typescript
function onRequest(req: IRequest, res: IResponse) {
    ...
    if(isMonitorOnline(305) === true) {
    ...
    }
...
}
```
***
**fetchCdnRumUptime(provider: TCDNProvider): number** <a name="fetchcdnrumuptime"></a>

* **provider** - *(TCDNProvider)* - the provider alias, described at the `Types` section.

Returns world uptime value for the particular CDN provider. [The higher value - the better uptime.](https://www.cdnperf.com/#!rum)

**The data represents the average statistics for the last 10 minutes and is requested every minute.**

Example:

```typescript
function onRequest(req: IRequest, res: IResponse) {
    if(fetchCdnRumUptime('jsdelivr-cdn') > 98.5) {
    ...
    }
...
}
```

This function also accepts additional parameters `selector` and `identifier`:

**fetchCdnRumUptime(provider: TCDNProvider, selector?, identifier?): number**

* **provider** - *(TCDNProvider)* - the provider alias, described at `Types` section.
* **selector** - *(TLocationSelectorContinent | TLocationSelectorCountry | TLocationSelectorState)* - selector type, must be the same location type (continent, country or state) as the third param.
* **identifier** - *(TContinent | TCountry | TState)* - the location ISO, described at `Types` section.

Returns location-based uptime value for the particular CDN provider. [The higher value - the better uptime.](https://www.cdnperf.com/#!rum)

**The data represents the average statistics for the last 10 minutes and is requested every minute.**

Example:

```typescript
function onRequest(req: IRequest, res: IResponse) {
    if(fetchCdnRumUptime('jsdelivr-cdn', 'continent', 'EU') > 99) {
    ...
    }
...
}
```
***
**fetchCdnRumPerformance(provider: TCDNProvider): number** <a name="fetchcdnrumperformance"></a>

* **provider** - *(TCDNProvider)* - provider alias, described at `Types` section.

Similar to the previous function but returns World RUM Performance value. [The lower value - the better performance.](https://www.cdnperf.com/)

**The data represents the average statistics for the last 10 minutes and is requested every minute.**

Example:

```typescript
function onRequest(req: IRequest, res: IResponse) {
    if(fetchCdnRumPerformance('jsdelivr-cdn') < 33) {
    ...
    }
...
}
```

This function also accepts additional parameters `selector` and `identifier`:

**fetchCdnRumPerformance(provider: TCDNProvider, selector?, identifier?): number**

* **provider** - *(TCDNProvider)* - the provider alias, described at `Types` section.
* **selector** - *(TLocationSelectorContinent | TLocationSelectorCountry | TLocationSelectorState)* - selector type, must be the same location type (continent, country or state) as the third param.
* **identifier** - *(TContinent | TCountry | TState)* - location ISO, described at `Types` section.

Returns the location-based CDN performance value. [The lower value - the better performance.](https://www.cdnperf.com/)

**The data represents the average statistics for the last 10 minutes and is requested every minute.**

Example:

```typescript
function onRequest(req: IRequest, res: IResponse) {
    if(fetchCdnRumPerformance('jsdelivr-cdn', 'country', 'FR') < 40) {
    ...
    }
...
}
```
***
**fetchCloudProviderUptime(provider: TCloudProvider): number | null** <a name="fetchclouduptime"></a>

* **provider** - *(TCloudProvider)* - the provider alias with the region, described at the `Types` section.

Returns world uptime value for the particular Cloud provider. [The higher value - the better uptime.](https://www.cloudperf.com/?s=uptime)

**The data represents the average statistics for the last 10 minutes and is requested every minute.**

Example:

```typescript
function onRequest(req: IRequest, res: IResponse) {
    let cloudUptime = fetchCloudProviderUptime('aws:us-east-2');
    if(cloudUptime && cloudUptime > 90) {
    ...
    }
...
}
```

This function also accepts additional parameters `selector` and `identifier`:

**fetchCloudProviderUptime(provider: TCloudProvider, selector?, identifier?): number | null**

* **provider** - *(TCloudProvider)* - the provider alias with the region, described at `Types` section.
* **selector** - *(TLocationSelectorContinent | TLocationSelectorCountry | TLocationSelectorState)* - selector type, must be the same location type (continent, country or state) as the third param.
* **identifier** - *(TContinent | TCountry | TState)* - the location ISO, described at `Types` section.

Returns location-based uptime value for the particular Cloud provider. [The higher value - the better uptime.](https://www.cloudperf.com/?s=uptime)

**The data represents the average statistics for the last 10 minutes and is requested every minute.**

Example:

```typescript
function onRequest(req: IRequest, res: IResponse) {
    let cloudUptime = fetchCloudProviderUptime('aws:us-east-2', 'continent', 'EU');
    if(cloudUptime && cloudUptime > 99) {
    ...
    }
...
}
```
***
**fetchCloudProviderPerformance(provider: TCloudProvider): number | null** <a name="fetchcloudperformance"></a>

* **provider** - *(TCloudProvider)* - provider alias with the region, described at `Types` section.

Similar to the previous function but returns the World Performance (Latency) value. [The lower value - the better performance.](https://www.cloudperf.com/)

**The data represents the average statistics for the last 10 minutes and is requested every minute.**

Example:

```typescript
function onRequest(req: IRequest, res: IResponse) {
    let cloudPerf = fetchCloudProviderPerformance('aws:us-east-2');
    if(cloudPerf && cloudPerf < 33) {
    ...
    }
...
}
```

This function also accepts additional parameters `selector` and `identifier`:

**fetchCloudProviderPerformance(provider: TCloudProvider, selector?, identifier?): number | null**

* **provider** - *(TCloudProvider)* - the provider alias, described at `Types` section.
* **selector** - *(TLocationSelectorContinent | TLocationSelectorCountry | TLocationSelectorState)* - selector type, must be the same location type (continent, country or state) as the third param.
* **identifier** - *(TContinent | TCountry | TState)* - location ISO, described at `Types` section.

Returns the location-based Cloud performance (Latency) value. [The lower value - the better performance.](https://www.cloudperf.com/)

**The data represents the average statistics for the last 10 minutes and is requested every minute.**

Example:

```typescript
function onRequest(req: IRequest, res: IResponse) {
    let cloudPerf = fetchCloudProviderPerformance('aws:us-east-2', 'country', 'FR');
    if(cloudPerf && cloudPerf < 40) {
    ...
    }
...
}
```
***
**lookupCity(ip: string): ICityResponse | null** <a name="lookupcity"></a>

* **ip** - *(string)* - the IP to find result for.

Finds the city IP belongs to. Returns a result that implements  `ICityResponse`:

```typescript
declare interface ICityResponse {
    readonly name: string;
    readonly geonameId: number;
}
``` 
 
or `null` if the IP does not belong to any city.

Example:

```typescript
function onRequest(req: IRequest, res: IResponse) {
    let cityInfo = lookupCity(req.ip);
    if(cityInfo.name == 'Washington') {
    ...
    }
...
}
```

This function also accepts additional parameters `target` and `threshold`:

**lookupCity(ip: string, target: number, threshold: number): boolean**

* **ip** - *(string)* - the IP to find result for.
* **target** - *(number)* - the targeted city geoname id. Can be found at [MaxMind GeoLite2 Databases](https://dev.maxmind.com/geoip/geoip2/geolite2/)
* **threshold** - *(number)* - the distance threshold.

Finds if the IP provided belongs to the particular city. Returns `boolean`.

Example:

```typescript
function onRequest(req: IRequest, res: IResponse) {
    let ipBelongsTo = lookupCity(req.ip, 637896, 10);
    if(ipBelongsTo === true) {
    ...
    }
...
}
```
***
**lookupState(ip: string): IStateResponse | null** <a name="lookupstate"></a>

* **ip** - *(string)* - the IP to find result for.

Finds the US state the IP provided belongs to. Returns a result that implements  `IStateResponse` :

```typescript
declare interface IStateResponse {
    readonly name: string;
    readonly isoCode: TState;
    readonly geonameId: number;
}
```

or `null` if the IP does not belong to the US.

Example:

```typescript
function onRequest(req: IRequest, res: IResponse) {
    let stateInfo = lookupState(req.ip);
    if(stateInfo.isoCode == 'PA') {
    ...
    }
...
}
```

This function also accepts additional parameters `target` and `threshold`:

**lookupState(ip: string, target: TState, threshold: number): boolean**

* **ip** - *(string)* - the IP to find result for.
* **target** - *(TState)* - the country ISO code.
* **threshold** - *(number)* - the distance threshold.

Finds if the IP provided belongs to the particular US State. Returns `boolean`.

Example:

```typescript
function onRequest(req: IRequest, res: IResponse) {
    let ipBelongsTo = lookupState(req.ip, 'AL', 10);
    if(ipBelongsTo === true) {
    ...
    }
...
}
```
***
**lookupCountry(ip: string): ICountryResponse** <a name="lookupcountry"></a>

* **ip** - *(string)* - the IP to find result for.

Finds the country the IP provided belongs to. Returns a result that implements `ICountryResponse`:

```typescript
declare interface ICountryResponse {
    readonly name: string;
    readonly isoCode: TCountry;
    readonly geonameId: number;
}
```

Example:

```typescript
function onRequest(req: IRequest, res: IResponse) {
    let countryInfo = lookupCountry(req.ip);
    if(countryInfo.isoCode == 'UK') {
    ...
    }
...
}
```

This function also accepts additional parameters `target` and `threshold`:

**lookupCountry(ip: string, target: TCountry, threshold: number): boolean**

* **ip** - *(string)* - the IP to find result for.
* **target** - *(TCountry)* - the country ISO code.
* **threshold** - *(number)* - the distance threshold.

Finds if the IP provided belongs to the particular country. Returns `boolean`.

Example:

```typescript
function onRequest(req: IRequest, res: IResponse) {
    let ipBelongsTo = lookupCountry(req.ip, 'FR', 10);
    if(ipBelongsTo === true) {
    ...
    }
...
}
```
***
**lookupContinent(ip: string): IContinentResponse** <a name="lookupcontinent"></a>

* **ip** - *(string)* - the IP to find result for.

Finds the continent the IP provided belongs to. Returns a result that implements `IContinentResponse`:

```typescript
declare interface IContinentResponse {
    readonly name: string;
    readonly isoCode: TContinent;
    readonly geonameId: number;
}
```

Example:

```typescript
function onRequest(req: IRequest, res: IResponse) {
    let continentInfo = lookupContinent(req.ip);
    if(continentInfo.isoCode == 'NA') {
    ...
    }
...
}
```

This function also accepts additional parameters `target` and `threshold`:

**lookupContinent(ip: string, target: TContinent, threshold: number): boolean**

* **ip** - *(string)* - the IP to find result for.
* **target** - *(TContinent)* - the continent ISO code.
* **threshold** - *(number)* - the distance threshold.

Finds if the IP provided belongs to the particular continent. Returns `boolean`.

Example:

```typescript
function onRequest(req: IRequest, res: IResponse) {
    let ipBelongsTo = lookupContinent(req.ip, 'SA', 10);
    if(ipBelongsTo === true) {
    ...
    }
...
}
```
***
**lookupAsn(ip: string): IAsnResponse** <a name="lookupasn"></a>

* **ip** - *(string)* - the IP to find the ASN for.

Returns the ASN for the IP provided.
 
The result implements `IAsnResponse` interface:

```typescript
declare interface IAsnResponse {
    readonly autonomousSystemNumber: number;
    readonly autonomousSystemOrganization: string;
}
```

Example:

```typescript
function onRequest(req: IRequest, res: IResponse) {
    let asnInfo = lookupAsn(req.ip);
    if(asnInfo && asnInfo.autonomousSystemNumber == 'AS15169') {
        ...​
        return;
    }
...
}
```
***
**isIpInRange(ip: TIp, startIp: TIp, endIp: TIp): boolean** <a name="isipinrange"></a>

* **ip** - *(TIp)* - the IP to check, `needle`.
* **startIp** - *(TIp)* - the `haystack` start.
* **endIp** - *(TIp)* - the `haystack` end.

Checks if the IP belongs to the range provided. Returns boolean.

Example:

```typescript
function onRequest(req: IRequest, res: IResponse) {
    if(isIpInRange(req.ip, '192.168.0.1', '192.168.0.250')) {
        ...​
        return;
    }
...
}
```
***
**isIpInMask(ip: TIp, ipMask: TSubnetMask): boolean** <a name="isipinmask"></a>

* **ip** - *(TIp)* - the IP to check, the `needle`.
* **ipMask** - *(TSubnetMask)* - the `haystack`.

Checks if the IP belongs to the net mask provided. Returns boolean.

Example:

```typescript
function onRequest(req: IRequest, res: IResponse) {
    if(isIpInMask(req.ip, '145.2.3.4/16')) {
        res.setCNAMERecord(['mask16.com']);
        res.setTTL(30);
        ...​
        return;
    }
...
}
```
***
**fetchRemote(name: string): string | null** <a name="fetchremote"></a>

* **name** - *(string)* - the name of the remote source, defined by `onSetup` Application function

Returns remote source response.

Example:

```typescript
function onRequest(req: IRequest, res: IResponse) {
    // Collect data from fetched remote
    let stats = fetchRemote('mydata');
    if(stats) {
        logger.write('stats fetched');
        ...
    }
    ...
}
```
