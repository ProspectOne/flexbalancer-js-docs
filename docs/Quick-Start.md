# Create and manage Custom FlexBalancer Answer
1. [Create FlexBalancer with Custom Answer](#create-flexbalancer-with-custom-answer)
2. [Edit FlexBalancer with Custom Answer](#edit-flexbalancer-with-custom-answer)
3. [Delete FlexBalancer](#delete-flexbalancer)

## Create FlexBalancer with custom answer

First of all, log in and proceed to [FlexBalancers](https://panel.perfops.net/flexbalancers) page:

![Alt text](img/create_page_1.png?raw=true "Create Step 1")

Select name for your Balancer, `Custom code` button and press `Next Step`:

![Alt text](img/create_page_2.png?raw=true "Create Step 2")

Then, fill in your `fallback` address. You may also change default `TTL`, or keep it equal to 10. After that, press `Create New FlexBalancer` button: 

![Alt text](img/create_page_3.png?raw=true "Create Step 3")

Now, you have text editor open, so you can write or post there your custom code.

Supported language: `TypeScript`.

**Editor: Monaco Editor**, see [Monaco Editor Accessibility Guide](https://github.com/microsoft/monaco-editor/wiki/Monaco-Editor-Accessibility-Guide) for detailed info. Notice, that you also are able to edit FlexBalancer description, Fallback and TTL. 

Let's create our first Custom FlexBalancer with the simpliest logic: we will check uptime of `jsDelivr CDN` and if it is bigger that 98,5 - return answer 'google.com' with TTL 25, if not - return 'perfops.net' with default TTL (that you have set before).

```typescript
/* 
 * If jsDelivr uptime is bigger than 98,5 - return 'google.com' with TTL 25
 * else return 'perfops.net' with default TTL 
 */
function onRequest(req: IRequest, res: IResponse) {
    if(fetchCdnRumUptime('jsdelivr-cdn') > 98.5) { // if jsDelivr uptime is high
        res.setAddr('google.com'); // we set answer address to 'google.com' 
        res.setTTL(25); // with TTL = 25

        return; // return answer
    }
    // if jsDelivr uptime is lower than expected
    res.setAddr('perfops.net'); // we set answer address to 'perfops.net'
    return; // return answer
}
```
The text editor checks your code syntax for errors, shows error details on mouse hover and won't allow you to publish code with errors:

![Alt text](img/create_page_4.png?raw=true "Code validation 1")

It also 'knows' all definitions of our [[Custom Answers API|Custom-Answers-API]] (functions, type values for particular user) and provides helpful hints (use `Ctrl+Space`) and auto-completion (use `Tab`):

![Alt text](img/create_page_5.png?raw=true "Hint 1")
![Alt text](img/create_page_6.png?raw=true "Hint 2")

Now all changes are done and no errors remain, you simply press `Test and Publish` button and confirm the deployment:

![Alt text](img/create_page_7.png?raw=true "Create Step 7")

The next page has important information, do not forget to copy/save `CNAME` record for further placement into domain settings for your domain, then press `Done`: 

![Alt text](img/create_page_8.png?raw=true "Create Step 8")

Now you can see your newly created FlexBalancer at `FlexBalancers` page:

![Alt text](img/create_page_9.png?raw=true "Create Step 9")

Let's check if your Custom Answer works. After some time, when you already have made all nessessary `CNAME` changes - check CDN RUM Uptime at [CDNPerf](https://www.cdnperf.com/).
 You can see that RUM Uptime is higher than `98,5`.
 
![Alt text](img/cdn_statistics.png?raw=true "CDN Statistics 1")

So, according to rules that you have defined at Custom Answer, it should return `google.com` as response address. 

![Alt text](img/dig_results.png?raw=true "Dig results 1")

And it does! That means your FlexBalancer works perfectly!

You may want to take a look at our [[Tutorial|Tutorial]] and at more complicated script samples stored at our repository.

## Edit FlexBalancer with custom answer

To change your custom answer, proceed to `FlexBalancers` page and press square button with pen at your Balancer:

![Alt text](img/edit_flex_1.png?raw=true "Edit Step 1")

You can edit your code, FlexBalancer description, Fallback and TTL, turn your FlexBalancer off and even to Delete it:

![Alt text](img/edit_flex_3.png?raw=true "Edit Step 3")

After editing, press `Test and Publish` button, then `Deploy now`.

Do not forget to copy/save FlexBalancer name for placement into `CNAME` record of domain settings for your domain, then press `Done`:

![Alt text](img/edit_flex_5.png?raw=true "Edit Step 5")
 
## Delete FlexBalancer

Proceed to `FlexBalancers` page and press red square button with trashcan picture on it:

![Alt text](img/delete_flex_1.png?raw=true "Delete Step 1")

Confirm the deletion. Keep in mind that it may break your service:

![Alt text](img/delete_flex_2.png?raw=true "Delete Step 2")
