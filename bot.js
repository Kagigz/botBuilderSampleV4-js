// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const DIALOG_STATE_PROPERTY = 'dialogState';
const USER_PROFILE_PROPERTY = 'user';
const WHO_ARE_YOU = 'who_are_you';
const NAME_PROMPT = 'name_prompt';
const CONFIRM_PROMPT = 'confirm_prompt';
const AGE_PROMPT = 'age_prompt';

const QNA_DIALOG_STATE_PROPERTY = 'qnaDialogState';
const QNA_DIALOG = 'qna_dialog';
const QNA_PROMPT = 'qna_prompt';

const {ActivityTypes, CardFactory} = require('botbuilder');
const { ChoicePrompt, DialogSet, NumberPrompt, TextPrompt, WaterfallDialog } = require('botbuilder-dialogs');
const { LuisRecognizer, QnAMaker, QnAMakerEndpoint, QnAMakerOptions  } = require('botbuilder-ai');

class MyBot {
  /**   
   *
   * @param {ConversationState} conversation state object
   * @param {UserState} user state object
   * @param {QnAMakerEndpoint} endpoint The basic configuration needed to call QnA Maker. In this sample the configuration is retrieved from the .bot file.
   * @param {LuisApplication} luisApplication The basic configuration needed to call LUIS. In this sample the configuration is retrieved from the .bot file.
   * @param {LuisPredictionOptions} luisPredictionOptions (Optional) Contains additional settings for configuring calls to LUIS.
   * @param {IncludeApiResults} includeApiResults (Optional)
   * @param {QnAMakerOptions} config An optional parameter that contains additional settings for configuring a `QnAMaker` when calling the service.
   */
  constructor(conversationState, userState, endpoint, application, luisPredictionOptions, includeApiResults, qnaOptions) {

    this.luisRecognizer = new LuisRecognizer(application, luisPredictionOptions, true);
    this.qnaMaker = new QnAMaker(endpoint, qnaOptions);

    // Creates a new state accessor property.
    // See https://aka.ms/about-bot-state-accessors to learn more about the bot state and state accessors.

        // Create a new state accessor property. See https://aka.ms/about-bot-state-accessors to learn more about bot state and state accessors.
        this.conversationState = conversationState;
        this.userState = userState;    
        this.dialogState = this.conversationState.createProperty(DIALOG_STATE_PROPERTY);
        this.userProfile = this.userState.createProperty(USER_PROFILE_PROPERTY);
        this.dialogs = new DialogSet(this.dialogState);
    
        // Add prompts that will be used by the main dialogs.
        this.dialogs.add(new TextPrompt(NAME_PROMPT));
        this.dialogs.add(new ChoicePrompt(CONFIRM_PROMPT));
        this.dialogs.add(new NumberPrompt(AGE_PROMPT, async (prompt) => {
            if (prompt.recognized.succeeded) {
                if (prompt.recognized.value <= 0) {
                    await prompt.context.sendActivity(`Your age can't be less than zero.`);
                    return false;
                } else {
                    return true;
                }
            }
            return false;
        }));
    
        // Create a dialog that asks the user for their name.
        this.dialogs.add(new WaterfallDialog(WHO_ARE_YOU, [
            this.promptForName.bind(this),
            this.confirmAgePrompt.bind(this),
            this.promptForAge.bind(this),
            this.captureAge.bind(this)
        ]));

        this.qnaDialogState = this.conversationState.createProperty(QNA_DIALOG_STATE_PROPERTY);
        this.qnaDialogs = new DialogSet(this.qnaDialogState);
        this.qnaDialogs.add(new TextPrompt(QNA_PROMPT));
        this.qnaDialogs.add(new WaterfallDialog(QNA_DIALOG, [
            this.qnaQuestion.bind(this),
            this.qnaAnswer.bind(this)
        ]));

  }

