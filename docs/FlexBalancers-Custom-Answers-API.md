# FlexBalancer Custom Answers API

## Application 

The typical format for Custom Answer is:

```typescript
async function onRequest(req: IRequest, res: IResponse) {
    // Logic goes here
    ...
    res.addr = 'myanswer.net';
    return res;
}
```

As you can see, we have chosen [TypeScript](https://www.typescriptlang.org/) as a programming language for Custom Answers. It has a lot of advantages and in most cases does not cause any problems for people who used JavaScript before.  

### Functions

*async* **onRequest(request: IRequest, response: IResponse): Promise<IResponse>**

* **request** - *(IRequest)* - User request data passed to answer by flexbalancer.
* **response** - *(IResponse)* - Answer response, that is modified by custom answer logic.

The main function that determines answer behavior. Usually all logic is stored inside this function.
For example, you want to set particular answer for users from `France`.

```typescript
async function onRequest(req: IRequest, res: IResponse) {
    if(req.location.country == 'FR') {
        res.addr = 'answer.mysite.fr';
        res.ttl = 25;

        return res;
    }

    res.addr = 'mysite.net';
    return res;
}
```

Interfaces implemented by function arguments are listed below: 

### Interfaces

**IRequest**

Forms the contract to `request` so it contains all information about user that accesses balancer.
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
        city: number;
        country: TCountry;
        state: TState | null;
        region: number;
        continent: TContinent;
        latitude: number;
        longitude: number;
    };
}
```

**IResponse**

Contracts `response` to have answer address and TTL.
```typescript
declare interface IResponse {
    /**
     * List should contains only hostnames
     * or only IPs but not mixed.
     */
    addr: TIp[] | string[];

    /**
     * Time to live in seconds
     */
    ttl: number;
}
```
Types that are used at that interfaces are listed at section below.

## Provided functions

We have prepared list of helpful functions that can be used inside your application. We will list types, interfaces and functions below.

### Types

**TIp**

Type for IP-address.
```typescript
declare type TIp = string;
```

**TCountry**

Enumeration contains countries ISO-codes.
```typescript
declare type TCountry = 'DZ' | 'AO' | 'BJ' | 'BW' | 'BF' ...  'PR' | 'GU';
```
See [ISO codes on Wikipedia](http://en.wikipedia.org/wiki/ISO_3166-1_alpha-2#Officially_assigned_code_elements) for the full list.

**TContinent**

ISO codes for continents enumeration.
```typescript
declare type TContinent = 'AF' | 'AS' | 'EU' | 'NA' | 'OC' | 'SA';
```

**TState**

ISO codes for the US states.
```typescript
declare type TState = 'AL' | 'AK' | 'AZ' | 'AR' | 'CA' ...  'WI' | 'WY';
```
See [US-states ISO codes on Wikipedia](https://en.wikipedia.org/wiki/ISO_3166-2:US#Current_codes) for the full list.

**TCDNProvider**

Type represent list of CDN providers aliases.

```typescript
/**
 * Generated list of CDN providers IDs,
 * which are available for user usage
 * inside custom code
 */
declare type TCDNProvider = 'belugacdn' | 'ovh-cdn' | ... | 'medianova';
```
Aliases for CDN Providers:

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
| quantil | Quantil CDN |
| azion | Azion |
| verizon-edgecast-cdn | Verizon (Edgecast) CDN |
| azure-cdn | Azure CDN |
| cachefly | CacheFly |
| medianova | Medianova |

**TMonitor**

User monitors ids. Type is generated based on list of your monitors IDs. If you don't have any - it is empty.

```typescript
/**
 * Generated list of
 * monitor IDs, which are available
 * for usage inside custom code
 */
