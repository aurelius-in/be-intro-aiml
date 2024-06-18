// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDPBH5ifyna8jYilqjneh9sRlWg6Z1kS0Y",
    authDomain: "best-6bc96.firebaseapp.com",
    projectId: "best-6bc96",
    storageBucket: "best-6bc96.appspot.com",
    messagingSenderId: "835354586616",
    appId: "1:835354586616:web:931af2d81b25c287dcba0d",
    measurementId: "G-7TQN3QPPTX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore(app);

const urlParams = new URLSearchParams(window.location.search);
const program = urlParams.get('program');
const module = urlParams.get('module');

document.addEventListener("DOMContentLoaded", async () => {
    const user = await new Promise((resolve) => {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                resolve(user);
            } else {
                const loginDiv = document.createElement('div');
                loginDiv.innerHTML = `
                    <h2>To ensure your progress is saved, please sign in again</h2>
                    <form id="login-form">
                        <input type="email" id="email" placeholder="Email" required>
                        <input type="password" id="password" placeholder="Password" required>
                        <button type="submit">Sign In</button>
                    </form>
                `;
                document.body.appendChild(loginDiv);
                document.getElementById('login-form').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const email = document.getElementById('email').value;
                    const password = document.getElementById('password').value;
                    try {
                        await signInWithEmailAndPassword(auth, email, password);
                        location.reload();
                    } catch (error) {
                        alert("Login failed: " + error.message);
                    }
                });
            }
        });
    });

    if (!user) return;

    const quizUrl = `quizzes/${program}/${module}-quiz.json`;
    try {
        const response = await fetch(quizUrl);
        const quizData = await response.json();
        loadQuiz(quizData);
    } catch (error) {
        document.getElementById("quiz-container").innerText = "Error loading quiz: " + error.message;
    }
});

function loadQuiz(quizData) {
    const quizContainer = document.getElementById("quiz-container");
    const form = document.createElement("form");
    form.id = "quiz-form";

    quizData.questions.forEach((question, index) => {
        const questionDiv = document.createElement("div");
        questionDiv.className = "question";

        const questionTitle = document.createElement("h3");
        questionTitle.innerText = question.title;
        questionDiv.appendChild(questionTitle);

        question.options.forEach((option, optionIndex) => {
            const optionLabel = document.createElement("label");
            const optionRadio = document.createElement("input");
            optionRadio.type = "radio";
            optionRadio.name = `question-${index}`;
            optionRadio.value = "abcd"[optionIndex];
            optionLabel.appendChild(optionRadio);
            optionLabel.append(option);
            questionDiv.appendChild(optionLabel);
            questionDiv.appendChild(document.createElement("br"));
        });

        const explanationDiv = document.createElement("div");
        explanationDiv.className = "explanation";
        explanationDiv.id = `explanation-${index}`;
        explanationDiv.style.display = "none";
        questionDiv.appendChild(explanationDiv);

        form.appendChild(questionDiv);
    });

    const submitButton = document.createElement("button");
    submitButton.type = "button";
    submitButton.innerText = "Submit";
    submitButton.addEventListener("click", () => gradeQuiz(quizData));
    form.appendChild(submitButton);

    quizContainer.appendChild(form);
}

async function gradeQuiz(quizData) {
    const form = document.getElementById("quiz-form");

    let correctCount = 0;
    quizData.questions.forEach((question, index) => {
        const selectedOption = form[`question-${index}`].value;
        const explanationDiv = document.getElementById(`explanation-${index}`);
        if (selectedOption === question.correct) {
            correctCount++;
            explanationDiv.style.color = "green";
            explanationDiv.innerText = `Correct! ${question.explanation}`;
        } else {
            explanationDiv.style.color = "red";
            explanationDiv.innerText = `Incorrect. ${question.explanation}`;
        }
        explanationDiv.style.display = "block";
    });

    const result = document.createElement("p");
    result.innerText = `You got ${correctCount} out of ${quizData.questions.length} correct.`;
    form.appendChild(result);

    await saveProgress(correctCount, quizData.questions.length);
}

async function saveProgress(correctCount, totalQuestions) {
    const user = auth.currentUser;
    if (!user) return;

    const progressRef = doc(db, "progress", user.uid);
    try {
        const progressSnap = await getDoc(progressRef);
        let progressData = {};
        if (progressSnap.exists()) {
            progressData = progressSnap.data();
        }
        progressData[`${program}_${module}`] = {
            correct: correctCount,
            total: totalQuestions,
            timestamp: new Date()
        };
        await setDoc(progressRef, progressData);
    } catch (error) {
        console.error("Error saving progress: ", error);
    }
}
