const colorReferenceViews = {
    init: function(config) {
        const _init = {
            name: config.name,
            title: config.title,
            text: config.text || "Initializing the experiment...",
            render: function(CT, magpie) {
                const viewTemplate = `
                        <div class="magpie-view">
                            <h1 class="magpie-view-title">${this.title}</h1>
                            <section class="magpie-text-container">
                                <p id="lobby-text" class="magpie-view-text">${
                                    this.text
                                }</p>
                            </section>
                        </div>
                `;

                $("#main").html(viewTemplate);

                // Hopefully by telling them upfront they will stop the HIT before ever taking it.
                magpie.onSocketError = function(reasons) {
                    window.alert(
                        `Sorry, a connection to our server couldn't be established. You may want to wait and try again. If the error persists, do not proceed with the HIT. Thank you for your understanding. Error: ${reasons}`
                    );
                };

                magpie.onSocketTimeout = function() {
                    window.alert(
                        `Sorry, the connection to our server timed out. You may want to wait and try again. If the error persists, do not proceed with the HIT. Thank you for your understanding. `
                    );
                };

                // Generate a unique ID for each participant.
                magpie.participant_id = colorReferenceUtils.generateId(40);

                // Create a new socket
                // Documentation at: https://hexdocs.pm/phoenix/js/
                magpie.socket = new Phoenix.Socket(magpie.deploy.socketURL, {
                    params: {
                        participant_id: magpie.participant_id,
                        experiment_id: magpie.deploy.experimentID
                    }
                });

                // Set up what to do when the whole socket connection crashes/fails.
                magpie.socket.onError(() =>
                    magpie.onSocketError(
                        "The connection to the server was dropped."
                    )
                );

                // Not really useful. This will only be invoked when the connection is explicitly closed by either the server or the client.
                // magpie.socket.onClose( () => console.log("Connection closed"));

                // Try to connect to the server.
                magpie.socket.connect();

                // First join the participant channel belonging only to this participant.
                magpie.participantChannel = magpie.socket.channel(
                    `participant:${magpie.participant_id}`,
                    {}
                );

                magpie.participantChannel.on(
                    "experiment_available",
                    (payload) => {
                        // First record the assigned <variant-nr, chain-nr, realization-nr> tuple.
                        magpie.variant = payload.variant;
                        magpie.chain = payload.chain;
                        magpie.realization = payload.realization;
                        // Proceed to the next view if the connection to the participant channel was successfully established.
                        magpie.findNextView();
                    }
                );

                magpie.participantChannel
                    .join()
                    // Note that `receive` functions are for receiving a *reply* from the server after you try to send it something, e.g. `join()` or `push()`.
                    // While `on` function is for passively listening for new messages initiated by the server.
                    .receive("ok", (payload) => {
                        // We still need to wait for the actual confirmation message of "experiment_available". So we do nothing here.
                    })
                    .receive("error", (reasons) => {
                        magpie.onSocketError(reasons);
                    })
                    .receive("timeout", () => {
                        magpie.onSocketTimeout();
                    });
            },
            CT: 0,
            trials: config.trials
        };
        return _init;
    },
    interactiveExperimentLobby: function(config) {
        const _lobby = {
            name: config.name,
            title: config.title,
            text: config.text || "Connecting to the server...",
            render: function(CT, magpie) {
                const viewTemplate = `
                    <div class="magpie-view">
                        <h1 class="magpie-view-title">${this.title}</h1>
                        <section class="magpie-text-container">
                            <p id="lobby-text" class="magpie-view-text">${
                                this.text
                            }</p>
                        </section>
                    </div>
                `;

                $("#main").html(viewTemplate);

                magpie.trial_counter = 0;

                // This channel will be used for all subsequent group communications in this one experiment.
                magpie.gameChannel = magpie.socket.channel(
                    `interactive_room:${magpie.deploy.experimentID}:${
                        magpie.chain
                    }:${magpie.realization}`,
                    { participant_id: magpie.participant_id }
                );

                // We don't really need to track the presence on the client side for now.
                // magpie.lobbyPresence = new Phoenix.Presence(magpie.gameChannel);

                magpie.gameChannel
                    .join()
                    .receive("ok", (msg) => {
                        document.getElementById("lobby-text").innerHTML =
                            "Successfully joined the lobby. Waiting for other participants...";
                    })
                    .receive("error", (reasons) => {
                        magpie.onSocketError(reasons);
                    })
                    .receive("timeout", () => {
                        magpie.onSocketTimeout();
                    });

                /* If we want to make the lobby view reusable, we might want to extract the few functions below into a new view particular to this experiment. They could not be put into gameView because otherwise the same channel listener would be repeatedly attached multiple times. */
                let fillColor = function(div, color, type) {
                    div.classList.remove([
                        "target",
                        "distractor1",
                        "distractor2"
                    ]);

                    div.classList.add(type);

                    if (type == "target" && magpie.variant == 1) {
                        div.classList.add("speaker-target");
                    }

                    div.style[
                        "background-color"
                    ] = colorReferenceUtils.produceColorStyle(color);

                    div.dataset.type = type;
                };

                let saveTrialData = function(prev_round_trial_data) {
                    // These could be different for each participant, thus they fill them in before recording them.
                    prev_round_trial_data["variant"] = magpie.variant;
                    prev_round_trial_data["chain"] = magpie.chain;
                    prev_round_trial_data["realization"] = magpie.realization;

                    magpie.trial_data.push(prev_round_trial_data);
                };

                let setUpOneRound = function(colors) {
                    // Seems that we just have to store them globally somewhere.
                    let indices = [0, 1, 2];
                    colorReferenceUtils.shuffleArray(indices);

                    let color_divs = document.getElementsByClassName(
                        "color-div"
                    );
                    let count = 0;
                    for (let [type, color] of Object.entries(colors)) {
                        fillColor(color_divs[indices[count]], color, type);
                        count += 1;
                    }

                    // Only the listener can select a response apparently.
                    if (magpie.variant == 2) {
                        // The problem is that the CT cannot be properly obtained from the arguments because this view is not the actual game view.
                        magpie.trial_counter += 1;

                        for (let div of color_divs) {
                            div.onclick = (e) => {
                                // Note that we can only record the reaction time of the guy who actively ended this round. Other interactive experiments might have different requirements though.
                                const RT = Date.now() - magpie.startingTime;
                                const trial_data = {
                                    trial_type: config.trial_type,
                                    trial_number: magpie.trial_counter,
                                    color_first_distractor:
                                        colors["firstDistractor"],
                                    color_second_distractor:
                                        colors["secondDistractor"],
                                    color_target: colors["target"],
                                    selected_type: div.dataset.type,
                                    selected_color:
                                        div.style["background-color"],
                                    // Better put them into one single string.
                                    conversation: magpie.conversation.join("\n"),
                                    RT: RT
                                };

                                console.log(
                                    `trial_counter is ${
                                        magpie.trial_counter
                                    }, num_game_trials is ${
                                        magpie.num_game_trials
                                    }`
                                );
                                if (magpie.trial_counter < magpie.num_game_trials) {
                                    magpie.gameChannel.push("next_round", {
                                        colors: colorReferenceUtils.sampleColors(),
                                        prev_round_trial_data: trial_data
                                    });
                                } else {
                                    magpie.gameChannel.push("end_game", {
                                        prev_round_trial_data: trial_data
                                    });
                                }
                            };
                        }
                    }
                };

                // When the server tells the participant it's time to start the game with the "start_game" message (e.g. when there are enough participants for the game already for this game), the client side JS does the preparation work (e.g. initialize the UI)
                // The payload contains two pieces of information: `lounge_id` and `nth_participant`, which indicates the rank of the current participant among all participants for this game.
                magpie.gameChannel.on("start_game", (payload) => {
                    // Set a global state noting that the experiment hasn't finished yet.
                    magpie.gameFinished = false;

                    // Add a callback to handle situations where one of the participants leaves in the middle of the experiment.
                    magpie.gameChannel.on("presence_diff", (payload) => {
                        if (magpie.gameFinished == false) {
                            window.alert(
                                "Sorry. Somebody just left this interactive experiment halfway through and thus it can't be finished! Please contact us to still be reimbursed for your time."
                            );
                            // TODO: Figure out what exactly to do when this happens.
                            // We might not want to submit the results. If we submit, we'd also need to make sure that the participant who dropped out's ExperimentStatus is also marked as "completed" correctly.
                            // magpie.submission = colorReferenceUtils.magpieSubmitWithSocket(
                            //     magpie
                            // );
                            // magpie.submission.submit(magpie);
                        }
                    });

                    // One of the participants need to generate and send the data for the very first round.
                    if (magpie.variant == 2) {
                        magpie.gameChannel.push("initialize_game", {
                            colors: colorReferenceUtils.sampleColors()
                        });
                    }
                });

                // Display the message received from the server upon `new_msg` event.
                magpie.gameChannel.on("new_msg", (payload) => {
                    let chatBox = document.querySelector("#chat-box");
                    let msgBlock = document.createElement("p");
                    msgBlock.classList.add("magpie-view-text");
                    msgBlock.insertAdjacentHTML(
                        "beforeend",
                        `${payload.message}`
                    );
                    chatBox.appendChild(msgBlock);
                    magpie.conversation.push(payload.message);
                });

                // Things to do on initialize_game, next_round and end_game are slightly different.
                // Another way is to tell them apart via some payload content. But the following way also works.
                magpie.gameChannel.on("initialize_game", (payload) => {
                    // We run findNextView() to advance to the next round.
                    magpie.findNextView();

                    setUpOneRound(payload.colors);
                });

                // Get information regarding the next round and do the corresponding work.
                magpie.gameChannel.on("next_round", (payload) => {
                    saveTrialData(payload.prev_round_trial_data);

                    // We run findNextView() to advance to the next round.
                    magpie.findNextView();

                    setUpOneRound(payload.colors);
                });

                // Only save the data and do nothing else
                magpie.gameChannel.on("end_game", (payload) => {
                    magpie.gameFinished = true;
                    saveTrialData(payload.prev_round_trial_data);

                    magpie.findNextView();
                });
            },
            CT: 0,
            trials: config.trials
        };

        return _lobby;
    },
    game: function(config) {
        const _game = {
            name: config.name,
            title: config.title,
            render: function(CT, magpie) {
                const viewTemplate = `
                    <div class='magpie-view'>
                        <h1 id="title" class='magpie-view-title'>${
                            this.title
                        }</h1>
                        <section class="magpie-text-container">
                            <p id="game-instructions" class="magpie-view-text">                            </p></section>
                            <br/>
                            <br/>
                        <div id="chat-box"></div>

                            <div class="magpie-view-answer-container">
                        <form id="chat-form">
                            <textarea cols=50 class='magpie-response-text'
                                placeholder="Send message to the other participant."
                                id="participant-msg"
                            ></textarea>
                            <button type="submit" class="magpie-view-button">Send</button>
                        </form>
                        </div>

                        <div class="color-container magpie-view-stimulus-container">
                            <div class="color-div color-div-1"></div>
                            <div class="color-div color-div-2"></div>
                            <div class="color-div color-div-3"></div>
                        </div>
                    </div>
                `;

                $("#main").html(viewTemplate);

                // We need to store this as a global variable. See above.
                magpie.num_game_trials = config.trials;

                // Set the role of the participant based on the variant assigned.
                magpie.role = magpie.variant == 1 ? "speaker" : "listener";

                /* For initializing the UI when the game begins */
                let initializeUI = function(role) {
                    let title = document.getElementById("title");
                    let instructions = document.getElementById(
                        "game-instructions"
                    );
                    if (role == "speaker") {
                        title.innerText = "You are the speaker";
                        instructions.innerText =
                            "Send messages to tell the listener which object is the target (the one with the border)";
                    } else if (role == "listener") {
                        title.innerText = "You are the listener";
                        instructions.innerText =
                            "Communicate with the speaker using the chatbox. Click on the target object which the speaker is telling you about once you feel confident enough.";
                    }
                };

                magpie.conversation = [];

                // Messages are sent to each other via the `new_msg` event.
                // I think we have to clone the element if we
                document
                    .getElementById("chat-form")
                    .addEventListener("submit", function(e) {
                        e.preventDefault();

                        let text = document.getElementById("participant-msg")
                            .value;
                        magpie.gameChannel.push("new_msg", {
                            message: `${magpie.role}: ${text}`
                        });
                    });

                magpie.startingTime = Date.now();

                initializeUI(magpie.role);
            },
            CT: 0,
            trials: config.trials
        };

        return _game;
    },

    thanksWithSocket: function(config) {
        const _thanks = {
            name: config.name,
            title: magpieUtils.view.setter.title(
                config.title,
                "Thank you for taking part in this experiment!"
            ),
            prolificConfirmText: magpieUtils.view.setter.prolificConfirmText(
                config.prolificConfirmText,
                "Please press the button below to confirm that you completed the experiment with Prolific"
            ),
            render: function(CT, magpie) {
                if (
                    magpie.deploy.is_MTurk ||
                    magpie.deploy.deployMethod === "directLink"
                ) {
                    // updates the fields in the hidden form with info for the MTurk's server
                    $("#main").html(
                        `<div class='magpie-view magpie-thanks-view'>
                            <h2 id='warning-message' class='magpie-warning'>Submitting the data
                                <p class='magpie-view-text'>please do not close the tab</p>
                                <div class='magpie-loader'></div>
                            </h2>
                            <h1 id='thanks-message' class='magpie-thanks magpie-nodisplay'>${
                                this.title
                            }</h1>
                        </div>`
                    );
                } else if (magpie.deploy.deployMethod === "Prolific") {
                    $("#main").html(
                        `<div class='magpie-view magpie-thanks-view'>
                            <h2 id='warning-message' class='magpie-warning'>Submitting the data
                                <p class='magpie-view-text'>please do not close the tab</p>
                                <div class='magpie-loader'></div>
                            </h2>
                            <h1 id='thanks-message' class='magpie-thanks magpie-nodisplay'>${
                                this.title
                            }</h1>
                            <p id='extra-message' class='magpie-view-text magpie-nodisplay'>
                                ${this.prolificConfirmText}
                                <a href="${
                                    magpie.deploy.prolificURL
                                }" class="magpie-view-button prolific-url">Confirm</a>
                            </p>
                        </div>`
                    );
                } else if (magpie.deploy.deployMethod === "debug") {
                    $("main").html(
                        `<div id='magpie-debug-table-container' class='magpie-view magpie-thanks-view'>
                            <h1 class='magpie-view-title'>Debug Mode</h1>
                        </div>`
                    );
                } else {
                    console.error("No such magpie.deploy.deployMethod");
                }

                magpie.submission = colorReferenceUtils.magpieSubmitWithSocket(
                    magpie
                );
                magpie.submission.submit(magpie);
            },
            CT: 0,
            trials: 1
        };
        return _thanks;
    }
};
