# Sample Bot: Luis + QnA Maker + Dialogs implementation in javascript (Microsoft Bot Builder SDK v4)

Bot.js and index.js files for a sample bot with Luis, QnA Maker and Dialogs implementation.

You can use LuisRecognizer to recognize Luis Intents, Qna Maker and the Dialogs library with this sample.


## Bot example

In this sample, the first time a user speaks to the bot, it triggers a dialog.
Then, it states which Luis intent is the best match.
If the top scoring intent is a special intent called "qna", it triggers a new dialog and the next thing the user says will be answered from QnA Maker.

## How to use

**1. Create your js bot locally** 

Quickstart [here](https://docs.microsoft.com/en-us/azure/bot-service/javascript/bot-builder-javascript-quickstart?view=azure-bot-service-4.0)

**2. Create your LUIS service [here](https://www.luis.ai/) ([here](https://eu.luis.ai/) for West Europe and [here](https://au.luis.ai/) for Australia) and add intents**

/!\ If you want to test this sample _as is_, make sure you create an intent called "qna" with example utterances such as "qnamaker" to invoke QnA Maker

**3. Create your QnA Maker service [here](https://www.qnamaker.ai/) and populate your Knowledge Base**

**4. In your bot's folder, run**
```bash
npm install luis qnamaker msbot
```
**5. Connect to your LUIS service by running**
```bash
luis init
```
You will be prompted for your settings that you can find on the LUIS portal, in the _Manage_ tab.
- _Application ID_ is in _Application Information_
- _Authoring key_ and _API key_ (Key 1 or Key 2) are in _Keys and Enpoints_

**6. Connect to your QnA Maker service by running**
```bash
qnamaker init
```
You will be prompted for your settings that you can find on the QnA Maker portal, in the _Settings_ tab.
Under _Deployment Details_, you'll find all the information you need:
```
POST /knowledgebases/<APPLICATION_ID>/generateAnswer
Host: https://qnamakerteamsbot.azurewebsites.net/qnamaker
Authorization: EndpointKey <ENDPOINT_KEY>
Content-Type: application/json
{"question":"<Your question>"}
```

**7. Update your .bot file by running**
```bash
luis get application --appId <your-app-id> --msbot | msbot connect luis --stdin
qnamaker get kb --kbId <your-kb-id> --msbot | msbot connect qna --stdin
```

Your .bot file should now look like this:
```
{
    "name": "<NAME_OF_YOUR_BOT",
    "description": "",
    "services": [
        {
            "type": "endpoint",
            "name": "development",
            "endpoint": "http://localhost:3978/api/messages",
            "appId": "",
            "appPassword": "",
            "id": "1"
        },
        {
            "type": "luis",
            "name": "<NAME_OF_LUIS_SERVICE>",
            "appId": "<APP_ID>",
            "version": "0.1",
            "authoringKey": "<AUTHORING_KEY>",
            "subscriptionKey": "<SUBSCRIPTION_KEY>",
            "region": "westeurope",
            "id": "47"
        },
        {
            "type": "qna",
            "name": "NAME_OF_QNA_SERVICE>",
            "kbId": "<KB_ID>",
            "subscriptionKey": "<SUBSCRIPTION_KEY>",
            "endpointKey": "<ENDPOINT_KEY>",
            "hostname": "https://qnamakerteamsbot.azurewebsites.net/qnamaker",
            "id": "116"
        }
    ],
    "padlock": "",
    "version": "2.0"
}
```

**8. Install botbuilder-ai and botbuilder-dialogs by running**
```bash
npm install --save botbuilder-ai botbuilder-dialogs
```

**9. Replace your bot.js and index.js files with the ones in this repo**

### You can now use either LUIS, QnA Maker and/or the Dialogs library however you wish. 







