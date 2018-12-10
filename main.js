// when the DOM is created and JavaScript code can run safely,
// the experiment initialisation is called
$("document").ready(function() {
    // prevent scrolling when space is pressed
    window.onkeydown = function(e) {
        if (e.keyCode == 32 && e.target == document.body) {
            e.preventDefault();
        }
    };

    babeInit({
        views_seq: [intro, instructions, thanks],
        deploy: {
            experimentID: "4",
            serverAppURL:
                "https://babe-demo.herokuapp.com/api/submit_experiment/",
            deployMethod: "debug",
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
