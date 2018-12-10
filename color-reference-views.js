const colorReferenceViews = {
    intro: function(config) {
        babeUtils.view.inspector.params(config, "intro");
        const intro = {
            name: config.name,
            title: babeUtils.view.setter.title(config.title, "Welcome!"),
            text: config.text,
            button: babeUtils.view.setter.buttonText(config.buttonText),
            render: function(CT, babe) {
                let prolificId;
                const viewTemplate = `<div class='babe-view'>
                    <h1 class='babe-view-title'>${this.title}</h1>
                    <section class="babe-text-container">
                        <p class="babe-view-text">${this.text}</p>
                    </section>
                    <button id="next" class='babe-view-button' class="babe-nodisplay">${
                        this.button
                    }</button>${this.text}
                </div>`;

                $("#main").html(viewTemplate);

                const prolificForm = `<p id="prolific-id-form">
                    <label for="prolific-id">Please, enter your Prolific ID</label>
                    <input type="text" id="prolific-id" />
                </p>`;

                const next = $("#next");

                function showNextBtn() {
                    if (prolificId.val().trim() !== "") {
                        next.removeClass("babe-nodisplay");
                    } else {
                        next.addClass("babe-nodisplay");
                    }
                }

                if (babe.deploy.deployMethod === "Prolific") {
                    $(".babe-text-container").append(prolificForm);
                    next.addClass("babe-nodisplay");
                    prolificId = $("#prolific-id");

                    prolificId.on("keyup", function() {
                        showNextBtn();
                    });

                    prolificId.on("focus", function() {
                        showNextBtn();
                    });
                }

                // Try to connect to the server.
                socket.connect();
                // First join the participant channel belonging only to this participant.
                let participantChannel = socket.channel(
                    `interactive_experiment:participant:${participant_id}`,
                    {}
                );
                participantChannel
                    .join()
                    // Note that `receive` functions are for receiving a *reply* from the server after you try to send it something, e.g. `join()` or `push()`.
                    // While `on` function is for passively listening for new messages initiated by the server.
                    .receive("ok", (msg) => {
                        // Probably shouldn't do anything in this case and just let the participant read the instructions before clicking "next".
                    })
                    .receive("error", (reasons) => {
                        // Hopefully by telling them upfront they will stop the HIT before ever taking it.
                        window.alert(
                            `Sorry, a connection to our server couldn't be established. Please refresh and try again. If the error persists, do not proceed with the HIT. Thank you for your understanding. Error: ${reasons}`
                        );
                    })
                    .receive("timeout", () => {
                        window.alert(
                            `Sorry, the connection to our server timed out. Please refresh and try again. If the error persists, do not proceed with the HIT. Thank you for your understanding. `
                        );
                    });

                // moves to the next view
                next.on("click", function() {
                    if (babe.deploy.deployMethod === "Prolific") {
                        babe.global_data.prolific_id = prolificId.val().trim();
                    }
                    console.log(babe.global_data.prolific_id);

                    babe.findNextView();
                });
            },
            CT: 0,
            // for how many trials should this view be repeated?
            trials: config.trials
        };
    },

    lobby: function(config) {
        babeUtils.view.inspector.params(config, "lobby");
        const lobby = {
            name: config.name,
            title: babeUtils.views.setter.title(config.title, "Lobby"),
            text: config.text,
            render: function(CT, babe) {
                const viewTemplate = `
                    <div className="babe-view">
                        <h1 className="babe-view-title">${this.title}</h1>
                        <section className="babe-text-container">
                            <p className="babe-view-text">${this.text}</p>
                        </section>
                    </div>
                `;

                $("#main").html(viewTemplate);

                // Declare the lobbyChannel to be joined later.
                // The number in the end corresponds to the experiment ID.
                let lobbyChannel = socket.channel(
                    `interactive_experiment:lobby:${babe.deploy.experimentID}`,
                    {}
                );

                lobbyChannel
                    .join()
                    .receive("ok", (msg) => {
                        babe.findNextView();
                    })
                    .receive("error", (reasons) => {
                        // Hopefully by telling them upfront they will stop the HIT before ever taking it.
                        window.alert(
                            `Sorry, a connection to our server couldn't be established. You may want to try again. If the error persists, do not proceed with the HIT. Thank you for your understanding. Error: ${reasons}`
                        );
                    })
                    .receive("timeout", () => {
                        window.alert(
                            `Sorry, the connection to our server timed out. You may want to try again. If the error persists, do not proceed with the HIT. Thank you for your understanding. `
                        );
                    });
            },
            CT: 0,
            trials: config.trials
        };

        return lobby;
    },
    game: function(config) {
        babeUtils.view.inspector.missingData(config, "game");
        babeUtils.view.inspector.params(config, "game");
        const game = {
            name: config.name,
            title: babeUtils.view.setter.title(
                config.title,
                "Color Reference Game"
            ),
            render: function(CT, babe) {
                let startingTime;
                const viewTemplate = `
                    <div class='babe-view'>
                        <h1 class='babe-view-title'>${this.title}</h1>
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

                startingTime = Date.now();

                // These should be triggered after the listener makes a choice.
                // Shoudl also record the conversation content?
                babe.trial_data.push(trial_data);
                babe.findNextView();
            },
            CT: 0,
            trials: config.trials
        };

        return game;
    }
};
