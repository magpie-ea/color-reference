/** Wrapping views below

* Obligatory properties

    * trials: int - the number of trials this view will appear
    * name: string

* More about the properties and functions of the wrapping views - https://github.com/magpie-ea/magpie-modules/blob/master/docs/views.md#wrapping-views-properties

*/

const init = color_ref_views.init({
    trials: 1,
    name: "init",
    title: "Initializing"
});

const intro = magpieViews.view_generator("intro",{
    name: "intro",
    trials: 1,
    title: "Welcome!",
    text:
        'Thank you for participating in our study. In this study, you will be paired with another MTurk worker and are asked to communicate and identify colors. It will take approximately <strong>3</strong> minutes.',
    // legal_info:
    //     '<strong>LEGAL INFORMATION</strong>:<br><br>We invite you to participate in a research study on language production and comprehension.<br>Your experimenter will ask you to do a linguistic task such as reading sentences or words, naming pictures or describing scenes, making up sentences of your own, or participating in a simple language game.<br><br>You will be paid for your participation at the posted rate.<br><br>There are no risks or benefits of any kind involved in this study.<br><br>If you have read this form and have decided to participate in this experiment, please understand your participation is voluntary and you have the right to withdraw your consent or discontinue participation at any time without penalty or loss of benefits to which you are otherwise entitled. You have the right to refuse to do particular tasks. Your individual privacy will be maintained in all published and written data resulting from the study.<br>You may print this form for your records.<br><br>CONTACT INFORMATION:<br>If you have any questions, concerns or complaints about this research study, its procedures, risks and benefits, you should contact the Protocol Director Meghan Sumner at <br>(650)-725-9336<br><br>If you are not satisfied with how this study is being conducted, or if you have any concerns, complaints, or general questions about the research or your rights as a participant, please contact the Stanford Institutional Review Board (IRB) to speak to someone independent of the research team at (650)-723-2480 or toll free at 1-866-680-2906. You can also write to the Stanford IRB, Stanford University, 3000 El Camino Real, Five Palo Alto Square, 4th Floor, Palo Alto, CA 94306 USA.<br><br>If you agree to participate, please proceed to the study tasks.',
    buttonText: "Begin Experiment"
});

const instructions = magpieViews.view_generator("instructions", {
    trials: 1,
    name: "instructions",
    title: "General Instructions",
    text: `In this experiment you will play a communication game with another MTurk worker. In each round, you and your partner are shown three color patches. One of you will see a thick black border around one of those patches. This player will be called the <strong>manager</strong>. The other player is the <strong>intern</strong>. It's the goal in each round that the intern can find and click on that color. The manager needs to tell the intern which color patch they need to click on. 

    <br>
    <br>

    You can talk to each other freely over a chat box. Remember that both of you can see the same colors but in a scrambled order, which means that <strong>information about the location is not useful</strong>. Once the intern feels confident enough, they can click on one of the colors. The experiment then moves on to the next round. The roles will be assigned at random.
    
    <br>
    <br>

    You can now enter the lobby to wait for a partner. The matching procedure should be fairly quick, so please pay attention and don't let your partner wait.
    `,
    buttonText: "To the Lobby"
});

const lobby = color_ref_views.interactiveExperimentLobby({
    name: "lobby",
    trials: 1,
    title: "Lobby",
    text: "Connecting to the server..."
});

const game = color_ref_views.game({
    name: "game",
    trials: main_trials.color_ref.length,
    title: "Color Reference Game",
    data: main_trials.color_ref
});

const postTest = magpieViews.view_generator("post_test", {
    name: "postTest",
    trials: 1,
    title: "Additional Info",
    text: "Answering the following questions is optional, but will help us understand your answers.",
    buttonText: "Continue"},
    {answer_container_generator: function(config, CT) {
            const quest = magpieUtils.view.fill_defaults_post_test(config);
            return `<form>
                    <p class='magpie-view-text'>
                        <label for="age">${quest.age.title}:</label>
                        <input type="number" name="age" min="18" max="110" id="age" />
                    </p>
                    <p class='magpie-view-text'>
                        <label for="gender">${quest.gender.title}:</label>
                        <select id="gender" name="gender">
                            <option></option>
                            <option value="${quest.gender.male}">${quest.gender.male}</option>
                            <option value="${quest.gender.female}">${quest.gender.female}</option>
                            <option value="${quest.gender.other}">${quest.gender.other}</option>
                        </select>
                    </p>
                    <p class='magpie-view-text'>
                        <label for="education">${quest.edu.title}:</label>
                        <select id="education" name="education">
                            <option></option>
                            <option value="${quest.edu.graduated_high_school}">${quest.edu.graduated_high_school}</option>
                            <option value="${quest.edu.graduated_college}">${quest.edu.graduated_college}</option>
                            <option value="${quest.edu.higher_degree}">${quest.edu.higher_degree}</option>
                        </select>
                    </p>
                    <p class='magpie-view-text'>
                        <label for="bot">Do you think your partner was a bot or a human?</label>
                        <select id="bot" name="bot">
                            <option></option>
                            <option value="bot">Bot</option>
                            <option value="human">Human</option>
                        </select>
                    </p>
                    <p class='magpie-view-text'>
                        <label for="fun">Did you have fun?</label>
                        <select id="fun" name="fun">
                            <option></option>
                            <option value="yes">yes</option>
                            <option value="no">no</option>
                        </select>
                    </p>
                    <p class='magpie-view-text'>
                        <label for="languages" name="languages">${quest.langs.title}:<br /><span>${quest.langs.text}</</span></label>
                        <input type="text" id="languages"/>
                    </p>
                    <p class="magpie-view-text">
                        <label for="comments">${quest.comments.title}</label>
                        <textarea name="comments" id="comments" rows="6" cols="40"></textarea>
                    </p>
                    <button id="next" class='magpie-view-button'>${config.button}</button>
            </form>`
        },
    handle_response_function: function(config, CT, magpie, answer_container_generator, startingTime) {
        $(".magpie-view").append(answer_container_generator(config, CT));

        $("#next").on("click", function(e) {
            // prevents the form from submitting
            e.preventDefault();

            // records the post test info
            magpie.global_data.bot = $("#bot").val();
            magpie.global_data.fun = $("#fun").val();
            magpie.global_data.age = $("#age").val();
            magpie.global_data.gender = $("#gender").val();
            magpie.global_data.education = $("#education").val();
            magpie.global_data.languages = $("#languages").val();
            magpie.global_data.comments = $("#comments")
                .val()
                .trim();
            magpie.global_data.endTime = Date.now();
            magpie.global_data.timeSpent =
                (magpie.global_data.endTime -
                    magpie.global_data.startTime) /
                60000;

            // moves to the next view
            magpie.findNextView();
        });
    }}
);

// submits the results
const thanks = color_ref_views.thanksWithSocket({
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
