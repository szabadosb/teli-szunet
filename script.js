const counterEl = document.getElementById('counter').querySelector('span');
const detailedEl = document.getElementById('detailed-countdown');
let confettiInterval = null;
let confettiCleanupTimeout = null;

// Új konstansok a teljesítmény javítására
const MAX_ACTIVE_CONFETTI = 120; // Maximum ennyi konfetti elem lesz egyszerre a DOM-ban
const CONFETTI_ANIMATION_DURATION = 4000; // A CSS animáció időtartama (4s)
const CONFETTI_REGEN_RATE = 100; // Milyen gyakran próbáljunk újraaktiválni egy konfettit (ms)

let confettiPool = []; // A konfetti elemek tárolója
let activeConfettiCount = 0; // Aktív konfetti elemek számlálója

function getTargetDate() {
    const now = new Date();
    // Téli szünet kezdete: december 20.
    let target = new Date(now.getFullYear(), 11, 20); // Month is 0-indexed (December is 11)

    // Ha ma már elmúlt december 20., akkor a következő év december 20.
    if (now > target) {
        target = new Date(now.getFullYear() + 1, 11, 20);
    }
    return target;
}

function getMonthDiff(startDate, endDate) {
    let months = 0;
    let tempDate = new Date(startDate);

    while (tempDate < endDate) {
        const currentMonthLength = new Date(tempDate.getFullYear(), tempDate.getMonth() + 1, 0).getDate();
        tempDate.setDate(tempDate.getDate() + currentMonthLength);
        months++;
    }

    return months - 1;
}

function getRandomColor() {
    // Téli színek (kék, fehér, ezüst árnyalatok)
    const colors = ["#ADD8E6", "#B0E0E6", "#E0FFFF", "#F0F8FF", "#FFFFFF", "#87CEEB"];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Add this helper function after getRandomColor()
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

// ÚJ segédfüggvény: két időpont közötti másodpercek, hétvégéket és szüneteket kihagyva
function getWeekdaySecondsBetween(startDate, endDate) {
    let totalMs = 0;
    let cur = new Date(startDate);
    
    // Ünnepnapok (Példák, 2025/2026-ra szabva - A hónap 0-indexelt)
    const holidays = [
        new Date(2025, 0, 1),   // Újév napja
        new Date(2025, 3, 21),  // Húsvét hétfő (Megjegyzés: a JS1-ben 3/14 van, de az 2025-ben pontatlan volt)
        new Date(2025, 4, 1),   // Munka ünnepe
        new Date(2025, 5, 9),   // Pünkösd hétfő (Megjegyzés: a JS1-ben 5/20 van, de az 2025-ben pontatlan volt)
        new Date(2025, 7, 20),  // Államalapítás ünnepe
        new Date(2025, 9, 23),  // 1956-os forradalom
        new Date(2025, 10, 1),  // Mindenszentek
        new Date(2025, 11, 25), // Karácsony (1. nap)
        new Date(2025, 11, 26), // Karácsony (2. nap)
        // 2026-os Újév a visszaszámlálóhoz
        new Date(2026, 0, 1),   // Újév napja 2026
    ];

    // Iskolai szünetek (Példák, csak a téli számít, de a teljesség igénye miatt itt van)
    const schoolBreaks = [
      { start: new Date(2025, 5, 15), end: new Date(2025, 8, 1) }, // Summer Break
        { start: new Date(2025, 10, 23), end: new Date(2025, 10, 30) }, // Autumn Break
        { start: new Date(2026, 0, 1), end: new Date(2026, 0, 8) }, // Winter Break
        { start: new Date(2026, 1, 15), end: new Date(2026, 1, 22) }, // Mid-term Break
    ];

    while (cur < endDate) {
        // A nap végét állítjuk be a "következő" időpontnak (második átmeneti pont)
        let next = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1, 0, 0, 0, 0);
        // Ha a következő időpont túllép a célidőn, akkor a célidőt vesszük
        if (next > endDate) next = new Date(endDate);

        const day = cur.getDay(); // 0 = Sunday, 6 = Saturday
        
        // Ellenőrizzük, hogy a jelenlegi nap ünnepnap-e
        const isHoliday = holidays.some(holiday => holiday.toDateString() === cur.toDateString());
        
        // Ellenőrizzük, hogy a jelenlegi nap iskolai szünetben van-e
        // Fontos: a schoolBreaks-ben a 'end' dátum exkluzív (nem tartozik bele a szünetbe)
        const isSchoolBreak = schoolBreaks.some(breakPeriod => cur >= breakPeriod.start && cur < breakPeriod.end);

        // Csak hétköznap (Hétfő-Péntek) számít, ha nem ünnep és nincs szünet
        if (day !== 0 && day !== 6 && !isHoliday && !isSchoolBreak) {
            totalMs += (next - cur); // Hozzáadjuk az eltelt másodperceket
        }

        cur = next; // Lépünk a következő napra/időpontra
    }

    return Math.floor(totalMs / 1000); // Visszatérünk az eltelt munkanapi másodpercekkel
}

