# Setting up Visual Studio Code

In some circumstances you may want to use 3rd part IDE such as Microsoft Visual Studio Code for your scripts creation. The thing is that you will need all type definitions to have hints and autocompletions working.

We presume that you already have VSCode, Node.js and npm, so you need to complete just couple of steps listed below:
1. Install TypeScript if you don't have it installed yet:
```
npm install -g typescript
```
2. Create your workspace at VSCode and create empty file `definitions.d.ts`:

![Alt text](img/vsc_setup_1.png?raw=true "Setup Step 1")

3. Log in to `PerfOps panel` and proceed to FlexBalancers page. You need to find out your personal publicId. It can be seen when you create new flexbalancer.
Just write it down.

![Alt text](img/vsc_setup_2.png?raw=true "Setup Step 2")

4. Open https://panel.perfops.net/users/YOUR_PUBLIC_ID/flexbalancers/custom/definitions.d.ts page, in my case it is `https://panel.perfops.net/users/0b62ec/flexbalancers/custom/definitions.d.ts`    

5. You will see list of your personal definitions:
```typescript
declare interface ICityResponse {
    readonly name: string;
    readonly geonameId: number;
}

declare interface IStateResponse {
    readonly name: string;
    readonly isoCode: TState;
    readonly geonameId: number;
}

declare interface ICountryResponse {
    readonly name: string;
    readonly isoCode: TCountry;
    readonly geonameId: number;
}


...


declare function onRequest(request: IRequest, response: IResponse);
```
 Select them all, Copy and Paste all that lines to that `definitions.d.ts` file that you have created at your workspace. Save the file.
 
 ![Alt text](img/vsc_setup_3.png?raw=true "Setup Step 3")

Now all hints related to types and functions are enabled, you can start writing your code!  

![Alt text](img/vsc_setup_4.png?raw=true "Setup Step 4")
![Alt text](img/vsc_setup_5.png?raw=true "Setup Step 5")
![Alt text](img/vsc_setup_6.png?raw=true "Setup Step 6")
