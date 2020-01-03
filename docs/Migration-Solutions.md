Sometimes we face a sitiation when a customer decides to migrate from one to another balancing system and he has a bunch of own scripts. And yes - all those are to be changed to fit a new environment.

We have prepared a couple of real script samples that were rewritten for the PerfOps Custom Answers Environment and also explained those using 'step-by-step tutorial' format to make script logic more clear. We will also use the recommended structure we have described at [Basic Structure](Advanced-Use-Cases#basic-structure) section of [Advanced Use Cases](Advanced-Use-Cases) for the scripts. The cases are quite typical so you might find those useful.

* [Solution 1: The Optimal Round Trip Time with The Monitor Availability.](Solution-1)
* [Solution 2: The Performance with Penalty and Availability.](Solution-2)
* [Solution 3: The Weighted Random Selection.](Solution-3)
* [Solution 4: Multi Geo-Random with Monitor Overrides.](Solution-4)

# Migration Solutions: <a name="migration-solutions"></a> 
## Solution 1: The Optimal Round Trip Time with The Monitor Availability. <a name="solution1"></a>

The Case: we have the bunch of answers, that are inspected by our previously created [Monitors](https://panel.perfops.net/monitors). 
We need to get answer that has:
* Corresponding Monitor online, 
* CDN provider availability for the last hour higher than 90%
* The best CDN provider performance for the last hour. 

In case of all monitors are down it should simply return a random answer. And if all CDN uptimes are 'poor' it should fall back with the answer that has the highest provider uptime. [See the Solution](Solution-1)
## Solution 2: The Performance with Penalty and Availability. <a name="solution2"></a>
The Case: we need to select the answer with the best provider performance and uptime(availability) bigger than 97 percents (both for the last hour, as it is provided by `fetchCdnRumUptime` and `fetchCdnRumPerformance` [functions](Custom-Answers-API#fetchcdnrumuptime)). 

We also want to apply penalty for the particular provider performance, making it bigger...

**Why?**

Well, it might happen that one of our CDN Providers has stable better performance statistics than others and thus always will be the only one selected, so all our 'balancing' with the single provider will make no sense. So we are going to apply 'penalty' - let's call it `padding` and worsen the performance results with the purpose to have our answers balanced.

If all providers have 'low' availability for the last hour - we will use the `default` provider. [See the Solution](Solution-2) 
## Solution 3: The Weighted Random Selection. <a name="solution3"></a>
In this example we will add 'weight' properties to our providers. We will also have the availability threshold and if all providers uptimes are less or equal to that (or only one provider 'passes' test) - will simply return the answer based on 'cname' related to the provider with the best uptime for the last hour. And if we have more than one provider with required availability - we will choose the answer based on the weighted random selection that will use our new 'weight' property. We will use our [fetchCDN-functions](Custom-Answers-API#fetchcdnrumuptime) to get CDNs uptimes and performances. [See the Solution](Solution-3)
## Solution 4: Multi Geo-Random with Monitor Overrides <a name="solution4"></a>
This one is the 'full' version of the script that we used in our [Tutorial](Tutorial#countrieswithrandom). 

The goal is:
* to define specific answers (and even answer sets) for particular countries
* to provide random selection logic in case if there is more than one answer candidate for the country 
* to implement boolean property `requireMonitorData` that validates only answers with Monitors online (if set to `true`)

If country is not in our list - we will use a random answer from our list. In this case, if Monitors validation is 'on' and there are no answers with Monitors online at all - we should fall back. [See the Solution](Solution-4)