// ÚJ funkció: Konfetti pool inicializálása
function initConfettiPool() {
    const confettiContainer = document.createElement('div');
    confettiContainer.classList.add('confetti-container');
    document.body.appendChild(confettiContainer);

    for (let i = 0; i < MAX_ACTIVE_CONFETTI; i++) {
        const confetti = document.createElement('div');
        confetti.classList.add('confetti');
        // Kezdetben rejtetté tesszük, vagy képernyőn kívül helyezzük
        confetti.style.display = 'none';
        confettiContainer.appendChild(confetti);
        confettiPool.push(confetti);
    }
}

// ÚJ funkció: Konfetti aktiválása a poolból
function activateConfetti() {
    // Csak akkor aktiválunk újat, ha még van hely a maximális aktív konfetti számig
    if (activeConfettiCount >= MAX_ACTIVE_CONFETTI) {
        return;
    }

    // Keressünk egy inaktív konfettit a poolban
    const confetti = confettiPool.find(c => c.style.display === 'none');

    if (confetti) {
        confetti.style.display = 'block'; // Láthatóvá tesszük
        confetti.style.left = `${Math.random() * 100}vw`;
        confetti.style.backgroundColor = getRandomColor();

        // Minden alkalommal újraindítjuk az animációt (performance hack)
        confetti.classList.remove('confetti');
        void confetti.offsetWidth; // Force reflow to restart animation
        confetti.classList.add('confetti');

        activeConfettiCount++;

        // Automatikus "deaktiválás" az animáció végén
        setTimeout(() => {
            confetti.style.display = 'none';
            activeConfettiCount--;
        }, CONFETTI_ANIMATION_DURATION);
    }
}


function startConfetti() {
    if (confettiInterval) {
        return;
    }

    // Inicializáljuk a poolt, ha még nem tettük meg
    if (confettiPool.length === 0) {
        initConfettiPool();
    }

    confettiInterval = setInterval(activateConfetti, CONFETTI_REGEN_RATE);
    console.log("Konfetti elindult!");
}

function stopConfetti() {
    clearInterval(confettiInterval);
    confettiInterval = null;
    clearTimeout(confettiCleanupTimeout);
    confettiCleanupTimeout = null;

    // Az összes konfetti elem rejtése és a pool ürítése
    confettiPool.forEach(confetti => {
        confetti.style.display = 'none';
    });
    activeConfettiCount = 0;

    document.querySelector('.confetti-container')?.remove();
    confettiPool = []; // Ürítjük a poolt, hogy újra inicializálható legyen
    console.log("Konfetti leállítva!");
}

