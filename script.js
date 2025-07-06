const counterEl = document.getElementById('counter').querySelector('span');
        const detailedEl = document.getElementById('detailed-countdown');
        let confettiInterval = null;
        let confettiCleanupTimeout = null;

        const MAX_ACTIVE_CONFETTI = 120;
        const CONFETTI_ANIMATION_DURATION = 4000;
        const CONFETTI_REGEN_RATE = 100;

        let confettiPool = [];
        let activeConfettiCount = 0;

        function getTargetDate() {
            const now = new Date();
            // 2025. december 20.
            let target = new Date(now.getFullYear(), 11, 20); // Month is 0-indexed (December is 11)

            // If today is past the target date for this year, set it for next year
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
            // Winter colors
            const colors = ["#ADD8E6", "#B0E0E6", "#E0FFFF", "#F0F8FF", "#FFFFFF", "#87CEEB"];
            return colors[Math.floor(Math.random() * colors.length)];
        }

        function initConfettiPool() {
            const confettiContainer = document.createElement('div');
            confettiContainer.classList.add('confetti-container');
            document.body.appendChild(confettiContainer);

            for (let i = 0; i < MAX_ACTIVE_CONFETTI; i++) {
                const confetti = document.createElement('div');
                confetti.classList.add('confetti');
                confetti.style.display = 'none';
                confettiContainer.appendChild(confetti);
                confettiPool.push(confetti);
            }
        }

        function activateConfetti() {
            if (activeConfettiCount >= MAX_ACTIVE_CONFETTI) {
                return;
            }

            const confetti = confettiPool.find(c => c.style.display === 'none');

            if (confetti) {
                confetti.style.display = 'block';
                confetti.style.left = `${Math.random() * 100}vw`;
                confetti.style.backgroundColor = getRandomColor();

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

        function formatNumber(num) {
            return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
        }

        function updateMainCounter(target) {
            const now = new Date();
            const diffInSeconds = Math.floor((target - now) / 1000);

            // Define the break period (December 20 to January 4 for Winter)
            const breakStart = new Date(now.getFullYear(), 11, 20); // December 20
            let breakEnd = new Date(now.getFullYear(), 0, 5); // January 5 of next year

            // If breakEnd is before breakStart (e.g., if we are in Jan 2026 and breakStart is Dec 2025), adjust breakEnd to next year
            if (breakEnd < breakStart) {
                breakEnd = new Date(now.getFullYear() + 1, 0, 5);
            }

            const isBreak = (now >= breakStart && now < breakEnd);

            if (isBreak) {
                counterEl.classList.remove('fade-out');
                counterEl.textContent = "Téli szünet van!";
                detailedEl.textContent = "Élvezd a vakációt! 🎉";

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

            detailedEl.textContent = `Ez pontosan ${Math.floor(diffInSeconds / (3600 * 24))} nap, ${Math.floor((diffInSeconds % (3600 * 24)) / 3600)} óra, ${Math.floor((diffInSeconds % 3600) / 60)} perc, ${diffInSeconds % 60} másodperc.`;
        }

        function updateDetailedBox(target) {
            const now = new Date();
            let timeLeft = target - now;

            if (timeLeft < 0) {
                // If the target date has passed, calculate for next year's break
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

        function updateAll() {
            const target = getTargetDate();
            updateMainCounter(target);
            updateDetailedBox(target);
        }

        // First run and update every second
        updateAll();
        setInterval(updateAll, 1000);

        function updateRemainingBreak() {
    const now = new Date();

    const breakStart = new Date(now.getFullYear(), 11, 20); // dec 20
    let breakEnd = new Date(now.getFullYear(), 0, 5);       // jan 5

    // Ha januárban vagyunk → breakEnd legyen a következő év jan 5
    if (breakEnd < breakStart) {
        breakEnd = new Date(now.getFullYear() + 1, 0, 5);
    }

    const box = document.getElementById("remaining-break-box");
    const text = document.getElementById("remaining-break-text");

    if (now >= breakStart && now < breakEnd) {
        // ====== Szünidő van ======
        box.style.display = "block";

        const diff = breakEnd - now;
        const totalSeconds = Math.floor(diff / 1000);

        const d = Math.floor(totalSeconds / (3600 * 24));
        const h = Math.floor((totalSeconds % (3600 * 24)) / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;

        text.innerHTML =
            `A téli szünetből még hátravan:<br>
            <span class="number">${formatNumber(d)}</span> nap
            <span class="number">${formatNumber(h)}</span> óra
            <span class="number">${formatNumber(m)}</span> perc
            <span class="number">${formatNumber(s)}</span> mp.`;
    } else {
        // ====== Nincs szünidő ======
        box.style.display = "none";
    }
}
updateRemainingBreak();

function updateAll() {
    const target = getTargetDate();
    updateMainCounter(target);
    updateDetailedBox(target);
    updateRemainingBreak();   // <--- ÚJ
}
