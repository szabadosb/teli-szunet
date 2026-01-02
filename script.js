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

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

const EXTRA_SCHOOL_DAYS = [
     '2025-12-13', 
];

function toYMD(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function isExtraSchoolDay(date) {
    return EXTRA_SCHOOL_DAYS.includes(toYMD(date));
}

function getWeekdaySecondsBetween(startDate, endDate) {
    let totalMs = 0;
    let cur = new Date(startDate);
    const holidays = [
        new Date(2025, 0, 1),  // Újév – január 1.
        new Date(2025, 2, 15), // Nemzeti ünnep – március 15. 
        new Date(2025, 3, 18), // Nagypéntek – április 18. 
        new Date(2025, 3, 20), // Húsvétvasárnap – április 20. 
        new Date(2025, 3, 21), // Húsvéthétfő – április 21. 
        new Date(2025, 4, 1),  // A munka ünnepe – május 1. 
        new Date(2025, 4, 2),  // Pihenőnap – május 2. (áthelyezett) 
        new Date(2025, 5, 8),  // Pünkösdvasárnap – június 8. 
        new Date(2025, 5, 9),  // Pünkösdhétfő – június 9. 
        new Date(2025, 7, 20), // Államalapítás ünnepe – augusztus 20.
        new Date(2025, 9, 23), // Nemzeti ünnep – október 23. 
        new Date(2025, 9, 24), // Pihenőnap – október 24. (áthelyezett) 
        new Date(2025, 10, 1), // Mindenszentek – november 1. 
        new Date(2025, 11, 24), // Pihenőnap – december 24.
        new Date(2025, 11, 25), // Karácsony – december 25. 
        new Date(2025, 11, 26), // Karácsony másnapja – december 26.
    ];

    const schoolBreaks = [
        { start: new Date(2026, 5, 23), end: new Date(2026, 8, 1) }, // Nyári szünet
        { start: new Date(2025, 9, 23), end: new Date(2025, 10, 2) }, // Őszi szünet
        { start: new Date(2026, 11, 12), end: new Date(2026, 0, 4) }, // Téli szünet
        { start: new Date(2026, 3, 2), end: new Date(2026, 1, 12) }, // Tavaszi szünet
    ];
    
    while (cur < endDate) {
        let next = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1, 0, 0, 0, 0);
        if (next > endDate) next = new Date(endDate);

        const day = cur.getDay(); 
        const isHoliday = holidays.some(holiday => holiday.toDateString() === cur.toDateString());
        const isSchoolBreak = schoolBreaks.some(breakPeriod => cur >= breakPeriod.start && cur < breakPeriod.end);
        const extraDay = isExtraSchoolDay(cur);

        if ((!isHoliday && !isSchoolBreak) && ( (day !== 0 && day !== 6) || extraDay )) {
            totalMs += (next - cur); 
        }
        cur = next; 
    }
    return Math.floor(totalMs / 1000); 
}

// ÚJ: A második mintából átvett pool logika
function initConfettiPool() {
    const confettiContainer = document.createElement('div');
    confettiContainer.classList.add('confetti-container');
    document.body.appendChild(confettiContainer);

    for (let i = 0; i < MAX_ACTIVE_CONFETTI; i++) {
        const confetti = document.createElement('div');
        confetti.classList.add('confetti');
        confetti.textContent = '❄️'; // Hópehely a téli szünethez
        confetti.style.display = 'none';
        confettiContainer.appendChild(confetti);
        confettiPool.push(confetti);
    }
}

