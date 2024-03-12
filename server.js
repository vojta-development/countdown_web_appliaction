const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static(path.join(__dirname, 'public')));

// Inicializace hodnot countdownů

const vychozi_cas = 240
const countdowns = [
    { remainingTime: vychozi_cas * 60, intervalId: null, running: true }, // 1
    { remainingTime: vychozi_cas * 60, intervalId: null, running: true }, // 2
    { remainingTime: vychozi_cas * 60, intervalId: null, running: true }, // 3
    { remainingTime: vychozi_cas * 60, intervalId: null, running: true }, // 4
    // Přidat další countdowny podle potřeby
];

const initialCountdownTime = vychozi_cas * 60; // Počáteční čas odpočtu

io.on('connection', (socket) => {
    console.log('Nový uživatel připojen.');

    // Při připojení poslat aktuální časy všech countdownů klientovi
    countdowns.forEach((countdown, index) => {
        socket.emit(`updateTime${index}`, countdown.remainingTime);
    });

    // Obsluha odečítání času
socket.on('subtractTime', (data) => {
    const { countdownIndex, minutes } = data;
    const timeToSubtract = minutes * 60;

    if (!countdowns[countdownIndex].running) {
        io.emit('disableForm');
        socket.emit('timeError', 'Countdown není spuštěn. Nelze odečítat čas.');
        setTimeout(() => {
            io.emit('enableForm');
        }, 4000);
        return;
    }

    if (timeToSubtract <= countdowns[countdownIndex].remainingTime) {
        countdowns[countdownIndex].remainingTime -= timeToSubtract;
        io.emit(`updateTime${countdownIndex}`, countdowns[countdownIndex].remainingTime);
        io.emit('disableForm');
        socket.emit('subtractSuccess', 'Čas byl odečten!');
        setTimeout(() => {
            io.emit('enableForm');
        }, 4000);
    } else {
        io.emit('disableForm');
        socket.emit('timeError', 'Nelze odečíst tolik času');
        setTimeout(() => {
            io.emit('enableForm');
        }, 4000);
    }
});


    // Při požadavku na aktualizaci času poslat aktuální čas konkrétního countdownu klientovi
    socket.on('updateTimeRequest', (countdownIndex) => {
        socket.emit(`updateTime${countdownIndex}`, countdowns[countdownIndex].remainingTime);
    });

    // Spustit countdown
    socket.on('startCountdown', (countdownIndex) => {
        if (!countdowns[countdownIndex].running) {
            countdowns[countdownIndex].intervalId = setInterval(() => {
                countdowns[countdownIndex].remainingTime -= 1;
                io.emit(`updateTime${countdownIndex}`, countdowns[countdownIndex].remainingTime);

                if (countdowns[countdownIndex].remainingTime <= 0) {
                    clearInterval(countdowns[countdownIndex].intervalId);
                }
            }, 1000);
            countdowns[countdownIndex].running = true;
        }
    });

    // Zastavit countdown
    socket.on('stopCountdown', (countdownIndex) => {
        clearInterval(countdowns[countdownIndex].intervalId);
        countdowns[countdownIndex].running = false;
    });

    // Resetovat countdown na počáteční hodnotu
    socket.on('resetCountdown', (countdownIndex) => {
        countdowns[countdownIndex].remainingTime = initialCountdownTime;
        io.emit(`updateTime${countdownIndex}`, countdowns[countdownIndex].remainingTime);
    });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server běží na portu ${PORT}`);

    // Spustit všechny countdowny na serveru
    countdowns.forEach((countdown, index) => {
        countdown.intervalId = setInterval(() => {
            countdown.remainingTime -= 1;
            io.emit(`updateTime${index}`, countdown.remainingTime);

            if (countdown.remainingTime <= 0) {
                clearInterval(countdown.intervalId);
            }
        }, 1000);
    });
});
