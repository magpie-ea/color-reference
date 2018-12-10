/* Helper functions */
/* For generating random colors */
// From Dawkins' code.
const colorReferenceUtils = {
    randomColor: function(options) {
        var h = ~~(Math.random() * 360);
        var s = ~~(Math.random() * 100);
        var l = options.hasOwnProperty("fixedL") ? 50 : ~~(Math.random() * 100);
        return [h, s, l];
    },

    sampleColors: function() {
        const opts = { fixedL: true };

        // Sample the three colors to be used as the target colors.
        var target = this.randomColor(opts);
        var firstDistractor = this.randomColor(opts);
        var secondDistractor = this.randomColor(opts);

        return {
            target,
            firstDistractor,
            secondDistractor
        };
    },

    // Produce random indices so that in each trial the position of the target div is different.
    // The first index is the target's, the second the first distractor's, the third the second distractor's
    sampleIndices: function() {
        let indices = [0, 1, 2];
        this.shuffleArray(indices);
        return indices;
    },

    /* For generating random participant IDs */
    // https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
    // dec2hex :: Integer -> String
    dec2hex: function(dec) {
        return ("0" + dec.toString(16)).substr(-2);
    },
    // generateId :: Integer -> String
    generateId: function(len) {
        var arr = new Uint8Array((len || 40) / 2);
        window.crypto.getRandomValues(arr);
        return Array.from(arr, this.dec2hex).join("");
    },

    /* For shuffling arrays */
    shuffleArray: function(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
};
