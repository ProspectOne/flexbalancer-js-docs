# How to use Logger feature

We have provided simple and powerful feature that makes your "flex-balancing" more comfortable. You can log any events and data using `logger.write`:

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

declare const logger: ILogger;
```

Let's see how it works. We should create a simplest Custom type balancer and add logging to its code:
```typescript
function onRequest(req: IRequest, res: IResponse) {
    res.setCNAMERecord('my.sampleanswer.net');
    logger.write('it should return: my.sampleanswer.net');
}
```
In fact it does nothing useful - returns the same answer, but the goal was to test our logging feature. 
So let's Publish it and make couple dozens of `dig` tests, using any of approaches described in <a href="https://perfops.net/support/flexbalancers/how-to-test-my-flexbalancer" target="_blank">How to test my FlexBalancer?</a> tutorial.

![Alt text](img/logger_1.png?raw=true "Dig tests")

We get some responses and now we need to check our logs. Log in to [PerfOps Panel Analytics](https://panel.perfops.net/) page, select FlexBalancer and that balancer we have created:

![Alt text](img/logger_2.png?raw=true "Select your balancer")

Apply any filters and take a look at raw logs section below:

![Alt text](img/logger_3.png?raw=true "Raw logs")

`View meta` brings up a window with detailed information, where we can see our log message!

![Alt text](img/logger_4.png?raw=true "Log info")

So, now you can log different events depending on your FlexBalancer logic and needs!

Let's make an error and log it. Mixing of A and CNAME records is not allowed for our responses, so the code below will definitely produce an error:

```typescript
function onRequest(req: IRequest, res: IResponse) {
    try {
        res.setARecord('192.168.1.1');
        res.setCNAMERecord('do.something.for.test.net'); 
    } catch(error) {
        logger.write(error.message); // Here we log our error 
    }
    return; // return answer
}
```
Let's publish and test this balancer. Dig returns:
 
![Alt text](img/logger_5.png?raw=true "Dig")

And if we look at our raw logs - we will see our 'caught' error message:

![Alt text](img/logger_6.png?raw=true "Error")

Easy and helpful, isnt' it?