const socket = io();

function stopCountdown(countdownIndex) {
    socket.emit('stopCountdown', countdownIndex);
}

function startCountdown(countdownIndex) {
    socket.emit('startCountdown', countdownIndex);
}

function resetCountdown(countdownIndex) {
    socket.emit('resetCountdown', countdownIndex);
}
