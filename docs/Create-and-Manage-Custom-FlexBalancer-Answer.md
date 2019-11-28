# Create and manage Custom FlexBalancer Answer

## Create FlexBalancer with custom answer 

First of all, log in and proceed to `FlexBalancers` page:

![Alt text](img/create_page_1.png?raw=true "Create Step 1")

Select name for your Balancer, `Custom code` button and press `Next step`:

![Alt text](img/create_page_2.png?raw=true "Create Step 2")

Then, fill in your `fallback` address. You may also select desired `TTL`. Then, press `Create New FlexBalancer` button: 

![Alt text](img/create_page_3.png?raw=true "Create Step 3")

Now, you have text editor open, so you can write or post there your custom code.

Supported language: `TypeScript`.

Editor: Monaco Editor, see [Monaco Editor Accessibility Guide](https://github.com/microsoft/monaco-editor/wiki/Monaco-Editor-Accessibility-Guide) for detailed info. 

![Alt text](img/create_page_4.png?raw=true "Create Step 4")

Notice, that you also are able to edit FlexBalancer description, Fallback and TTL:

![Alt text](img/create_page_5.png?raw=true "Create Step 5")

The text editor checks your code syntax for errors:

![Alt text](img/create_page_5_1.png?raw=true "Code validation 1")

And shows error details on mouse hover:

![Alt text](img/create_page_5_1_1.png?raw=true "Code validation 2")

And provides helpful hints (use `Ctrl+Space`) and auto-completion (use `Tab`):

![Alt text](img/create_page_5_2.png?raw=true "Hint 1")
![Alt text](img/create_page_5_3.png?raw=true "Hint 2")

After all changes are done and no errors remain, press `Test and Publish` button: 

![Alt text](img/create_page_6.png?raw=true "Create Step 6")

Confirm the deployment:

![Alt text](img/create_page_7.png?raw=true "Create Step 7")

The next page has important information, do not forget to copy/save `CNAME` record for further placement into domain settings for your domain, then press `Done`: 

![Alt text](img/create_page_8.png?raw=true "Create Step 8")

Now you can see your newly created FlexBalancer at `FlexBalancers` page:

![Alt text](img/create_page_9.png?raw=true "Create Step 9")

## Edit FlexBalancer with custom answer

To change your custom answer, proceed to `FlexBalancers` page and press square button with pen at your Balancer:

![Alt text](img/edit_flex_1.png?raw=true "Edit Step 1")

You can edit your code, FlexBalancer description, Fallback and TTL:

![Alt text](img/edit_flex_2.png?raw=true "Edit Step 2")

You are also able to turn your FlexBalancer off and even to Delete it:

![Alt text](img/edit_flex_3.png?raw=true "Edit Step 3")

After editing, press `Test and Publish` button, then `Deploy now`:

![Alt text](img/edit_flex_4.png?raw=true "Edit Step 4")

Do not forget to copy/save FlexBalancer name for placement into `CNAME` record of domain settings for your domain, then press `Done`:

![Alt text](img/edit_flex_5.png?raw=true "Edit Step 5")
 
## Delete FlexBalancer

Proceed to `FlexBalancers` page and press red square button with trashcan picture on it:

![Alt text](img/delete_flex_1.png?raw=true "Delete Step 1")

Confirm the deletion. Keep in mind that it may break your service:

![Alt text](img/delete_flex_2.png?raw=true "Delete Step 2")
