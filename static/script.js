let blocks = [], currentBlock = 0, currentTrial = 0;
let totalTrialCount = 0, totalTrials = 0;
let stimIndex = 0;
let currentA = 0, currentB = 0;

const nameInput      = document.getElementById("subject-name");
const startBtn       = document.getElementById("start-btn");
const display        = document.getElementById("word-display");
const inductionNote  = document.getElementById("induction-note");
const mathTask       = document.getElementById("math-task");
const mathQ          = document.getElementById("math-question");
const mathIn         = document.getElementById("math-input");
const submitM        = document.getElementById("submit-math");
const mathFeedback   = document.getElementById("math-feedback");
const recall         = document.getElementById("recall-screen");
const recallT        = document.getElementById("recall-timer");
const breakScreen    = document.getElementById("break-screen");
const introScreen    = document.getElementById("intro-screen");
const instructionScreen = document.getElementById("instruction-screen");

// Enable Start when name is entered
nameInput.addEventListener("input", () => {
  startBtn.disabled = nameInput.value.trim() === "";
});
// Also start on ENTER while in intro
nameInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && !startBtn.disabled) startBtn.click();
});

// When the user clicks start, hide the intro screen and show the instruction screen.
startBtn.onclick = async () => {
  introScreen.style.display = "none";
  instructionScreen.style.display = "block";
  // Wait for subject to press spacebar on instruction screen
  document.addEventListener("keydown", startExperimentOnSpace);
};

function startExperimentOnSpace(e) {
  if (e.code === "Space") {
    document.removeEventListener("keydown", startExperimentOnSpace);
    instructionScreen.style.display = "none";
    initializeExperiment();
  }
}

async function initializeExperiment() {
  const subjectName = nameInput.value.trim();
  try {
    await fetchTrials();
    // Compute total number of trials across all blocks.
    totalTrials = blocks[0].length + blocks[1].length;
    downloadStimuli(subjectName, blocks[0].concat(blocks[1]));
    nextTrial();
  } catch (err) {
    console.error(err);
    alert("Failed to start experiment:\n" + err);
  }
}

async function fetchTrials() {
  const res = await fetch("/get_trial");
  if (!res.ok) throw "Server error fetching trials";
  const data = await res.json();
  blocks = [data.block1, data.block2];
}

function downloadStimuli(subjectName, trials) {
  let csv = "trial,condition,emotion_word,word1,word2,word3,word4\r\n";
  trials.forEach((t, i) => {
    const row = [i+1, t.condition, t.emotion_word || "", ...t.words];
    const escaped = row.map(x =>
      `"${String(x).replace(/"/g,'""')}"`
    ).join(",");
    csv += escaped + "\r\n";
  });
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `${subjectName}_stimuli.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function nextTrial() {
  // If all blocks are done, end the experiment.
  if (currentBlock >= blocks.length) {
    display.style.display = "block";
    display.innerText = "Experiment complete! Thank you.";
    return;
  }
  const block = blocks[currentBlock];
  if (currentTrial >= block.length) {
    // Move to next block and reset trial index.
    currentBlock++;
    currentTrial = 0;
    nextTrial();
    return;
  }
  stimIndex = -1;
  runStim(block[currentTrial]);
}

function runStim(trial) {
  display.style.display = "block";
  inductionNote.style.display = "none";

  // 1) Emotion induction
  if (stimIndex === -1) {
    if (trial.emotion_word) {
      showFix(() => {
        display.innerText = trial.emotion_word;
        inductionNote.style.display = "block";
        setTimeout(() => {
          display.innerText = "";
          inductionNote.style.display = "none";
          stimIndex++;
          runStim(trial);
        }, 3000);
      });
      return;
    } else {
      stimIndex++;
    }
  }

  // 2) Display the four Hindi words one by one
  if (stimIndex < trial.words.length) {
    showFix(() => {
      display.innerText = trial.words[stimIndex];
      setTimeout(() => {
        display.innerText = "";
        stimIndex++;
        runStim(trial);
      }, 500);
    });
  } else {
    display.style.display = "none";
    startMath();
  }
}

function showFix(callback) {
  display.innerText = "+";
  setTimeout(() => {
    display.innerText = "";
    setTimeout(callback, 0);
  }, 500);
}

function startMath() {
  mathTask.style.display = "block";
  mathIn.value = "";
  mathFeedback.innerText = "";
  nextMathQ();
  // Display math task for a fixed duration (200 ms)
  setTimeout(() => {
    mathTask.style.display = "none";
    startRecall();
  }, 20000);
}

function nextMathQ() {
  currentA = Math.ceil(Math.random() * 10);
  currentB = Math.ceil(Math.random() * 10);
  mathQ.innerText = `${currentA} + ${currentB} = ?`;
}

submitM.onclick = () => {
  const ans = parseInt(mathIn.value, 10);
  mathFeedback.innerText = (ans === currentA + currentB) ? "Correct!" : "Incorrect!";
  mathIn.value = "";
  setTimeout(() => {
    mathFeedback.innerText = "";
    nextMathQ();
  }, 800);
};

function startRecall() {
  recall.style.display = "block";
  let t = 20;
  recallT.innerText = t;
  const iv = setInterval(() => {
    t--;
    recallT.innerText = t;
    if (t <= 0) {
      clearInterval(iv);
      recall.style.display = "none";
      // Increase global trial counter when a trial is complete.
      totalTrialCount++;
      // Check for break after every 20 trials (but not after the last trial)
      if (totalTrialCount % 20 === 0 && totalTrialCount < totalTrials) {
        showBreak();
      } else {
        currentTrial++;
        nextTrial();
      }
    }
  }, 1000);
}

function showBreak() {
  breakScreen.style.display = "block";
  // Wait for the subject to press Spacebar to resume
  document.addEventListener("keydown", resumeOnSpacebar);
}

function resumeOnSpacebar(e) {
  if (e.code === "Space") {
    breakScreen.style.display = "none";
    document.removeEventListener("keydown", resumeOnSpacebar);
    // Proceed to next trial after the break.
    currentTrial++;
    nextTrial();
  }
}