// ÚJ: A második mintából átvett aktiválási logika
function activateConfetti() {
    if (activeConfettiCount >= MAX_ACTIVE_CONFETTI) {
        return;
    }

    const confetti = confettiPool.find(c => c.style.display === 'none');

    if (confetti) {
        confetti.style.display = 'block';
        confetti.style.left = `${Math.random() * 100}vw`;

        // Újraindítja az animációt a class levételével és visszatételével
        confetti.classList.remove('confetti');
        void confetti.offsetWidth; 
        confetti.classList.add('confetti');

        activeConfettiCount++;

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

    confettiPool.forEach(confetti => {
        confetti.style.display = 'none';
    });
    activeConfettiCount = 0;

    document.querySelector('.confetti-container')?.remove();
    confettiPool = []; 
    console.log("Konfetti leállítva!");
}

function updateMainCounter(target) {
    const now = new Date();
    const diffInSeconds = Math.floor((target - now) / 1000);

    const breakStart = new Date(now.getFullYear(), 11, 20); 
    let breakEnd = new Date(now.getFullYear() + 1, 0, 5); 

    let isBreak = (now >= breakStart && now < breakEnd);
    if (now.getMonth() === 11 && now.getDate() < 20) {
        isBreak = false;
    }
    if (now.getMonth() === 0 && now.getDate() < 5) {
        isBreak = (now < breakEnd);
    }

    if (isBreak) {
        counterEl.classList.remove('fade-out');
        counterEl.textContent = "Téli szünet van!";
        detailedEl.textContent = "Élvezd a szünetet! 🎄🎁❄️ "; 

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
        counterEl.textContent = `${formatNumber(diffInSeconds)} másodperc van hátra a téli szünetig!`; 
        counterEl.classList.remove('fade-out');
    }, 250);

    const days = Math.floor(diffInSeconds / (3600 * 24));
    const hours = Math.floor((diffInSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((diffInSeconds % 3600) / 60);
    const seconds = diffInSeconds % 60;

    const teachingSeconds = getWeekdaySecondsBetween(now, target);
    const tDays = Math.floor(teachingSeconds / (3600 * 24));

    detailedEl.innerHTML = 
        `Ez pontosan ${formatNumber(days)} nap, ${formatNumber(hours)} óra, ${formatNumber(minutes)} perc, ${formatNumber(seconds)} másodperc.` +
        `<br><br>Ebből <strong> ${formatNumber(tDays)} </strong> iskolai nap.`;
}

function updateDetailedBox(target) {
    const now = new Date();
    let timeLeft = target - now;

    if (timeLeft < 0) {
        target = new Date(target.getFullYear() + 1, 11, 20); 
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

function updateRemainingBreak() {
    const now = new Date();
    let currentBreakStart = new Date(now.getFullYear(), 11, 20);
    let currentBreakEnd = new Date(now.getFullYear() + 1, 0, 5);
    
    if (now.getMonth() === 0 && now.getDate() < 5) {
        currentBreakStart = new Date(now.getFullYear() - 1, 11, 20);
        currentBreakEnd = new Date(now.getFullYear(), 0, 5);
    }

    const box = document.getElementById("remaining-break-box");
    const text = document.getElementById("remaining-break-text");

    if (!box || !text) return; 

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
        box.style.display = "none";
    }
}

function updateAll() {
    const target = getTargetDate();
    updateMainCounter(target);
    updateDetailedBox(target);
    updateRemainingBreak();  
}

// Egyéni egérmutató inicializálása
if (!('ontouchstart' in window)) {
    const customCursor = document.createElement('div');
    customCursor.style.position = 'fixed';
    customCursor.style.pointerEvents = 'none';
    customCursor.style.zIndex = '9999';
    customCursor.style.width = '30px'; 
    customCursor.style.height = '30px';
    customCursor.innerHTML = '<img src="christmas-tree.png" style="width: 100%; height: 100%; transform: rotate(-25deg);">';
    document.body.appendChild(customCursor);

    document.addEventListener('mousemove', (e) => {
        customCursor.style.left = `${e.clientX}px`;
        customCursor.style.top = `${e.clientY}px`;
    });

    document.body.style.cursor = 'none';

    document.addEventListener('mouseleave', () => {
        customCursor.style.display = 'none';
    });

    document.addEventListener('mouseenter', () => {
        customCursor.style.display = 'block';
    });
}

updateAll();
setInterval(updateAll, 1000);