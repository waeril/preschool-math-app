// Data Models & Constants
const STORAGE_KEY = 'preschoolMathData';
const EMOJIS = ['🍎', '🐶', '🚗', '🌟', '🎈', '🐱', '🦋', '⚽', '🧸', '🍓'];
const NUMBER_WORDS = ['zero','one','two','three','four','five','six','seven','eight','nine','ten'];
const GRADES = [
    { threshold: 80, grade: 'A' }, { threshold: 60, grade: 'B' },
    { threshold: 50, grade: 'C' }, { threshold: 40, grade: 'D' }, { threshold: 0, grade: 'F' }
];

let appData = { users: [], history: [] };
let session = {}; // Tracks current game

// Initialization
window.onload = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) appData = JSON.parse(saved);
    updateUserDropdowns();
};

function saveData() { localStorage.setItem(STORAGE_KEY, JSON.stringify(appData)); }

// User Management
function createUser() {
    const name = document.getElementById('new-username').value.trim();
    if (name && !appData.users.includes(name)) {
        appData.users.push(name);
        saveData();
        updateUserDropdowns();
        document.getElementById('new-username').value = '';
        document.getElementById('user-select').value = name;
    }
}

function updateUserDropdowns() {
    const mainSelect = document.getElementById('user-select');
    const compSelect = document.getElementById('compare-user-select');
    mainSelect.innerHTML = '<option value="">-- Select Profile --</option>';
    compSelect.innerHTML = '<option value="">-- Compare with... (Optional) --</option>';
    
    appData.users.forEach(user => {
        mainSelect.innerHTML += `<option value="${user}">${user}</option>`;
        compSelect.innerHTML += `<option value="${user}">${user}</option>`;
    });
}

// Navigation
function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}
function goHome() { switchScreen('screen-home'); }

// Game Logic
function startGame(mode) {
    const user = document.getElementById('user-select').value;
    if (!user) return alert('Please select or create a profile first!');

    session = {
        user, mode, questions: [], currentQ: 0,
        score: 0, sessionStartTime: performance.now(),
        qStartTime: 0, correctTimes: [], isProcessing: false
    };

    document.getElementById('mode-title').innerText = getModeName(mode);
    generateQuestions(mode);
    switchScreen('screen-game');
    loadQuestion();
}

function quitGame() {
    clearTimeout(session.autoTimer);
    clearInterval(session.countdownInterval);
    goHome();
}

function getModeName(mode) {
    const names = { guess: "Guess Emojis", add: "Addition", sub: "Subtraction", mix: "Mix (+ & -)", spell: "Spelling" };
    return names[mode];
}

function generateQuestions(mode) {
    for (let i = 0; i < 10; i++) {
        let q = {}, a, b;
        switch(mode) {
            case 'guess':
                q.answer = Math.floor(Math.random() * 10) + 1; // 1-10
                q.display = EMOJIS[Math.floor(Math.random() * EMOJIS.length)].repeat(q.answer);
                break;
            case 'add':
                a = Math.floor(Math.random() * 6); // Keep sums <= 10
                b = Math.floor(Math.random() * (11 - a));
                q.display = `${a} + ${b} = ?`; q.answer = a + b;
                break;
            case 'sub':
                a = Math.floor(Math.random() * 11);
                b = Math.floor(Math.random() * (a + 1));
                q.display = `${a} - ${b} = ?`; q.answer = a - b;
                break;
            case 'mix':
                if (Math.random() > 0.5) {
                    a = Math.floor(Math.random() * 6); b = Math.floor(Math.random() * (11 - a));
                    q.display = `${a} + ${b} = ?`; q.answer = a + b;
                } else {
                    a = Math.floor(Math.random() * 11); b = Math.floor(Math.random() * (a + 1));
                    q.display = `${a} - ${b} = ?`; q.answer = a - b;
                }
                break;
            case 'spell':
                q.answer = Math.floor(Math.random() * 11); // 0-10
                q.display = q.answer.toString();
                q.strAnswer = NUMBER_WORDS[q.answer];
                break;
        }
        session.questions.push(q);
    }
}

