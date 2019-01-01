const colorReferenceViews = {
    init: function(config) {
        const _init = {
            name: config.name,
            title: config.title,
            text: config.text || "Initializing the experiment...",
            render: function(CT, babe) {
                const viewTemplate = `
                        <div class="babe-view">
                            <h1 class="babe-view-title">${this.title}</h1>
                            <section class="babe-text-container">
                                <p id="lobby-text" class="babe-view-text">${
                                    this.text
                                }</p>
                            </section>
                        </div>
                `;

                $("#main").html(viewTemplate);

                // Hopefully by telling them upfront they will stop the HIT before ever taking it.
                babe.onSocketError = function(reasons) {
                    window.alert(
                        `Sorry, a connection to our server couldn't be established. You may want to wait and try again. If the error persists, do not proceed with the HIT. Thank you for your understanding. Error: ${reasons}`
                    );
                };

                babe.onSocketTimeout = function() {
                    window.alert(
                        `Sorry, the connection to our server timed out. You may want to wait and try again. If the error persists, do not proceed with the HIT. Thank you for your understanding. `
                    );
                };

                // Generate a unique ID for each participant.
                babe.participant_id = colorReferenceUtils.generateId(40);

                // Create a new socket
                // Documentation at: https://hexdocs.pm/phoenix/js/
                babe.socket = new Phoenix.Socket(babe.deploy.socketURL, {
                    params: {
                        participant_id: babe.participant_id,
                        experiment_id: babe.deploy.experimentID
                    }
                });

                // Set up what to do when the whole socket connection crashes/fails.
                babe.socket.onError(() =>
                    babe.onSocketError(
                        "The connection to the server was dropped."
                    )
                );

                // Not really useful. This will only be invoked when the connection is explicitly closed by either the server or the client.
                // babe.socket.onClose( () => console.log("Connection closed"));

                // Try to connect to the server.
                babe.socket.connect();

                // First join the participant channel belonging only to this participant.
                babe.participantChannel = babe.socket.channel(
                    `participant:${babe.participant_id}`,
                    {}
                );

                babe.participantChannel.on(
                    "experiment_available",
                    (payload) => {
                        // First record the assigned <variant-nr, chain-nr, realization-nr> tuple.
                        babe.variant = payload.variant;
                        babe.chain = payload.chain;
                        babe.realization = payload.realization;
                        // Proceed to the next view if the connection to the participant channel was successfully established.
                        babe.findNextView();
                    }
                );

                babe.participantChannel
                    .join()
                    // Note that `receive` functions are for receiving a *reply* from the server after you try to send it something, e.g. `join()` or `push()`.
                    // While `on` function is for passively listening for new messages initiated by the server.
                    .receive("ok", (payload) => {
                        // We still need to wait for the actual confirmation message of "experiment_available". So we do nothing here.
                    })
                    .receive("error", (reasons) => {
                        babe.onSocketError(reasons);
                    })
                    .receive("timeout", () => {
                        babe.onSocketTimeout();
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
            render: function(CT, babe) {
                const viewTemplate = `
                    <div class="babe-view">
                        <h1 class="babe-view-title">${this.title}</h1>
                        <section class="babe-text-container">
                            <p id="lobby-text" class="babe-view-text">${
                                this.text
                            }</p>
                        </section>
                    </div>
                `;

                $("#main").html(viewTemplate);

                babe.trial_counter = 0;

                // This channel will be used for all subsequent group communications in this one experiment.
                babe.gameChannel = babe.socket.channel(
                    `interactive_room:${babe.deploy.experimentID}:${
                        babe.chain
                    }:${babe.realization}`,
                    { participant_id: babe.participant_id }
                );

                // We don't really need to track the presence on the client side for now.
                // babe.lobbyPresence = new Phoenix.Presence(babe.gameChannel);

                babe.gameChannel
                    .join()
                    .receive("ok", (msg) => {
                        document.getElementById("lobby-text").innerHTML =
                            "Successfully joined the lobby. Waiting for other participants...";
                    })
                    .receive("error", (reasons) => {
                        babe.onSocketError(reasons);
                    })
                    .receive("timeout", () => {
                        babe.onSocketTimeout();
                    });

                /* If we want to make the lobby view reusable, we might want to extract the few functions below into a new view particular to this experiment. They could not be put into gameView because otherwise the same channel listener would be repeatedly attached multiple times. */
                let fillColor = function(div, color, type) {
                    div.classList.remove([
                        "target",
                        "distractor1",
                        "distractor2"
                    ]);

                    div.classList.add(type);

                    if (type == "target" && babe.variant == 1) {
                        div.classList.add("speaker-target");
                    }

                    div.style[
                        "background-color"
                    ] = colorReferenceUtils.produceColorStyle(color);

                    div.dataset.type = type;
                };

                let saveTrialData = function(prev_round_trial_data) {
                    // These could be different for each participant, thus they fill them in before recording them.
                    prev_round_trial_data["variant"] = babe.variant;
                    prev_round_trial_data["chain"] = babe.chain;
                    prev_round_trial_data["realization"] = babe.realization;

                    babe.trial_data.push(prev_round_trial_data);
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
                    if (babe.variant == 2) {
                        // The problem is that the CT cannot be properly obtained from the arguments because this view is not the actual game view.
                        babe.trial_counter += 1;

                        for (let div of color_divs) {
                            div.onclick = (e) => {
                                // Note that we can only record the reaction time of the guy who actively ended this round. Other interactive experiments might have different requirements though.
                                const RT = Date.now() - babe.startingTime;
                                const trial_data = {
                                    trial_type: config.trial_type,
                                    trial_number: babe.trial_counter,
                                    color_first_distractor:
                                        colors["firstDistractor"],
                                    color_second_distractor:
                                        colors["secondDistractor"],
                                    color_target: colors["target"],
                                    selected_type: div.dataset.type,
                                    selected_color:
                                        div.style["background-color"],
                                    // Better put them into one single string.
                                    conversation: babe.conversation.join("\n"),
                                    RT: RT
                                };

                                console.log(
                                    `trial_counter is ${
                                        babe.trial_counter
                                    }, num_game_trials is ${
                                        babe.num_game_trials
                                    }`
                                );
                                if (babe.trial_counter < babe.num_game_trials) {
                                    babe.gameChannel.push("next_round", {
                                        colors: colorReferenceUtils.sampleColors(),
                                        prev_round_trial_data: trial_data
                                    });
                                } else {
                                    babe.gameChannel.push("end_game", {
                                        prev_round_trial_data: trial_data
                                    });
                                }
                            };
                        }
                    }
                };

                // When the server tells the participant it's time to start the game with the "start_game" message (e.g. when there are enough participants for the game already for this game), the client side JS does the preparation work (e.g. initialize the UI)
                // The payload contains two pieces of information: `lounge_id` and `nth_participant`, which indicates the rank of the current participant among all participants for this game.
                babe.gameChannel.on("start_game", (payload) => {
                    // Set a global state noting that the experiment hasn't finished yet.
                    babe.gameFinished = false;

                    // Add a callback to handle situations where one of the participants leaves in the middle of the experiment.
                    babe.gameChannel.on("presence_diff", (payload) => {
                        if (babe.gameFinished == false) {
                            window.alert(
                                "Sorry. Somebody just left this interactive experiment halfway through and thus it can't be finished! Please contact us to still be reimbursed for your time."
                            );
                            // TODO: Figure out what exactly to do when this happens.
                            // We might not want to submit the results. If we submit, we'd also need to make sure that the participant who dropped out's ExperimentStatus is also marked as "completed" correctly.
                            // babe.submission = colorReferenceUtils.babeSubmitWithSocket(
                            //     babe
                            // );
                            // babe.submission.submit(babe);
                        }
                    });

                    // One of the participants need to generate and send the data for the very first round.
                    if (babe.variant == 2) {
                        babe.gameChannel.push("initialize_game", {
                            colors: colorReferenceUtils.sampleColors()
                        });
                    }
                });

                // Display the message received from the server upon `new_msg` event.
                babe.gameChannel.on("new_msg", (payload) => {
                    let chatBox = document.querySelector("#chat-box");
                    let msgBlock = document.createElement("p");
                    msgBlock.classList.add("babe-view-text");
                    msgBlock.insertAdjacentHTML(
                        "beforeend",
                        `${payload.message}`
                    );
                    chatBox.appendChild(msgBlock);
                    babe.conversation.push(payload.message);
                });

                // Things to do on initialize_game, next_round and end_game are slightly different.
                // Another way is to tell them apart via some payload content. But the following way also works.
                babe.gameChannel.on("initialize_game", (payload) => {
                    // We run findNextView() to advance to the next round.
                    babe.findNextView();

                    setUpOneRound(payload.colors);
                });

                // Get information regarding the next round and do the corresponding work.
                babe.gameChannel.on("next_round", (payload) => {
                    saveTrialData(payload.prev_round_trial_data);

                    // We run findNextView() to advance to the next round.
                    babe.findNextView();

                    setUpOneRound(payload.colors);
                });

                // Only save the data and do nothing else
                babe.gameChannel.on("end_game", (payload) => {
                    babe.gameFinished = true;
                    saveTrialData(payload.prev_round_trial_data);

                    babe.findNextView();
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
            render: function(CT, babe) {
                const viewTemplate = `
                    <div class='babe-view'>
                        <h1 id="title" class='babe-view-title'>${
                            this.title
                        }</h1>
                        <section class="babe-text-container">
                            <p id="game-instructions" class="babe-view-text">                            </p></section>
                            <br/>
                            <br/>
                        <div id="chat-box"></div>

                            <div class="babe-view-answer-container">
                        <form id="chat-form">
                            <textarea cols=50 class='babe-response-text'
                                placeholder="Send message to the other participant."
                                id="participant-msg"
                            ></textarea>
                            <button type="submit" class="babe-view-button">Send</button>
                        </form>
                        </div>

                        <div class="color-container babe-view-stimulus-container">
                            <div class="color-div color-div-1"></div>
                            <div class="color-div color-div-2"></div>
                            <div class="color-div color-div-3"></div>
                        </div>
                    </div>
                `;

                $("#main").html(viewTemplate);

                // We need to store this as a global variable. See above.
                babe.num_game_trials = config.trials;

                // Set the role of the participant based on the variant assigned.
                babe.role = babe.variant == 1 ? "speaker" : "listener";

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

                babe.conversation = [];

                // Messages are sent to each other via the `new_msg` event.
                // I think we have to clone the element if we
                document
                    .getElementById("chat-form")
                    .addEventListener("submit", function(e) {
                        e.preventDefault();

                        let text = document.getElementById("participant-msg")
                            .value;
                        babe.gameChannel.push("new_msg", {
                            message: `${babe.role}: ${text}`
                        });
                    });

                babe.startingTime = Date.now();

                initializeUI(babe.role);
            },
            CT: 0,
            trials: config.trials
        };

        return _game;
    },

    thanksWithSocket: function(config) {
        const _thanks = {
            name: config.name,
            title: babeUtils.view.setter.title(
                config.title,
                "Thank you for taking part in this experiment!"
            ),
            prolificConfirmText: babeUtils.view.setter.prolificConfirmText(
                config.prolificConfirmText,
                "Please press the button below to confirm that you completed the experiment with Prolific"
            ),
            render: function(CT, babe) {
                if (
                    babe.deploy.is_MTurk ||
                    babe.deploy.deployMethod === "directLink"
                ) {
                    // updates the fields in the hidden form with info for the MTurk's server
                    $("#main").html(
                        `<div class='babe-view babe-thanks-view'>
                            <h2 id='warning-message' class='babe-warning'>Submitting the data
                                <p class='babe-view-text'>please do not close the tab</p>
                                <div class='babe-loader'></div>
                            </h2>
                            <h1 id='thanks-message' class='babe-thanks babe-nodisplay'>${
                                this.title
                            }</h1>
                        </div>`
                    );
                } else if (babe.deploy.deployMethod === "Prolific") {
                    $("#main").html(
                        `<div class='babe-view babe-thanks-view'>
                            <h2 id='warning-message' class='babe-warning'>Submitting the data
                                <p class='babe-view-text'>please do not close the tab</p>
                                <div class='babe-loader'></div>
                            </h2>
                            <h1 id='thanks-message' class='babe-thanks babe-nodisplay'>${
                                this.title
                            }</h1>
                            <p id='extra-message' class='babe-view-text babe-nodisplay'>
                                ${this.prolificConfirmText}
                                <a href="${
                                    babe.deploy.prolificURL
                                }" class="babe-view-button prolific-url">Confirm</a>
                            </p>
                        </div>`
                    );
                } else if (babe.deploy.deployMethod === "debug") {
                    $("main").html(
                        `<div id='babe-debug-table-container' class='babe-view babe-thanks-view'>
                            <h1 class='babe-view-title'>Debug Mode</h1>
                        </div>`
                    );
                } else {
                    console.error("No such babe.deploy.deployMethod");
                }

                babe.submission = colorReferenceUtils.babeSubmitWithSocket(
                    babe
                );
                babe.submission.submit(babe);
            },
            CT: 0,
            trials: 1
        };
        return _thanks;
    }
};
