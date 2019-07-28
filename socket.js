// If we are to keep the current _magpie structure we need to make `socket` a global variable...

// Initialization of server connection.

// Generate a unique ID for each participant.
const participant_id = colorReferenceUtils.generateId(40);

// Create a new socket
// Documentation at: https://hexdocs.pm/phoenix/js/
let socket = new Phoenix.Socket(magpie.deploy.socketURL, {
    params: { participant_id: participant_id }
});

// A single "connection" is established, and channels are *multiplexed* over this connection.
// Connect only in the lobby view?
// socket.connect();
