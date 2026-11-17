const QUESTIONS = [
  "Een dier",
  "Snoep",
  "Een land",
  "Een stad",
  "Een fruitsoort",
  "Een groente",
  "Een drankje",
  "Een beroep",
  "Een kleur",
  "Een sport",
  "Een merk",
  "Een film",
  "Een lichaamsdeel",
  "Een kledingstuk",
  "Een meubelstuk",
  "Een vervoersmiddel",
  "Een muziekinstrument",
  "Een gerecht",
  "Een tv-serie",
  "Een vogel",
  "Een insect",
  "Iets uit de supermarkt",
  "Een plant of boom",
  "Een stuk gereedschap",
  "Een snack",
  "Een jongensnaam",
  "Een meisjesnaam",
  "Een schoolvak",
  "Een hobby",
  "Iets uit de keuken"
];

// No Q, X or Y: too hard to answer
const LETTERS = "ABCDEFGHIJKLMNOPRSTUVWZ".split("");

// One random letter when the game starts. It stays the same for every question.
const START_LETTER = LETTERS[Math.floor(Math.random() * LETTERS.length)];

const TIME_PER_QUESTION = 30;

const questionEl = document.getElementById("question");
const letterEl = document.getElementById("letter");
const timerEl = document.getElementById("timer");
const nextBtn = document.getElementById("next");
const backBtn = document.getElementById("back");

let deck = [];       // questions not used yet (shuffled)
let history = [];    // every question shown so far
let index = -1;      // which history item is on screen
let timeLeft = TIME_PER_QUESTION;
let timerId = null;

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function newQuestion() {
  if (deck.length === 0) {
    deck = shuffle([...QUESTIONS]);
  }
  return deck.pop();
}

function renderTimer() {
  timerEl.textContent = timeLeft;
}

function startTimer() {
  clearInterval(timerId);
  document.body.classList.remove("timeup");
  timeLeft = TIME_PER_QUESTION;
  renderTimer();
  timerId = setInterval(() => {
    timeLeft--;
    renderTimer();
    if (timeLeft <= 0) {
      clearInterval(timerId);
      document.body.classList.add("timeup");
    }
  }, 1000);
}

function showCurrent() {
  questionEl.textContent = history[index];
  letterEl.textContent = "Letter: " + START_LETTER;
  backBtn.disabled = index === 0;
  startTimer();
}

nextBtn.addEventListener("click", () => {
  if (index === history.length - 1) {
    history.push(newQuestion());
  }
  index++;
  showCurrent();
});

backBtn.addEventListener("click", () => {
  if (index > 0) {
    index--;
    showCurrent();
  }
});

// First question when the page opens
history.push(newQuestion());
index = 0;
showCurrent();
