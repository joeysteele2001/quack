const MAX_QUACK_SPACING = 30 * 60 * 1000; // 30 mins
const QUACK_DELAY_TIME = 0.1; // seconds, for delay effect
const QUACK_DELAY_PROBABILITY = 0.3; // probability, between 0 and 1
const QUACK_FDBK = 0.7; // between 0 and 1

let active = false;
let delay_enabled = true;

let rate = 30000; // ms (average time between quacks)

const quack = document.querySelector('#quack');
const active_btn = document.querySelector('#active');
const rate_slider = document.querySelector('#quack-rate');
const rate_disp = document.querySelector('#quack-rate-disp');
const delay_btn = document.querySelector('#delay');

let timer;
let audio_ctx;
let gain_node;

// audio is never active until user interacts with the page
active_btn.checked = false;
delay_btn.checked = true;
update_rate();

active_btn.addEventListener('change', () => {
    if (active_btn.checked) {
        active = true;
        play_quack();
    } else {
        active = false;
        stop_quack();
    }
});

rate_slider.addEventListener('input', () => {
    update_rate();

    if (timer) {
        clearInterval(timer);
        timer = undefined;
    }

    if (active) {
        schedule_next_quack();
    }
});

delay_btn.addEventListener('change', () => {
    if (delay_btn.checked) {
        delay_enabled = true;
    } else {
        delay_enabled = false;
    }
});

function play_quack(delay = false) {
    if (!audio_ctx) {
        build_audio_graph();
    }

    if (delay && delay_enabled) {
        gain_node.gain.value = QUACK_FDBK;
    } else {
        gain_node.gain.value = 0;
    }

    console.log('quack');

    quack.currentTime = 0.0;
    audio_ctx.resume();
    quack.play();
}

function stop_quack() {
    quack.pause();

    if (timer) {
        clearInterval(timer);
        timer = undefined;
    }

    if (audio_ctx) {
        audio_ctx.suspend();
    }
}

quack.addEventListener('ended', schedule_next_quack);

function schedule_next_quack() {
    const time = time_to_next();
    const delay = Math.random() < QUACK_DELAY_PROBABILITY;
    timer = setTimeout(() => play_quack(delay), time);
    console.log(time);

    if (time_to_next > 10000) {
        audio_ctx.suspend();
    }
}

function time_to_next() {
    // ensures that the generated time doesn't exceed MAX_QUACK_SPACING
    const x_upper_bound = 1 - Math.exp(-MAX_QUACK_SPACING / rate);
    const random_val = Math.random() / x_upper_bound;
    return -rate * Math.log(1 - random_val);
}

function update_rate() {
    rate = rate_slider.value * 1000.0;
    rate_disp.textContent = rate / 1000.0;
}

function build_audio_graph() {
    //
    //     quack        +---+                            
    //     audio ------>| + |-------------+------> output
    //    source        +---+             |              
    //                    ^               |              
    //                    |               v              
    //                    |          +---------+         
    //                 +-----+       |         |         
    //                 | * A |<------|  delay  |         
    //                 +-----+       |         |         
    //                               +---------+         
    //

    audio_ctx = new AudioContext();

    const track = audio_ctx.createMediaElementSource(quack);
    const delay = new DelayNode(audio_ctx, { delayTime: 0.1 });
    const gain = new GainNode(audio_ctx, { gain: 0.7 });
    const add = new GainNode(audio_ctx, { gain: 1 });

    track.connect(add);
    add.connect(delay);
    add.connect(audio_ctx.destination);
    delay.connect(gain);
    gain.connect(add);

    gain_node = gain;
}
