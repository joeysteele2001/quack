const MAX_QUACK_SPACING = 30 * 60 * 1000; // 30 mins

let active = false;

let rate = 30000; // ms (average time between quacks)

const quack = document.querySelector('#quack');
const active_btn = document.querySelector('#active');
const rate_slider = document.querySelector('#quack-rate');
const rate_disp = document.querySelector('#quack-rate-disp');

let timer;

// audio is never active until user interacts with the page
active_btn.checked = false;
update_rate();

const audio_ctx = new AudioContext();
const track = audio_ctx.createMediaElementSource(quack);
track.connect(audio_ctx.destination);
audio_ctx.suspend();

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

function play_quack() {
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
    const delay = time_to_next();
    timer = setTimeout(play_quack, delay);
    console.log(delay);

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
