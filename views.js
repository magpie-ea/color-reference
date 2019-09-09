/** Wrapping views below

* Obligatory properties

    * trials: int - the number of trials this view will appear
    * name: string

* More about the properties and functions of the wrapping views - https://github.com/magpie-ea/magpie-modules/blob/master/docs/views.md#wrapping-views-properties

*/

const init = colorReferenceViews.init({
    trials: 1,
    name: "init",
    title: "Initializing"
});

const intro = magpieViews.intro({
    name: "intro",
    trials: 1,
    title: "Welcome!",
    text:
        'This is an example of an interactive experiment with _magpie. It is a replication of the color reference game. More information can be found <a href="https://magpie-ea.github.io/magpie-site/">here</a>.',
    buttonText: "Begin Experiment"
});

const instructions = magpieViews.instructions({
    trials: 1,
    name: "instructions",
    title: "General Instructions",
    text: `In this experiment, two participants interact with each other. In each trial, three colors are shown to the participants. Only the speaker knows which of the three colors is the <i>target</i> color. The speaker and the listener can talk to each other via a chat box. Once the listener feels confident enough, they will click on one of the colors. The experiment then moves on to the next trial.
    
    <br>
    <br>

    The first participant will be put in the "lobby" waiting for another participant to join. Once two participants are matched with each other, the experiment starts.
    `,
    buttonText: "To the Lobby"
});

const lobby = colorReferenceViews.interactiveExperimentLobby({
    name: "lobby",
    trials: 1,
    title: "Lobby",
    text: "Connecting to the server..."
});

const game = colorReferenceViews.game({
    name: "game",
    trials: 5,
    title: "Color Reference Game"
});

const postTest = magpieViews.postTest({
    name: "postTest",
    trials: 1,
    title: "Questions",
    text: `Some text...`,
    buttonText: "Continue"
});

// submits the results
const thanks = colorReferenceViews.thanksWithSocket({
    trials: 1,
    name: "thanks",
    title: "Thank you for taking part in this experiment!",
    prolificConfirmText: "Press the button"
});

/** trial (magpie's Trial Type Views) below

* Obligatory properties

    - trials: int - the number of trials this view will appear
    - name: string
    - trial_type: string - the name of the trial type as you want it to appear in the submitted data
    - data: array - an array of trial objects


* Optional properties

    - pause: number (in ms) - blank screen before the fixation point or stimulus show
    - fix_duration: number (in ms) - blank screen with fixation point in the middle
    - stim_duration: number (in ms) - for how long to have the stimulus on the screen
        More about trial lifecycle - https://github.com/magpie-ea/magpie-modules/blob/master/docs/views.md#trial-views-lifecycle

    - hook: object - option to hook and add custom functions to the view   
        More about hooks - https://github.com/magpie-ea/magpie-modules/blob/master/docs/views.md#trial-views-hooks

* All about the properties of trial - https://github.com/magpie-ea/magpie-modules/blob/master/docs/views.md#properties-of-trial

*/
