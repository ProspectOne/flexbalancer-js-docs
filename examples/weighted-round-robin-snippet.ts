// Weighted Round Robin
// Main configuration
const configuration = {
    /** List of  providers configuration */
    providers: [
        {
            name: ('jsdelivr-cdn' as TCDNProvider),// CDN Provider alias to work with
            cname: 'cname1.foo.com',// cname to pick as a result
            weight: 50// Weight number for this choice
        },
        {
            name: ('google-cloud-cdn' as TCDNProvider),
            cname: 'cname2.foo.com',
            weight: 30
        },
        {
            name: ('cloudflare' as TCDNProvider),
            cname: 'cname3.foo.com',
            weight: 20
        }
    ],
    defaultTtl: 20, // The DNS TTL to be applied to DNS responses in seconds.
    availabilityThreshold: 90 // Board value for providers 'Uptime' to compare with
};

/**
 * returns index of Highest value in array
 * @param array
 */
const getHighest = (array: number[]): number => array.indexOf(Math.max(...array));
/**
 * returns object which have highest value of property
 * @param array
 * @param property
 */
const getHighestByProperty = <T>(array: T[], property):T => array[getHighest(array.map(item => item[property]))];
/**
 * return Sum of property value for each object in array
 * @param items
 * @param property
 */
const getSumByProperty = <T>(items:T[], property): number => items.reduce((sum, item) => sum += item[property],0);

async function onRequest(req: IRequest, res: IResponse) {
    const {providers, defaultTtl, availabilityThreshold} = configuration;

    // Choose providers that have 'UPTIME' value more that threshold.
    const availableProviders = providers.filter(
        (provider) => fetchCdnRumUptime(provider.name) > availabilityThreshold
    );
    // Calculate total weight for all providers
    const totalWeight = getSumByProperty(availableProviders, 'weight');

    // If providers list result after filter is empty or total weight less or equal to 0 go with fallback option
    if (availableProviders.length === 0 || totalWeight <= 0) {
        // Create array map with 'uptime' value for each provider
        const CDNUptimeData = providers.map(
            // uptime data for 10 minutes
            (provider) => ({
                provider,
                uptime: fetchCdnRumUptime(provider.name)
            })
        );
        // Return Object with default ttl and take providers from array with highest uptime' value
        return {
            addr: getHighestByProperty(CDNUptimeData, 'uptime').provider.cname,
            ttl: defaultTtl
        };
    }
    // If we have single available result simply return it
    if (availableProviders.length === 1) {
        return {
            addr: availableProviders[0].cname,
            ttl: defaultTtl
        };
    }
    // If we have bunch of available result pick one randomly weighted
    const random = Math.floor(Math.random() * totalWeight);
    let mark = 0;
    let weightedProviderIndex = 0;
    for(let i = 0; i< availableProviders.length; i += 1) {
        mark += availableProviders[i].weight;
        if (random < mark) {
            weightedProviderIndex = i;
            break;
        }
    }
    // Return Object with default ttl and chosen provider
    return {
        addr: availableProviders[weightedProviderIndex].cname,
        ttl: defaultTtl
    }
}
