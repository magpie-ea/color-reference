const colorReferenceViews = {
    init: function(config) {
        const _init = {
            name: config.name,
            title: config.title,
            text: config.text || "Initializing the experiment...",
            render: function(CT, babe) {
                const viewTemplate = `
                        <div className="babe-view">
                            <h1 className="babe-view-title">${this.title}</h1>
                            <section className="babe-text-container">
                                <p id="lobby-text" className="babe-view-text">${
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
                        console.log(payload);
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
                    <div className="babe-view">
                        <h1 className="babe-view-title">${this.title}</h1>
                        <section className="babe-text-container">
                            <p id="lobby-text" className="babe-view-text">${
                                this.text
                            }</p>
                        </section>
                    </div>
                `;

                $("#main").html(viewTemplate);

                // Declare the lobbyChannel to be joined later.
                // The number in the end corresponds to the experiment ID.
                babe.lobbyChannel = babe.socket.channel(
                    `lobby:${babe.deploy.experimentID}`,
                    { participant_id: babe.participant_id }
                );

                babe.lobbyPresence = new Phoenix.Presence(babe.lobbyChannel);

                // Check whether the interactive experiment can be started.
                function checkGameStartCondition() {
                    babe.lobbyPresence.list();
                }

                babe.lobbyChannel.on("presence_state", (payload) => {
                    // babe.lobbyPresence.list((id, metas_map) => {
                    //     if (id == babe.deploy.experimentID) {
                    //         list
                    //     }
                    // });
                    console.log(payload);
                    console.table(payload);
                });

                babe.lobbyChannel
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

                // When the server tells the participant it's time to start the game with the "game_start" message (e.g. when there are enough participants for the game already for this game), the client side JS does the preparation work (e.g. initialize the UI)
                // The payload contains two pieces of information: `lounge_id` and `nth_participant`, which indicates the rank of the current participant among all participants for this game.
                babe.participantChannel.on("game_start", (payload) => {
                    // For now the easiest way might just be to store this payload in a global variable and let later views use it.
                    babe.interactiveExpInitializationPayload = payload;
                    // Already started a game. Leave the lobby.
                    babe.lobbyChannel.leave();
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
                let startingTime;
                const viewTemplate = `
                    <div class='babe-view'>
                        <h1 id="title" class='babe-view-title'>${
                            this.title
                        }</h1>
                        <section class="babe-text-container">
                            <p id="game-instructions" class="babe-view-text">                            </p></section>
                        <div id="chat-box"></div>


                        <label for="participant-role" id="participant-role"></label>
                        <form id="chat-form">
                            <textarea
                                placeholder="Send message to the other participant."
                                id="participant-msg"
                            ></textarea>
                            <button type="submit">Send</button>
                        </form>

                        <div class="color-container babe-view-stimulus-container">
                            <div class="color-div color-div-1"></div>
                            <div class="color-div color-div-2"></div>
                            <div class="color-div color-div-3"></div>
                        </div>
                    </div>
                `;

                $("#main").html(viewTemplate);

                /* For initializing the UI when the game begins */
                let initializeUI = function(role) {
                    let roleLabel = document.getElementById("participant-role");
                    let title = document.getElementById("title");
                    let instructions = document.getElementById(
                        "game-instructions"
                    );
                    roleLabel.innerHTML = role;
                    if (role == "speaker") {
                        title.innerText = "You are the speaker";
                        instructions.innerText =
                            "Send messages to tell the listener which object is the target (the one with the border)";
                    } else if (role == "listener") {
                        title.innerText = "You are the listener";
                        instructions.innerText =
                            "Click on the target object which the speaker is telling you about";
                    }
                };

                /* For producing usable strings to be set as the background color. */
                let produceColorStyle = function(hslArray) {
                    return `hsl(${hslArray[0]},${hslArray[1]}%,${
                        hslArray[2]
                    }%)`;
                };

                /* For actually filling the colors for each round into the stims. */
                let fillColors = function(colors, indices) {
                    let color_divs = document.getElementsByClassName(
                        "color-div"
                    );
                    let role = document.getElementById("participant-role")
                        .innerText;

                    color_divs[indices[0]].classList.remove([
                        "target",
                        "distractor1",
                        "distractor2"
                    ]);
                    color_divs[indices[0]].classList.add("target");
                    // This is to add a border to let the speaker know which is the target
                    if (role == "speaker") {
                        color_divs[indices[0]].classList.add("speaker-target");
                    }
                    color_divs[indices[1]].classList.remove([
                        "target",
                        "distractor1",
                        "distractor2"
                    ]);
                    color_divs[indices[1]].classList.add("distractor1");
                    color_divs[indices[2]].classList.remove([
                        "target",
                        "distractor1",
                        "distractor2"
                    ]);
                    color_divs[indices[2]].classList.add("distractor2");

                    color_divs[indices[0]].style[
                        "background-color"
                    ] = produceColorStyle(colors["target"]);
                    color_divs[indices[1]].style[
                        "background-color"
                    ] = produceColorStyle(colors["firstDistractor"]);
                    color_divs[indices[2]].style[
                        "background-color"
                    ] = produceColorStyle(colors["secondDistractor"]);
                };

                let startGame = function(lounge_id, role) {
                    let gameChannel = babe.socket.channel(
                        `interactive_experiment:lounge:${lounge_id}`,
                        {}
                    );

                    gameChannel
                        .join()
                        .receive("ok", (msg) => {
                            if (role == "speaker") {
                                gameChannel.push("next_round", {
                                    colors: colorReferenceUtils.sampleColors(),
                                    indices: colorReferenceUtils.sampleIndices()
                                });
                            }
                        })
                        .receive("error", (reasons) => {
                            babe.onSocketError(reasons);
                        })
                        .receive("timeout", () => {
                            babe.onSocketTimeout();
                        });

                    // Messages are sent to each other via the `new_msg` event.
                    document
                        .getElementById("chat-form")
                        .addEventListener("submit", function(e) {
                            e.preventDefault();

                            let text = document.getElementById(
                                "participant-msg"
                            ).value;
                            let role = document.getElementById(
                                "participant-role"
                            ).innerText;
                            gameChannel.push("new_msg", {
                                message: `${role}: ${text}`
                            });
                        });

                    // Display the message received from the server upon `new_msg` event.
                    gameChannel.on("new_msg", (payload) => {
                        let chatBox = document.querySelector("#chat-box");
                        let msgBlock = document.createElement("p");
                        msgBlock.insertAdjacentHTML(
                            "beforeend",
                            `${payload.message}`
                        );
                        chatBox.appendChild(msgBlock);
                    });

                    // One of the participants signals the next round to begin
                    // TODO: This should be done when the participant selects a target color
                    // The payload should also contain the color information generated by the speaker.
                    // Actually we can also generate the colors on the server side but now that there's existing code on the client side let's just still go with it for now.
                    gameChannel.on("next_round", (payload) => {
                        fillColors(payload.colors, payload.indices);
                    });
                };

                startingTime = Date.now();

                const lounge_id =
                    babe.interactiveExpInitializationPayload.lounge_id;
                const role =
                    babe.interactiveExpInitializationPayload.nth_participant ==
                    0
                        ? "speaker"
                        : "listener";

                initializeUI(role);

                // Join the game lounge on the server with the specified lounge_id.
                startGame(lounge_id, role);
                // Already started a game. Leave the lobby.
                babe.lobbyChannel.leave();

                // These should be triggered after the listener makes a choice.
                // Should also record the conversation content?
                babe.trial_data.push(trial_data);
                babe.findNextView();
            },
            CT: 0,
            trials: config.trials
        };

        return _game;
    }
};
