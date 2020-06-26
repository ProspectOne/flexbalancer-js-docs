## Case 4.1: Using country-based answers from remote sources <a name="case4.1"></a>

The Case: User has different CDN provider for each country and corresponding answers for that countries. The answers change frequently (our user experiments with different CDNs)
and our user does not want to keep his answers inside a configuration section of Custom script (let's imagine he does not like rewriting script every time one of answers changes). 
So the list of countries and answers is placed on remote source as JSON file and this file is being edited by our user from time to time.

The task is to write our script with the usage of some remote source for fetching that mentioned above answers list.

We have prepared some demo JSON file `answers.json` with country-answer relations, and placed it at our repo as https://github.com/ProspectOne/flexbalancer-js-docs/blob/master/demo/answers.json,
so it can be used for simple tests:
```json
{
	"UA": {
		"ttl": 20,
		"answers": "ua.perfops.net"
	},
	"PL": {
		"ttl": 25,
		"answers": "pl.perfops.net"
	}
}
```

Now it is time to create our script. The remote source must be specified inside `onSetup` function, so our balancer will 'known' about it once it is registered,
let's name it `mydata`:

```typescript

function onSetup():IApplicationConfig {
    return {
        remotes: {
            // Set up remote data source
            'mydata': { url: 'https://github.com/ProspectOne/flexbalancer-js-docs/blob/master/demo/answers.json' }
        }
    }
}
```

Let's proceed with our 'main' `onRequest` function.
Fitst, we should retrieve that json answers list from our remote source using [fetchRemote function](Custom-Answers-API#fetchremote):

```typescript
function onRequest(req: IRequest, res: IResponse) {
    // Collect data from fetched remote
    let stats = fetchRemote('mydata');
    ...
}
```
Then, we try to determine the user country with our `request` object:
```typescript
let userCountry = req.location.country;
```

The next part is simple. If we have successfully retrieved our answers list (`stats` is not empty) and also wew able to determine the user country -
we just parse our answers JSON and check if it contains the answer for that user country. Id it does - we set that answer, TTL and finish our script:

```typescript
function onRequest(req: IRequest, res: IResponse) {
    // Collect data from fetched remote
    let stats = fetchRemote('mydata');
    let userCountry = req.location.country;
    if(userCountry && stats) { // both are determined
        const parsed = JSON.parse(stats);
        if(parsed[userCountry]) { // if there is the answer for user country
            res.setAddr(parsed[userCountry].answers); // it is set as an answer
            res.setTTL(parsed[userCountry].ttl); // and we also set the corresponding TTL
            return;
        }
    }
    ...
}
``` 

And the last part - if we haven't got our list, or user's country is not in that list - we set some 'default' answer:
```typescript
    res.setAddr(`othercountry.perfops.net`);
    return;
```

**That's it!** The whole script looks like:

```typescript
function onSetup():IApplicationConfig {
    return {
        remotes: {
            // Set up remote data source
            'mydata': { url: 'https://github.com/ProspectOne/flexbalancer-js-docs/blob/master/demo/answers.json' }
        }
    }
}

function onRequest(req: IRequest, res: IResponse) {
    // Collect data from fetched remote
    let stats = fetchRemote('mydata');
    let userCountry = req.location.country;
    if(userCountry && stats) {
        const parsed = JSON.parse(stats);
        if(parsed[userCountry]) {
            res.setAddr(parsed[userCountry].answers);
            res.setTTL(parsed[userCountry].ttl);
            return;
        }
    }
    res.setAddr(`othercountry.perfops.net`);
    return;
}
```