declare type TMonitor = ;
```

For example, can be
```typescript
declare type TMonitor = 307 | 308;
```
If user created monitors that got ids 307 and 308.

**TSubnetMask**

Implement if you need to use subnet parameter.

```typescript
declare type TSubnetMask = string;
```

**TRUMLocationSelectorState**
**TRUMLocationSelectorCountry**
**TRUMLocationSelectorContinent**

Types are related fo second param at *fetchCdnRumUptime*, *fetchCdnRumPerformance* functions, listed below. Determine location type for search by ISO code.

```typescript
declare type TRUMLocationSelectorState = 'state';
declare type TRUMLocationSelectorCountry = 'country';
declare type TRUMLocationSelectorContinent = 'continent';
```

### Interfaces

**ICityResponse**

The interface forms contract for the result of **lookupCity** function listed below.

```typescript
declare interface ICityResponse {
    readonly name: string;
    readonly geonameId: number;
}
```

**IStateResponse**

The interface for the result of **lookupState** function listed below.

```typescript
declare interface IStateResponse {
    readonly name: string;
    readonly isoCode: TState;
    readonly geonameId: number;
}
```

**ICountryResponse**

The interface for the result of **lookupCountry** function listed below.

```typescript
declare interface ICountryResponse {
    readonly name: string;
    readonly isoCode: TCountry;
    readonly geonameId: number;
}
```

**IContinentResponse**

The interface for the result of **lookupContinent** function listed below.

```typescript
declare interface IContinentResponse {
    readonly name: string;
    readonly isoCode: TContinent;
    readonly geonameId: number;
}
```

**IAsnResponse**

The interface forms contract for the result of **lookupAsn** function listed below.

```typescript
declare interface IAsnResponse {
    readonly autonomousSystemNumber: number;
    readonly autonomousSystemOrganization: string;
}
```

### Functions

**fetchMonitorUptime(monitor: TMonitor): number**

Returns monitor uptime value, monitor id is passed as an argument.

* **monitor** - *(TMonitor)* - User Monitor ID.

```typescript
async function onRequest(req: IRequest, res: IResponse) {
    ...
    if(fetchMonitorUptime(305) > 95) {
    ...
    }
...
}
```

**isMonitorOnline(monitor: TMonitor): boolean**

Returns boolean value depending on monitor online status (active/inactive).

* **monitor** - *(TMonitor)* - User Monitor ID.

```typescript
async function onRequest(req: IRequest, res: IResponse) {
    ...
    if(isMonitorOnline(305) === true) {
    ...
    }
...
}
```

**fetchCdnRumUptime(provider: TCDNProvider, selector?, identifier?): number**

Returns uptime value for particular CDN provider. If is used with the first parameter only (fetchCdnRumUptime(provider: TCDNProvider): number) - returns world uptime value. 

* **provider** - *(TCDNProvider)* - provider alias, described at `Types` section.
* **selector** - *(TRUMLocationSelectorContinent | TRUMLocationSelectorCountry | TRUMLocationSelectorState)* - selector type, must be the same location type (continent, country or state) as the third param.
* **identifier** - *(TContinent | TCountry | TState)* - location ISO, described at `Types` section.

```typescript
async function onRequest(req: IRequest, res: IResponse) {
    if(fetchCdnRumUptime('jsdelivr-cdn') > 98.5) {
    ...
    }
    ...
    if(fetchCdnRumUptime('jsdelivr-cdn', 'continent', 'EU') > 99) {
    ...
    }
...
}
```

**fetchCdnRumPerformance(provider: TCDNProvider, selector?, identifier?): number**

Similar to the previous function but returns RUM Performance value. If is used with the first parameter only - returns world performance value. 

* **provider** - *(TCDNProvider)* - provider alias, described at `Types` section.
* **selector** - *(TRUMLocationSelectorContinent | TRUMLocationSelectorCountry | TRUMLocationSelectorState)* - selector type, must be the same location type (continent, country or state) as the third param.
* **identifier** - *(TContinent | TCountry | TState)* - location ISO, described at `Types` section.

```typescript
async function onRequest(req: IRequest, res: IResponse) {
    if(fetchCdnRumPerformance('jsdelivr-cdn') > 98.5) {
    ...
    }
    ...
    if(fetchCdnRumPerformance('jsdelivr-cdn', 'country', 'FR') > 99) {
    ...
    }
...
}
```

**lookupCity(ip: string):Promise<ICityResponse | null>**

Finds the city IP belongs to. Resolves result that implements  `ICityResponse` or `null` if IP does not belong to any city.

* **ip** - *(string)* - IP to find result for.

```typescript
// ToDo example
```

Can be overloaded and used with additional parameters:

**lookupCity(ip: string, target: number, threshold: number):Promise<boolean>**

Finds if IP belongs to particular city. Resolves `boolean`.

* **ip** - *(string)* - IP to find result for.
* **target** - *(number)* - City id (?) Maybe geoname?.
* **threshold** - *(number)* - distance threshold.

```typescript
// ToDo example
```

**lookupState(ip: string):Promise<IStateResponse | null>**

Finds the US state IP belongs to. Resolves result that implements  `IStateResponse` or `null` if IP does not belong to the US.

* **ip** - *(string)* - IP to find result for.

```typescript
// ToDo example
```

Can be overloaded and used with additional parameters:

**lookupState(ip: string, target: TCountry, threshold: number):Promise<boolean>**

Finds if IP belongs to particular country. Resolves `boolean`.

* **ip** - *(string)* - IP to find result for.
* **target** - *(TCountry)* - Country ISO code.
* **threshold** - *(number)* - distance threshold.

```typescript
// ToDo example
```

**lookupCountry(ip: string):Promise<ICountryResponse>**

Finds the country IP belongs to. Resolves result that implements  `ICountryResponse`.

* **ip** - *(string)* - IP to find result for.

```typescript
// ToDo example
```

Can be overloaded and used with additional parameters:

**lookupCountry(ip: string, target: TCountry, threshold: number):Promise<boolean>**

Finds if IP belongs to particular country. Resolves `boolean`.

* **ip** - *(string)* - IP to find result for.
* **target** - *(TCountry)* - Country ISO code.
* **threshold** - *(number)* - distance threshold.

```typescript
// ToDo example
```

**lookupContinent(ip: string): Promise<IContinentResponse>**

Finds the continent IP belongs to. Resolves result that implements  `IContinentResponse`.

* **ip** - *(string)* - IP to find result for.

```typescript
// ToDo example
```

Can be overloaded and used with additional parameters:

**lookupContinent(ip: string, target: TContinent, threshold: number): Promise<boolean>**

Finds if IP belongs to particular continent. If Promise is fulfilled - resolves `boolean`. 

* **ip** - *(string)* - IP to find result for.
* **target** - *(TContinent)* - Continent ISO code.
* **threshold** - *(number)* - distance threshold.

```typescript
// ToDo example
```

**lookupAsn(ip: string): IAsnResponse**

Returns ASN for IP provided. The result implements `IAsnResponse` interface. 

* **ip** - *(string)* - IP to find ASN for.

```typescript
async function onRequest(req: IRequest, res: IResponse) {
    if(lookupAsn(req.ip) == 'AS15169') {
        ...​
        return res;
    }
...
}
```

**isIpInRange(ip: TIp, startIp: TIp, endIp: TIp): boolean**

Checks if IP belongs to range provided. Returns boolean.

* **ip** - *(TIp)* - Ip to check, `needle`.
* **startIp** - *(TIp)* - `haystack` start.
* **endIp** - *(TIp)* - `haystack` end.

```typescript
async function onRequest(req: IRequest, res: IResponse) {
    if(isIpInRange(req.ip, "192.168.0.1", "192.168.0.250")) {
        ...​
        return res;
    }
...
}
```

**isIpInMask(ip: TIp, ipMask: TSubnetMask): boolean**

Checks if IP belongs to net mask provided. Returns boolean.

* **ip** - *(TIp)* - Ip to check, `needle`.
* **ipMask** - *(TSubnetMask)* - `haystack`.

```typescript
async function onRequest(req: IRequest, res: IResponse) {
    if(isIpInMask(req.ip, "145.2.3.4/16")) {
        res.addr = ['mask16.com'];
        res.ttl = 30;
        ...​
        return res;
    }
...
}
```