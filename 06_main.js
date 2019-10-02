// when the DOM is created and JavaScript code can run safely,
// the experiment initialisation is called
$("document").ready(function() {
    // prevent scrolling when space is pressed
    window.onkeydown = function(e) {
        if (e.keyCode == 32 && e.target == document.body) {
            e.preventDefault();
        }
    };

    window.magpie_monitor = magpieInit({
        // views_seq: [init, intro, instructions, lobby, game, thanks],
        views_seq: [intro, instructions, init, lobby, game, postTest, thanks],
        deploy: {
            // experimentID: "20",
            experimentID: "85",
            serverAppURL:
                "https://magpie-demo.herokuapp.com/api/submit_experiment/",
            // serverAppURL: "http://localhost:4000/api/submit_experiment/",
            socketURL: "wss://magpie-demo.herokuapp.com/socket",
            // socketURL: "ws://localhost:4000/socket",
            deployMethod: "MTurkSandbox",
            contact_email: "YOUREMAIL@wherelifeisgreat.you",
            prolificURL:
                "https://app.prolific.ac/submissions/complete?cc=EXAMPLE1234"
        },
        progress_bar: {
            in: ["forcedChoice"],
            style: "default",
            width: 100
        }
    });
});
