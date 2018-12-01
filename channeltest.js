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
// Generate a unique ID for each participant.
const user_id = generateId(40);

// Documentation at: https://hexdocs.pm/phoenix/js/
let socket = new Phoenix.Socket("ws://localhost:4000/socket", {
    params: { user_id: user_id }
});
// let socket = new Phoenix.Socket(`${config.socketURL}`, { params: {} });
// A single "connection" is established, and channels are *multiplexed* over this connection.
socket.connect();

// Now that you are connected, you can join channels.
let lobbyChannel = socket.channel("color_reference:lobby", {});
let userChannel = socket.channel(`color_reference:user:${user_id}`, {});
userChannel
    .join()
    // Note that `receive` functions are for receiving a *reply* from the server after you try to send it something, e.g. `join()` or `push()`.
    // While `on` function is for passively listening for new messages initiated by the server.
    .receive("ok", (msg) => {
        console.log("Joined user channel successfully", msg);
        joinLobby();
    })
    .receive("error", (reasons) => {
        console.log("Unable to join user channel", reasons);
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

// The user
userChannel.on("game_start", (payload) => {
    const lounge_id = payload.lounge_id;
    const role = payload.role;
    startGame(lounge_id, role);

    // Already found a game to join. Leave the lobby.
    lobbyChannel.leave();
});

let startGame = function(lounge_id, role) {
    let roleLabel = document.getElementById("user-role");
    roleLabel.innerHTML = role;
    let gameChannel = socket.channel(`color_reference:lounge:${lounge_id}`, {});

    gameChannel
        .join()
        .receive("ok", (msg) => {
            console.log(`Joined game ${lounge_id} successfully`, msg);
        })
        .receive("error", (reasons) => {
            console.log(`Unable to join game ${lounge_id}`, reasons);
        })
        .receive("timeout", () => {
            console.log("Connection timed out. Networking issue.");
        });

    document
        .getElementById("chat-form")
        .addEventListener("submit", function(e) {
            e.preventDefault();

            let text = document.getElementById("user-msg").value;
            let role = document.getElementById("user-role").value;
            gameChannel.push("new_msg", { message: `${role}: ${text}` });
        });

    gameChannel.on("new_msg", (payload) => {
        let chatBox = document.querySelector("#chat-box");
        let msgBlock = document.createElement("p");
        msgBlock.insertAdjacentHTML("beforeend", `${payload.message}`);
        chatBox.appendChild(msgBlock);
    });
};

// let listenForUpdates = function(gameChannel) {
// };

// From Dawkins' code.
// var randomColor = function(options) {
//     var h = ~~(Math.random() * 360);
//     var s = ~~(Math.random() * 100);
//     var l = _.has(options, "fixedL") ? 50 : ~~(Math.random() * 100);
//     return [h, s, l];
// };

// var sampleColors = function(condition) {
//     const opts = { fixedL: true };
//     // Sample the three colors to be used as the target colors.
//     var target = { color: randomColor(opts), targetStatus: "target" };
//     var firstDistractor = { color: randomColor(opts), targetStatus: "distr1" };
//     var secondDistractor = { color: randomColor(opts), targetStatus: "distr2" };
// };
