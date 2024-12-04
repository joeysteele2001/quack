const MAX_QUACK_SPACING = 30 * 60 * 1000; // 30 mins
const QUACK_DELAY_TIME = 0.1; // seconds, for delay effect
const QUACK_DELAY_PROBABILITY = 0.3; // probability, between 0 and 1
const QUACK_FDBK = 0.7; // between 0 and 1

const NORMAL_WS_CURVE = new Float32Array([-1, 0, 1]);
const CURSED_WS_CURVE = new Float32Array([-1, -1, -1, -1, -1, -1, -1, -1, 0, 1, 1, 1, 1, 1, 1, 1, 1]);
const CURSED_WS_PROBABILITY = 0.2; // probability, between 0 and 1

let active = false;
let delay_enabled = true;

let rate = 30000; // ms (average time between quacks)

const quack = document.querySelector('#quack');
const active_btn = document.querySelector('#active');
const rate_slider = document.querySelector('#quack-rate');
const rate_disp = document.querySelector('#quack-rate-disp');
const delay_btn = document.querySelector('#delay');
const duck_pic = document.querySelector('#duck-pic');
const volume_slider = document.querySelector('#volume');
const volume_disp = document.querySelector('#volume-disp');

let timer;
let audio_ctx;
let gain_node;
let ws_node;
let add_node;

// audio is never active until user interacts with the page
active_btn.checked = false;
delay_btn.checked = true;
update_rate();
update_volume_disp();

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

quack.addEventListener('ended', () => { duck_pic.style.filter = 'contrast(100%) blur(0)'; });

volume_slider.addEventListener('input', () => {
    update_volume();
})

function play_quack(delay = false, cursed = false) {
    if (!audio_ctx) {
        build_audio_graph();
        update_volume();
    }

    let contrast = '100%';
    let blur = '0';

    if (delay && delay_enabled) {
        gain_node.gain.value = QUACK_FDBK;
        blur = '10px';
    } else {
        gain_node.gain.value = 0;
    }

    if (cursed) {
        ws_node.curve = CURSED_WS_CURVE;
        contrast = '500%';
    } else {
        ws_node.curve = NORMAL_WS_CURVE;
    }

    duck_pic.style.filter = `contrast(${contrast}) blur(${blur})`;

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
    const cursed = Math.random() < CURSED_WS_PROBABILITY;
    timer = setTimeout(() => play_quack(delay, cursed), time);
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

function update_volume_disp() {
    const vol = volume_slider.value;
    volume_disp.textContent = vol;
    return vol;
}

function update_volume() {
    const vol = update_volume_disp();
    const gain = (10.0 ** ((vol - 100) / 40)) - 0.00001;
    add_node.gain.value = gain;
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
    const ws = new WaveShaperNode(audio_ctx, { curve: NORMAL_WS_CURVE });
    const delay = new DelayNode(audio_ctx, { delayTime: 0.1 });
    const gain = new GainNode(audio_ctx, { gain: 0.7 });
    const add = new GainNode(audio_ctx, { gain: 1 });

    track.connect(ws);
    ws.connect(add);
    add.connect(delay);
    add.connect(audio_ctx.destination);
    delay.connect(gain);
    gain.connect(add);

    gain_node = gain;
    ws_node = ws;
    add_node = add;
}
