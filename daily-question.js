const questions = [
    "What is the main function of a capacitor in a circuit?",
    "What does RTOS stand for?",
    "Which programming language is most commonly used for embedded systems?",
    "What unit is used to measure electrical resistance?",
    "Which number system is commonly used in digital electronics?",
    "What is the name of the smallest unit of data in computing?",
    "What does SoC stand for in embedded systems?",
    "Which logic gate outputs true only when all inputs are true?",
    "What is a microcontroller?",
    "Which protocol is commonly used in IoT for message queuing?",
    "Which tool is used for version control in software development?",
    "What does the OSI model describe?",
    "What does the Nyquist theorem relate to?",
    "Which layer in a computer system directly interfaces with hardware?",
    "Which software is used to simulate circuits like LTspice?",
    "What is a flip-flop used for in digital logic?",
    "What does the acronym 'PCB' stand for?",
    "What is an interrupt in embedded systems?",
    "Which signal processing technique is used to reduce noise?",
    "Which language is commonly used in FPGA design?"
  ];
  
  const todayIndex = new Date().getDate() % questions.length;
  document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("dailyQuestion").textContent = questions[todayIndex];
  });
  