function loadQuestion() {
    session.isProcessing = false;
    const q = session.questions[session.currentQ];
    
    // Reset UI
    document.getElementById('answer-display').innerText = '';
    document.getElementById('feedback-message').innerText = '';
    document.getElementById('spell-input').value = '';
    
    const isSpell = session.mode === 'spell';
    document.getElementById('spell-input').classList.toggle('hidden', !isSpell);
    document.getElementById('custom-keypad').classList.toggle('hidden', isSpell);
    document.getElementById('btn-submit').classList.toggle('hidden', session.mode === 'guess'); // Hidden for guess mode
    
    if (session.mode === 'guess') {
        document.getElementById('emoji-display').innerText = q.display;
        document.getElementById('emoji-display').classList.remove('hidden');
        document.getElementById('math-display').classList.add('hidden');
        startGuessCountdown();
    } else {
        document.getElementById('math-display').innerText = q.display;
        document.getElementById('math-display').classList.remove('hidden');
        document.getElementById('emoji-display').classList.add('hidden');
        document.getElementById('timer-display').innerText = `Q${session.currentQ + 1}/10`;
    }

    session.qStartTime = performance.now();
}

function startGuessCountdown() {
    let timeLeft = 5;
    document.getElementById('timer-display').innerText = `⏳ ${timeLeft}s`;
    
    session.countdownInterval = setInterval(() => {
        timeLeft--;
        if (timeLeft > 0) document.getElementById('timer-display').innerText = `⏳ ${timeLeft}s`;
    }, 1000);

    session.autoTimer = setTimeout(() => {
        clearInterval(session.countdownInterval);
        if(!session.isProcessing) forceNextQuestion(); // Move on if not answered
    }, 5000);
}

function forceNextQuestion() {
    document.getElementById('feedback-message').innerText = "Time's up!";
    document.getElementById('feedback-message').style.color = 'gray';
    setTimeout(nextQuestion, 1000);
}

// Input Handling
function appendNum(num) {
    if (session.isProcessing) return;
    const display = document.getElementById('answer-display');
    display.innerText += num;
    if (session.mode === 'guess') submitAnswer(); // Auto submit
}
function clearNum() { document.getElementById('answer-display').innerText = ''; }

function submitAnswer() {
    if (session.isProcessing) return;
    session.isProcessing = true;
    clearTimeout(session.autoTimer);
    clearInterval(session.countdownInterval);

    const timeTaken = performance.now() - session.qStartTime;
    const q = session.questions[session.currentQ];
    
    let userAnswer;
    if (session.mode === 'spell') {
        userAnswer = document.getElementById('spell-input').value.trim().toLowerCase();
    } else {
        userAnswer = parseInt(document.getElementById('answer-display').innerText);
    }

    const isCorrect = session.mode === 'spell' ? (userAnswer === q.strAnswer) : (userAnswer === q.answer);
    const feedback = document.getElementById('feedback-message');

    if (isCorrect) {
        session.score++;
        session.correctTimes.push(timeTaken);
        feedback.innerText = "✅ Correct!";
        feedback.style.color = "green";
    } else {
        const correctTxt = session.mode === 'spell' ? q.strAnswer : q.answer;
        feedback.innerText = `❌ Oops! Correct answer: ${correctTxt}`;
        feedback.style.color = "red";
    }

    setTimeout(nextQuestion, 1500);
}

function nextQuestion() {
    session.currentQ++;
    if (session.currentQ < 10) {
        loadQuestion();
    } else {
        endSession();
    }
}

