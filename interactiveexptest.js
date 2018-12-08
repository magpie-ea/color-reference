/* Helper functions */
/* For generating random colors */
// From Dawkins' code.
var randomColor = function(options) {
    var h = ~~(Math.random() * 360);
    var s = ~~(Math.random() * 100);
    var l = options.hasOwnProperty("fixedL") ? 50 : ~~(Math.random() * 100);
    return [h, s, l];
};

var sampleColors = function() {
    const opts = { fixedL: true };

    // Sample the three colors to be used as the target colors.
    var target = randomColor(opts);
    var firstDistractor = randomColor(opts);
    var secondDistractor = randomColor(opts);

    return {
        target,
        firstDistractor,
        secondDistractor
    };
};

// Produce random indices so that in each trial the position of the target div is different.
// The first index is the target's, the second the first distractor's, the third the second distractor's
function sampleIndices() {
    let indices = [0, 1, 2];
    shuffleArray(indices);
    return indices;
}

/* For generating random participant IDs */
// https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
// dec2hex :: Integer -> String
function dec2hex(dec) {
    return ("0" + dec.toString(16)).substr(-2);
}
// generateId :: Integer -> String
function generateId(len) {
    var arr = new Uint8Array((len || 40) / 2);
    window.crypto.getRandomValues(arr);
    return Array.from(arr, dec2hex).join("");
}

/* For shuffling arrays */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

/* For initializing the UI when the game begins */
let initializeUI = function(role) {
    let roleLabel = document.getElementById("participant-role");
    let title = document.getElementById("title");
    let instructions = document.getElementById("instructions");
    roleLabel.innerHTML = role;
    if (role == "speaker") {
        title.innerText = "You are the speaker";
        instructions.innerText =
            "Send messages to tell the listener which object is the target";
    } else if (role == "listener") {
        title.innerText = "You are the listener";
        instructions.innerText =
            "Click on the target object which the speaker is telling you about";
    }
};

/* For producing usable strings to be set as the background color. */
let produceColorStyle = function(hslArray) {
    return `hsl(${hslArray[0]},${hslArray[1]}%,${hslArray[2]}%)`;
};

/* For actually filling the colors for each round into the stims. */
let fillColors = function(colors, indices) {
    let color_divs = document.getElementsByClassName("color-div");
    let role = document.getElementById("participant-role").innerText;

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

    color_divs[indices[0]].style["background-color"] = produceColorStyle(
        colors["target"]
    );
    color_divs[indices[1]].style["background-color"] = produceColorStyle(
        colors["firstDistractor"]
    );
    color_divs[indices[2]].style["background-color"] = produceColorStyle(
        colors["secondDistractor"]
    );
};
/* End helper functions */

// Generate a unique ID for each participant.
const participant_id = generateId(40);

// Create a new socket
// Documentation at: https://hexdocs.pm/phoenix/js/
// let socket = new Phoenix.Socket("ws://localhost:4000/socket", {
//     params: { participant_id: participant_id }
// });
let socket = new Phoenix.Socket("wss://babe-demo.herokuapp.com/socket", {
    params: { participant_id: participant_id }
});
// let socket = new Phoenix.Socket(`${config.socketURL}`, { params: { participant_id : participant_id} });

// A single "connection" is established, and channels are *multiplexed* over this connection.
socket.connect();

// Now that you are connected, you can join channels.
// Declare the lobbyChannel to be joined later.
// The number in the end corresponds to the experiment ID.
let lobbyChannel = socket.channel("interactive_experiment:lobby:46", {});

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
        console.log("Joined participant channel successfully", msg);
        // After joining the participant channel, join the lobby to wait for enough participants to arrive.
        joinLobby();
    })
    .receive("error", (reasons) => {
        console.log("Unable to join participant channel", reasons);
    })
    .receive("timeout", () => {
        console.log("Connection timed out. Networking issue.");
    });

let joinLobby = function() {
    lobbyChannel
        .join()
        .receive("ok", (msg) => {
            console.log("Joined lobby channel successfully", msg);
        })
        .receive("error", (reasons) => {
            console.log("Unable to join lobby channel", reasons);
        })
        .receive("timeout", () => {
            console.log("Connection timed out. Networking issue.");
        });
};

// When the server tells the participant it's time to start the game with the "game_start" message (e.g. when there are two participants for the game already for this game), the client side JS does the preparation work (e.g. initialize the UI)
participantChannel.on("game_start", (payload) => {
    const lounge_id = payload.lounge_id;
    console.log(payload.nth_participant);
    const role = payload.nth_participant == 0 ? "speaker" : "listener";
    initializeUI(role);

    // Join the game lounge on the server with the specified lounge_id.
    startGame(lounge_id, role);
    // Already started a game. Leave the lobby.
    lobbyChannel.leave();
});

let startGame = function(lounge_id, role) {
    let gameChannel = socket.channel(
        `interactive_experiment:lounge:${lounge_id}`,
        {}
    );

    gameChannel
        .join()
        .receive("ok", (msg) => {
            console.log(`Joined game ${lounge_id} successfully`, msg);
            if (role == "speaker") {
                gameChannel.push("next_round", {
                    colors: sampleColors(),
                    indices: sampleIndices()
                });
            }
        })
        .receive("error", (reasons) => {
            console.log(`Unable to join game ${lounge_id}`, reasons);
        })
        .receive("timeout", () => {
            console.log("Connection timed out. Networking issue.");
        });

    // Messages are sent to each other via the `new_msg` event.
    document
        .getElementById("chat-form")
        .addEventListener("submit", function(e) {
            e.preventDefault();

            let text = document.getElementById("participant-msg").value;
            let role = document.getElementById("participant-role").innerText;
            gameChannel.push("new_msg", { message: `${role}: ${text}` });
        });

    // Display the message received from the server upon `new_msg` event.
    gameChannel.on("new_msg", (payload) => {
        let chatBox = document.querySelector("#chat-box");
        let msgBlock = document.createElement("p");
        msgBlock.insertAdjacentHTML("beforeend", `${payload.message}`);
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
