const questions = [
  {
    question: "What is the main function of a capacitor in a circuit?",
    choices: ["Store charge", "Resist current", "Generate voltage", "Act as a fuse"],
    answer: 0
  },
  {
    question: "What does RTOS stand for?",
    choices: ["Real-Time Operating System", "Rapid Transfer Over System", "Random Task Operating Service", "Reconfigurable Time Output Scheduler"],
    answer: 0
  },
  {
    question: "Which programming language is most commonly used for embedded systems?",
    choices: ["Python", "C", "JavaScript", "Ruby"],
    answer: 1
  },
  {
    question: "What unit is used to measure electrical resistance?",
    choices: ["Ohm", "Watt", "Volt", "Ampere"],
    answer: 0
  },
  {
    question: "Which number system is commonly used in digital electronics?",
    choices: ["Decimal", "Hexadecimal", "Binary", "Octal"],
    answer: 2
  },
  {
    question: "What is the name of the smallest unit of data in computing?",
    choices: ["Bit", "Byte", "Nibble", "Word"],
    answer: 0
  },
  {
    question: "What does SoC stand for in embedded systems?",
    choices: ["System on Chip", "Software on Circuit", "Signal over Channel", "System of Computation"],
    answer: 0
  },
  {
    question: "Which logic gate outputs true only when all inputs are true?",
    choices: ["AND", "OR", "NAND", "XOR"],
    answer: 0
  },
  {
    question: "What is a microcontroller?",
    choices: ["A small car engine", "An integrated circuit with processor, memory, and I/O", "A power supply unit", "A robot controller board"],
    answer: 1
  },
  {
    question: "Which protocol is commonly used in IoT for message queuing?",
    choices: ["HTTP", "FTP", "MQTT", "SSH"],
    answer: 2
  }
];

const todayIndex = new Date().getDate() % questions.length;

document.addEventListener("DOMContentLoaded", function () {
  const questionEl = document.getElementById("daily-question");
  const answersEl = document.getElementById("answer-choices");

  const todayQuestion = questions[todayIndex];

  if (questionEl && answersEl) {
    questionEl.textContent = todayQuestion.question;

    todayQuestion.choices.forEach((choice, index) => {
      const button = document.createElement("button");
      button.textContent = choice;
      button.className = "answer-button";

      button.addEventListener("click", () => {
        const allButtons = document.querySelectorAll(".answer-button");
      
        // Disable all buttons immediately
        allButtons.forEach(btn => btn.disabled = true);
      
        if (index === todayQuestion.answer) {
          button.classList.add("correct");
        } else {
          button.classList.add("incorrect");
      
          // Reset after 3 seconds if wrong
          setTimeout(() => {
            allButtons.forEach(btn => {
              btn.classList.remove("incorrect");
              btn.disabled = false;
            });
          }, 3000);
        }
      });      

      answersEl.appendChild(button);
    });
  }
});
