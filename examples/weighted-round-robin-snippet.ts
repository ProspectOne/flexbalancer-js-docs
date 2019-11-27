// weighted-round-robin
const configuration = {
    providers: [
        {
            name: ('jsdelivr-cdn' as TCDNProvider),
            cname: 'cname1.foo.com',
            weight: 50
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

    // The DNS TTL to be applied to DNS responses in seconds.
    defaultTtl: 20,
    availabilityThreshold: 90
};

const getHighest = (array: number[]): number => array.indexOf(Math.max(...array));
const getHighestByProperty = <T>(array: T[], property):T => array[getHighest(array.map(item => item[property]))];
const getSumByProperty = <T>(items:T[], property): number => items.reduce((sum, item) => sum += item[property],0)


async function onRequest(req: IRequest, res: IResponse) {
    const {providers, defaultTtl, availabilityThreshold} = configuration;

    const availableProviders = providers.filter(
        // uptime data for 10 minutes
        (provider) => fetchCdnRumUptime(provider.name) > availabilityThreshold
    );
    const totalWeight = getSumByProperty(availableProviders, 'weight');

    //Fallback
    if (availableProviders.length === 0 || totalWeight <= 0) {
        const CDNUptimeData = providers.map(
            // uptime data for 10 minutes
            (provider) => ({
                provider,
                uptime: fetchCdnRumUptime(provider.name)
            })
        );
        return {
            addr: getHighestByProperty(CDNUptimeData, 'uptime').provider.cname,
            ttl: defaultTtl
        };
    }
    if (availableProviders.length === 1) {
        return {
            addr: availableProviders[0].cname,
            ttl: defaultTtl
        };
    }

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

    return {
        addr: availableProviders[weightedProviderIndex].cname,
        ttl: defaultTtl
    }
}