  /**
   *
   * @param {TurnContext} on turn context object.
   */
  async onTurn(turnContext) {

    if (turnContext.activity.type === ActivityTypes.Message) {                

            const dc = await this.dialogs.createContext(turnContext);
            const qnadc = await this.qnaDialogs.createContext(turnContext);

              // If the bot has not yet responded, continue processing the current dialog.
              await dc.continueDialog();
              await qnadc.continueDialog();

              // Start the sample dialog in response to any other input.
              if (!turnContext.responded) {

                  const user = await this.userProfile.get(dc.context, {});

                  // LUIS PART 
                  if (user.name) {


                        // Perform a call to LUIS to retrieve results for the user's message.
                        const results = await this.luisRecognizer.recognize(turnContext);

                        // Since the LuisRecognizer was configured to include the raw results, get the `topScoringIntent` as specified by LUIS.
                        const topIntent = results.luisResult.topScoringIntent;

                        if (topIntent.intent !== 'None') {

                            // QNA MAKER PART
                            if (topIntent.intent == 'qna'){
                                await qnadc.beginDialog(QNA_DIALOG);
                            }
                            else{
                             await turnContext.sendActivity(`LUIS Top Scoring Intent: ${ topIntent.intent }, Score: ${ topIntent.score }`);
                            }

                        } else {
                            await turnContext.sendActivity(`I don't know how to help.`);
                        }

                  } 
                  
                  // DIALOG PART
                  else {
                      await dc.beginDialog(WHO_ARE_YOU);
                  }
              }


            // Save state changes
            await this.userState.saveChanges(turnContext);

            // End this turn by saving changes to the conversation state.
            await this.conversationState.saveChanges(turnContext);

        } else if (turnContext.activity.type === ActivityTypes.ConversationUpdate) {
            // Send greeting when users are added to the conversation.
            await this.sendWelcomeMessage(turnContext);
        } else {

            // Generic message for all other activities
            await turnContext.sendActivity(`[${ turnContext.activity.type } event detected]`);
        }

        
    }


    // Sends welcome messages to conversation members when they join the conversation.
    // Messages are only sent to conversation members who aren't the bot.
    async sendWelcomeMessage(turnContext) {
      // If any new members added to the conversation
      if (turnContext.activity && turnContext.activity.membersAdded) {
          // Define a promise that will welcome the user
          async function welcomeUserFunc(conversationMember) {
              // Greet anyone that was not the target (recipient) of this message.
              // The bot is the recipient of all events from the channel, including all ConversationUpdate-type activities
              // turnContext.activity.membersAdded !== turnContext.activity.aecipient.id indicates 
              // a user was added to the conversation 
              if (conversationMember.id !== this.activity.recipient.id) {
                  // Because the TurnContext was bound to this function, the bot can call
                  // `TurnContext.sendActivity` via `this.sendActivity`;
                  await this.sendActivity(`Welcome!`);
              }
          }
  
          // Prepare Promises to greet the  user.
          // The current TurnContext is bound so `replyForReceivedAttachments` can also send replies.
          const replyPromises = turnContext.activity.membersAdded.map(welcomeUserFunc.bind(turnContext));
          await Promise.all(replyPromises);
      }
  }

  // This step in the dialog prompts the user for their name.
  async promptForName(step) {
    return await step.prompt(NAME_PROMPT, `What is your name, human?`);
  }

  // This step captures the user's name, then prompts whether or not to collect an age.
  async confirmAgePrompt(step) {
    const user = await this.userProfile.get(step.context, {});
    user.name = step.result;
    await this.userProfile.set(step.context, user);
    await step.prompt(CONFIRM_PROMPT, 'Do you want to give your age?', ['yes', 'no']);
  }

  // This step checks the user's response - if yes, the bot will proceed to prompt for age.
  // Otherwise, the bot will skip the age step.
  async promptForAge(step) {
    if (step.result && step.result.value === 'yes') {
        return await step.prompt(AGE_PROMPT, `What is your age?`,
            {
                retryPrompt: 'Sorry, please specify your age as a positive number or say cancel.'
            }
        );
    } else {
        return await step.next(-1);
    }
  }

  // This step captures the user's age.
  async captureAge(step) {
    const user = await this.userProfile.get(step.context, {});
    if (step.result !== -1) {
        user.age = step.result;
        await this.userProfile.set(step.context, user);
        await step.context.sendActivity(`I will remember that you are ${ step.result } years old.`);
    } else {
        await step.context.sendActivity(`No age given.`);
    }
    return await step.endDialog();
  }

  // QNA MAKER PART
  
  async qnaQuestion(step) {
    return await step.prompt(QNA_PROMPT, `I'm now answering with information in my KB.`);
  }
  
  async qnaAnswer(step) {
    const qnaResults = await this.qnaMaker.generateAnswer(step.result);
    // If an answer was received from QnA Maker, send the answer back to the user.
    if (qnaResults[0]) {
        await step.context.sendActivity(qnaResults[0].answer);
    // If no answers were returned from QnA Maker, reply with help.
    } else {
        await step.context.sendActivity(`I don't know how to answer your question.`);
    }
  }
  
}

module.exports.MyBot = MyBot;