// End of Session & Storage
function endSession() {
    const totalTime = performance.now() - session.sessionStartTime;
    const percentage = (session.score / 10) * 100;
    const grade = GRADES.find(g => percentage >= g.threshold).grade;
    
    const avgTime = session.correctTimes.length > 0 
        ? session.correctTimes.reduce((a, b) => a + b, 0) / session.correctTimes.length 
        : 0;

    // Save to history
    appData.history.push({
        user: session.user,
        mode: session.mode,
        score: session.score,
        percentage: percentage,
        totalTimeSec: totalTime / 1000,
        avgCorrectTimeSec: avgTime / 1000,
        date: new Date().toISOString()
    });
    saveData();

    // Show Results
    document.getElementById('res-grade').innerText = grade;
    document.getElementById('res-score').innerText = session.score;
    document.getElementById('res-percent').innerText = percentage;
    document.getElementById('res-total-time').innerText = (totalTime / 1000).toFixed(2);
    document.getElementById('res-avg-time').innerText = (avgTime / 1000).toFixed(2);
    
    switchScreen('screen-results');
}

// Analysis Logic
function showAnalysis() {
    renderAnalysis();
    switchScreen('screen-analysis');
}

function renderAnalysis() {
    const user = document.getElementById('user-select').value;
    const compareUser = document.getElementById('compare-user-select').value;
    const table = document.getElementById('analysis-table');
    
    if (!user) { table.innerHTML = "<tr><td>Please select a profile on the home screen.</td></tr>"; return; }

    let html = `<tr>
        <th>Mode</th>
        <th>${user} (Avg %)</th>
        <th>${user} (Avg Time/Correct)</th>`;
    
    if (compareUser) {
        html += `<th>${compareUser} (Avg %)</th><th>${compareUser} (Avg Time/Correct)</th>`;
    }
    html += `</tr>`;

    const modes = ['guess', 'add', 'sub', 'mix', 'spell'];
    
    modes.forEach(mode => {
        const uStats = getStats(user, mode);
        const cStats = compareUser ? getStats(compareUser, mode) : null;

        let uPctClass = '', cPctClass = '', uTimeClass = '', cTimeClass = '';

        // Green highlight logic
        if (cStats && uStats.attempts > 0 && cStats.attempts > 0) {
            if (uStats.avgPct > cStats.avgPct) uPctClass = 'better-stat';
            else if (cStats.avgPct > uStats.avgPct) cPctClass = 'better-stat';

            if (uStats.avgTime > 0 && cStats.avgTime > 0) {
                if (uStats.avgTime < cStats.avgTime) uTimeClass = 'better-stat';
                else if (cStats.avgTime < uStats.avgTime) cTimeClass = 'better-stat';
            }
        }

        html += `<tr>
            <td>${getModeName(mode)}</td>
            <td class="${uPctClass}">${uStats.attempts ? uStats.avgPct.toFixed(1) + '%' : 'N/A'}</td>
            <td class="${uTimeClass}">${uStats.attempts ? uStats.avgTime.toFixed(2) + 's' : 'N/A'}</td>`;
            
        if (compareUser) {
            html += `<td class="${cPctClass}">${cStats.attempts ? cStats.avgPct.toFixed(1) + '%' : 'N/A'}</td>
                     <td class="${cTimeClass}">${cStats.attempts ? cStats.avgTime.toFixed(2) + 's' : 'N/A'}</td>`;
        }
        html += `</tr>`;
    });

    table.innerHTML = html;
}

function getStats(user, mode) {
    const filtered = appData.history.filter(h => h.user === user && h.mode === mode);
    if (filtered.length === 0) return { attempts: 0 };
    
    const avgPct = filtered.reduce((sum, h) => sum + h.percentage, 0) / filtered.length;
    
    // Only average times where they actually got correct answers (avoid 0 denominators)
    const validTimes = filtered.filter(h => h.avgCorrectTimeSec > 0);
    const avgTime = validTimes.length > 0 
        ? validTimes.reduce((sum, h) => sum + h.avgCorrectTimeSec, 0) / validTimes.length 
        : 0;

    return { attempts: filtered.length, avgPct, avgTime };
}