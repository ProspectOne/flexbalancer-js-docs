const configuration = {
    providers: [
        {
            name: ('custom_defined_measured_cdn' as TCDNProvider),
            cname: 'www.custom-cdn.com',
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
    defaultTtl: 300
};

function rankPlatforms(cdnPerformanceData) {

    // Get array of all providers and rtt in milliseconds
    // for each one.
    const maxPoints = 1000;
    const min = Math.min(...cdnPerformanceData.map((item) => item.perf));
    const { providers, profiles, defaultProfile } = configuration;

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

const getHighest = (array: number[]): number => array.indexOf(Math.max(...array));

const getRandomProvider = () => {
    const { providers } = configuration;
    return providers[Math.floor(Math.random() * providers.length)];
};

async function onRequest(request: IRequest, response: IResponse): Promise<IResponse> {
    const { providers, defaultTtl } = configuration;
    const { continent } = request.location;

    const availableProviders = providers.filter(
        (provider) =>
            (continent &&
                fetchCdnRumUptime(provider.name, 'continent', continent) ||
                fetchCdnRumUptime(provider.name)) > 80 // uptime data for 10 minutes
    );

    if (!availableProviders.length) { //availableProviders
        return {
            addr: getRandomProvider().cname,
            ttl: defaultTtl
        };
    }

    const cdnPerformanceData = availableProviders.map(
        (provider) => ({
            provider,
            perf:
                continent &&
                fetchCdnRumPerformance(provider.name, 'continent', continent) ||
                fetchCdnRumPerformance(provider.name)
        })
    );

    const totalScores = calculateTotalScore(
        cdnPerformanceData,
        rankPlatforms(cdnPerformanceData),
        request.location.continent
    );

    return {
        addr: cdnPerformanceData[getHighest(totalScores)].provider.cname,
        ttl: defaultTtl
    }
}