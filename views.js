/** Wrapping views below

* Obligatory properties

    * trials: int - the number of trials this view will appear
    * name: string

* More about the properties and functions of the wrapping views - https://github.com/babe-project/babe-project/blob/master/docs/views.md#wrapping-views-properties

*/

let intro = babeViews.intro({
    name: "intro",
    trials: 1,
    title: "Welcome!",
    text:
        'This is an example of an interactive experiment with _babe. It is a replication of the color reference game. More information can be found <a href="https://babe-project.github.io/babe_site/">here</a>.',
    buttonText: "Begin Experiment"
});

const instructions = babeViews.instructions({
    trials: 1,
    name: "instructions",
    title: "General Instructions",
    text: `In this experiment, two participants interact with each other. In each trial, three colors are shown to the participants. Only the speaker knows which of the three colors is the <i>target</i> color. The speaker and the listener can talk to each other via a chat box. Once the listener feels confident enough, they will click on one of the colors. The experiment then moves on to the next trial.
    
    <br>

    The first participant will be put in the "lobby" waiting for another participant to join. Once two participants are matched with each other, the experiment starts.
    `,
    buttonText: "To the Lobby"
});

const lobby = colorReferenceViews.lobby({
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

// submits the results
const thanks = babeViews.thanks({
    trials: 1,
    name: "thanks",
    title: "Thank you for taking part in this experiment!",
    prolificConfirmText: "Press the button"
});

/** trial (babe's Trial Type Views) below

* Obligatory properties

    - trials: int - the number of trials this view will appear
    - name: string
    - trial_type: string - the name of the trial type as you want it to appear in the submitted data
    - data: array - an array of trial objects


* Optional properties

    - pause: number (in ms) - blank screen before the fixation point or stimulus show
    - fix_duration: number (in ms) - blank screen with fixation point in the middle
    - stim_duration: number (in ms) - for how long to have the stimulus on the screen
        More about trial lifecycle - https://github.com/babe-project/babe-project/blob/master/docs/views.md#trial-views-lifecycle

    - hook: object - option to hook and add custom functions to the view   
        More about hooks - https://github.com/babe-project/babe-project/blob/master/docs/views.md#trial-views-hooks

* All about the properties of trial - https://github.com/babe-project/babe-project/blob/master/docs/views.md#properties-of-trial

*/