function updateMainCounter(target) {
    const now = new Date();
    const diffInSeconds = Math.floor((target - now) / 1000);

    // Téli szünet időtartama: december 20. → január 5. (következő év)
    const breakStart = new Date(now.getFullYear(), 11, 20); // December 20
    let breakEnd = new Date(now.getFullYear() + 1, 0, 5); // Január 5. (következő év elején)

    // Ha december 20. előtt vagyunk, de január 5. már elmúlt az aktuális évben, akkor a következő év vége a cél
    if (now.getMonth() > 0 && now < breakStart) {
         // Ha jan 5. már elmúlt idén, akkor a következő téli szünet a cél
    }
    
    // Ha a mostani időpont a breakEnd előtt van, de a breakStart után
    const isBreak = (now >= breakStart && now < breakEnd);
    // Különleges eset: Ha decemberben vagyunk, de még nem 20.
    if (now.getMonth() === 11 && now.getDate() < 20) {
        isBreak = false;
    }
    // Különleges eset: Ha januárban vagyunk, és még 5. előtt
    if (now.getMonth() === 0 && now.getDate() < 5) {
        isBreak = (now < breakEnd);
    }

    if (isBreak) {
        counterEl.classList.remove('fade-out');
        counterEl.textContent = "Téli szünet van!";
        detailedEl.textContent = "Élvezd a vakációt! ❄️"; // EMOJI VÁLTOZÁS

        if (!confettiInterval) {
            startConfetti();
        }
        return;
    } else {
        if (confettiInterval) {
            stopConfetti();
        }
    }

    counterEl.classList.add('fade-out');
    setTimeout(() => {
        counterEl.textContent = `${formatNumber(diffInSeconds)} másodperc van hátra a téli szünetig!`; // FELIRAT VÁLTOZÁS
        counterEl.classList.remove('fade-out');
    }, 250);

    // Normál (teljes idő szerint)
    const days = Math.floor(diffInSeconds / (3600 * 24));
    const hours = Math.floor((diffInSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((diffInSeconds % 3600) / 60);
    const seconds = diffInSeconds % 60;

    // Tanítási napok szerint (hétvégéket kihagyva)
    const teachingSeconds = getWeekdaySecondsBetween(now, target);
    const tDays = Math.floor(teachingSeconds / (3600 * 24));
    const tHours = Math.floor((teachingSeconds % (3600 * 24)) / 3600);
    const tMinutes = Math.floor((teachingSeconds % 3600) / 60);
    const tSeconds = teachingSeconds % 60;

    detailedEl.innerHTML = 
        `Ez pontosan ${formatNumber(days)} nap, ${formatNumber(hours)} óra, ${formatNumber(minutes)} perc, ${formatNumber(seconds)} másodperc.` +
        `<br><br>Ebből <strong> ${formatNumber(tDays)} </strong> iskolai nap.`;
        //  ${formatNumber(tDays)} nap, ${tHours} óra, ${tMinutes} perc, ${tSeconds} másodperc.`; 
}

function updateDetailedBox(target) {
    const now = new Date();
    let timeLeft = target - now;

    if (timeLeft < 0) {
        // Ha a célidő elmúlt, állítsuk a következő évre
        target = new Date(target.getFullYear() + 1, 11, 20); // December 20
        timeLeft = target - now;
    }

    const totalSeconds = Math.floor(timeLeft / 1000);
    const totalMinutes = Math.floor(timeLeft / (1000 * 60));
    const totalHours = Math.floor(timeLeft / (1000 * 60 * 60));
    const totalDays = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const totalWeeks = Math.floor(totalDays / 7);
    const totalMonths = getMonthDiff(now, target);

    if (document.getElementById("months")) {
        document.getElementById("months").textContent = formatNumber(totalMonths);
        document.getElementById("weeks").textContent = formatNumber(totalWeeks);
        document.getElementById("days").textContent = formatNumber(totalDays);
        document.getElementById("hours").textContent = formatNumber(totalHours);
        document.getElementById("minutes").textContent = formatNumber(totalMinutes);
        document.getElementById("seconds").textContent = formatNumber(totalSeconds);
    }
}

// ÚJ Funkció a hátralévő szünethez (JS1-ből átvéve)
function updateRemainingBreak() {
    const now = new Date();

    const breakStart = new Date(now.getFullYear(), 11, 20); // Dec 20
    let breakEnd = new Date(now.getFullYear(), 0, 5);       // Jan 5

    // Ha januárban vagyunk, és a breakEnd kisebb a breakStart-nál,
    // akkor a breakEnd-nek a következő év január 5-nek kell lennie
    // Ez a logikai hiba a JS1-ből jön, a breakEnd-et mindig a *következő* év január 5-ére kell állítani,
    // ha a visszaszámláló a következő télre számol
    if (breakEnd < now) {
         breakEnd = new Date(now.getFullYear() + 1, 0, 5);
    }
     // Ha decemberben vagyunk, a breakEnd legyen a következő év január 5-e
    if (now.getMonth() === 11) {
         breakEnd = new Date(now.getFullYear() + 1, 0, 5);
    }
    // Ha januárban vagyunk és még 5. előtt, a breakStart-nak az előző év dec 20-ának kell lennie
    if (now.getMonth() === 0 && now.getDate() < 5) {
         breakStart = new Date(now.getFullYear() - 1, 11, 20);
    }
    
    // Az egyszerűség kedvéért a kezdeti targetDate logikát használjuk a breakEnd beállítására
    let currentBreakStart = new Date(now.getFullYear(), 11, 20);
    let currentBreakEnd = new Date(now.getFullYear() + 1, 0, 5);
    
    if (now.getMonth() < 10) { // Januártól októberig a következő téli szünet a cél
        currentBreakStart = new Date(now.getFullYear(), 11, 20);
        currentBreakEnd = new Date(now.getFullYear() + 1, 0, 5);
    } else if (now.getMonth() === 11 && now.getDate() >= 20) { // Ha már benne vagyunk a szünetben (dec 20 után)
        currentBreakStart = new Date(now.getFullYear(), 11, 20);
        currentBreakEnd = new Date(now.getFullYear() + 1, 0, 5);
    } else if (now.getMonth() === 0 && now.getDate() < 5) { // Ha még benne vagyunk a szünetben (január 5 előtt)
        currentBreakStart = new Date(now.getFullYear() - 1, 11, 20);
        currentBreakEnd = new Date(now.getFullYear(), 0, 5);
    } else { // Egyébként a következő téli szünet
        currentBreakStart = new Date(now.getFullYear(), 11, 20);
        currentBreakEnd = new Date(now.getFullYear() + 1, 0, 5);
    }
    

    const box = document.getElementById("remaining-break-box");
    const text = document.getElementById("remaining-break-text");

    if (!box || !text) return; // Ha hiányzik a HTML elem, lépjünk át

    // ====== Szünidő van? ======
    if (now >= currentBreakStart && now < currentBreakEnd) {
        box.style.display = "block";

        const diff = currentBreakEnd - now;
        const totalSeconds = Math.floor(diff / 1000);

        const d = Math.floor(totalSeconds / (3600 * 24));
        const h = Math.floor((totalSeconds % (3600 * 24)) / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;

        text.innerHTML =
            `A téli szünetből még hátravan:<br>
            <span class="number">${formatNumber(d)}</span> nap,
            <span class="number">${formatNumber(h)}</span> óra,
            <span class="number">${formatNumber(m)}</span> perc,
            <span class="number">${formatNumber(s)}</span> mp.`;
    } else {
        // ====== Nincs szünidő ======
        box.style.display = "none";
    }
}


function updateAll() {
    const target = getTargetDate();
    updateMainCounter(target);
    updateDetailedBox(target);
    updateRemainingBreak();  // <--- ÚJ
}


// Első futtatás és frissítés másodpercenként
updateAll();
setInterval(updateAll, 1000);