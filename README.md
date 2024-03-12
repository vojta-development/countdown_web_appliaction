# Countdown web application

Tato jednouchá webová aplikace umožňuje ovládat několik na sobě nezávislých countdownů. Každý z nich má svou jedinečnou URL adresu. Funkce odpočítávání času běží na serveru pomocí *Node.js*, tzn.: countdown se ve webovém prohlížeči jen zobrazuje. Díky tomu se po refreshu stránky s countdownem čas neresetuje, ale běží dál.

## složka Public

V této složce se nachází soubory, které zobrazuje jednotlivé countdowny (*timer1.html*, *timer2.html*...),a taky soubor pro ovládaní countdownů (*form.html*)

## server.js
V tomto souboru se nachází samotná funkce odpočítávání času na serveru.

Nejdříve se načtou všechny potřebné knihovny *Node.js* a deklaruju si proměnné:
```javascript
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
```
nastavení složky, kde se nachází klientské soubory pro zobrazení countdownů:
```javascript
app.use(express.static(path.join(__dirname, 'public')));
```

deklarace pole, které musí mít tolik řádků, kolik bude jednotlivých countdownů. Proměnná *vychozi_cas* nám jednoduše nastaví čas při spuštění serveru. (všechny countdowny mají stejný výchozí čas). Proměnná *vychozi_cas* je vynásobená 60, jelikož musíme pracovat s časem v sekundách.
```javascript
// Inicializace hodnot countdownů

const vychozi_cas = 240
const countdowns = [
    { remainingTime: vychozi_cas * 60, intervalId: null, running: true }, // 1
    { remainingTime: vychozi_cas * 60, intervalId: null, running: true }, // 2
    { remainingTime: vychozi_cas * 60, intervalId: null, running: true }, // 3
    // Přidat další countdowny podle potřeby
];

const initialCountdownTime = vychozi_cas * 60; // Počáteční čas odpočtu
```
Další část kódu obsluhuje posílání času klientům na zobrazení a odečet času přes formulář. Ve formuláři taky zobrazujeme kontrolní hlášku o úspěchu či neúspěchu odečtu. Taky je tu podmínka, pokud bychom chtěli přes formulář odečíst více času, než zbývá do konce odpočtu.

```javascript
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
```

V další části je nakonfigurovaná funkčnot tlačítek *START*, *STOP* a *RESET*.
```javascript
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
```
Závěr kódu vypisuje do konzole stav o serveru a řeší aktualizaci countdownu každou sekundu.
```javascript
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
```
## controls.js
Soubor pro ovládání tří tlačítek *START*, *STOP* a *RESET*.
```javascript
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
```



## timer1.html
Velice jednoduchý HTML kód pro stránku, který obsahuje taky JavaScript kód pro aktualizaci a zobrazování countdownu. Po vypršení času se zobrazí hláška. Pokud chceme kód upravit pro zobrazován jiného countdownu, musíme změnit *'updateTime0'* na *'updateTime1'* a tak dál... 
```javascript
...
socket.on('updateTime0', (remainingTime) => {
...
```
Následující funkce řeší aktualizaci countdownu každou sekundu. Celé řešení aplikace je postaveno na této funkci *setInterval*. Pro modifikaci na jiný countdown musíme změnit číslo z *0* na *1* a tak dál... (tímto číslem říkáme, který řádek z pole deklarujícího countdowny v souboru *server.js* bude aktivní na této stránce.)
```javascript
setInterval(() => {
            socket.emit('updateTimeRequest', 0);
        }, 1000);
```

## form.html
V tomto souboru se nachází formulář pro odebrání času z countdownu a tlačítka *START*, *STOP* a *RESET*. Počet nabídek v rozbalovacím seznamu odpovídá počtu ovládaných countdownů. Jinak se v tomto souboru nic nemění.

## Modifikace pro více countdownů

### #1 kopírujem soubor *timer1.html*
Nastavit aplikaci pro více nebo méně countdownů je velmi jednoduché. Stačí ve složce *public* nakopírovat soubor *timer1.html* a přejmenovat ho. (na jménu souboru nezáleží - může být jakékoliv). Můžeme ho pojmenovat třeba timer2.html

### #2 změny z souboru *timer2.html*
V tomto překopírovaném souboru změníme nadpis a následující kódy:
*'updateTime0'* na *'updateTime1'* a tak dál... 
```javascript
...
socket.on('updateTime0', (remainingTime) => {
...
```
A taky musíme změnit číslo z *0* na *1* a tak dál... (tímto číslem říkáme, který řádek z pole deklarujícího countdowny v souboru *server.js* bude aktivní na této stránce.)
```javascript
setInterval(() => {
            socket.emit('updateTimeRequest', 0);
        }, 1000);
```

### #3 změna v souboru *server.js*
Pole na začátku kódu musí mít dostatečný počet řádků pro dané countdowny.
```javascript
const countdowns = [
    { remainingTime: vychozi_cas * 60, intervalId: null, running: true }, // 1
    { remainingTime: vychozi_cas * 60, intervalId: null, running: true }, // 2
    { remainingTime: vychozi_cas * 60, intervalId: null, running: true }, // 3
    // Přidat další countdowny podle potřeby
];
```

### #4 změna v souboru *form.html*
Do rozbalovací nabídky musíme přidat možnost pro výběr tohoto countdownu.
```javascript
<select id="countdownIndex" name="countdownIndex" class="select-box">
                <option value="1">Tým 1</option>
                <option value="2">Tým 2</option>
                <option value="3">Tým 3</option>
                <!-- Přidat další možnosti pro countdowny podle potřeby -->
            </select>
```


A to je všechno! Modifikace tohoto řešení je velice jednoduchá a proto je její použití univerzální. Výhodou je taky to, že soubor s countdownem ve složce *public* může mít jakýkoli název - tudíž si můžeme vytvořit libovolnou URL adresu stránky.

## Upload na veřejný server
Tady nastvává trochu komplikace, jelikož mé programátorské skills nejsou zatím tak velké. Nevím, zda to lze jednoduše nahrát na obyčejný webhosting, každopádně já jsem využíval webové služby [render.com](https://render.com), jejíž prostředí na konfiguraci bylo velmi jednoduché a podobné jako ladění na lokálním serveru v PC. Služba je zcela zdarma. 


# Instalace lokálního Node.js
Abychom mohli testovat a ladit program, který běží na Node.js, je dobré si ho do svého počítače nainstalovat. Zde je jednoduchý návod jak na to:
### 1) Stáhneme a nainstalujeme si balíček .exe
Na oficiálním [webu](https://nodejs.org/en) si stáhneme a nainstalujeme balíčet s Node.js.
### 2) Inicializuj nový projekt:
Vytvoř nový adresář pro projekt a otevři v něm příkazový řádek. Poté spusť následující příkazy:
```bash
npm init -y
npm install express socket.io
```
### 3) spusť *server.js*
V příkazovém řádku ve správném adresáři spusť soubor *server.js* pomocí příkazu
```bash
node server.js
```
### otevři webovou stránku
Pokud vše běží správně, otevři ve webovém prohlížeči *http://127.0.0.1:3000/* a uvidíš svoji aplikaci.
