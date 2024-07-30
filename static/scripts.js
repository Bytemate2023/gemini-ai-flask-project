document.addEventListener('DOMContentLoaded', () => {
    const chatHistory = document.getElementById('chatHistory');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const voiceInputBtn = document.getElementById('voiceInputBtn');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');

    let currentUtterance = null; // Keep track of the current speech synthesis utterance

    sendBtn.addEventListener('click', () => {
        const message = userInput.value;
        if (message.trim()) {
            addMessageToChat('user', message);
            getReply(message);
            userInput.value = '';
        }
    });

    voiceInputBtn.addEventListener('click', () => {
        const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.onresult = (event) => {
            const message = event.results[0][0].transcript;
            addMessageToChat('user', message);
            getReply(message);
        };
        recognition.start();
    });

    clearHistoryBtn.addEventListener('click', () => {
        chatHistory.innerHTML = '';
    });

    function addMessageToChat(sender, message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add(sender === 'user' ? 'user-message' : 'bot-message');
        messageElement.innerHTML = formatResponse(message);
        chatHistory.appendChild(messageElement);
        chatHistory.scrollTop = chatHistory.scrollHeight;

        // Add the read aloud button only for bot messages
        if (sender === 'bot') {
            addReadAloudButton(messageElement, message);
        }
    }

    function getReply(message) {
        fetch('/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt: message })
        })
        .then(response => response.json())
        .then(data => {
            const reply = data.response_text;
            addMessageToChat('bot', reply);
        })
        .catch(error => {
            console.error('Error:', error);
        });
    }

    function addReadAloudButton(messageElement, messageText) {
        const readAloudBtn = document.createElement('button');
        readAloudBtn.textContent = 'Read Aloud';
        readAloudBtn.classList.add('read-aloud-btn');

        let utterance = null; // Individual utterance for this specific message
        let isPlaying = false;

        readAloudBtn.addEventListener('click', () => {
            if (!isPlaying) {
                if (currentUtterance) {
                    speechSynthesis.cancel(); // Stop any ongoing speech
                }
                utterance = new SpeechSynthesisUtterance(messageText);
                currentUtterance = utterance; // Set the current utterance to this one

                utterance.onend = () => {
                    readAloudBtn.textContent = 'Read Aloud';
                    isPlaying = false;
                };

                speechSynthesis.speak(utterance);
                readAloudBtn.textContent = 'Pause';
                isPlaying = true;
            } else {
                if (speechSynthesis.speaking) {
                    if (speechSynthesis.paused) {
                        speechSynthesis.resume();
                        readAloudBtn.textContent = 'Pause';
                    } else {
                        speechSynthesis.pause();
                        readAloudBtn.textContent = 'Resume';
                    }
                }
            }
        });

        // Append the button to the message element
        messageElement.appendChild(readAloudBtn);
    }

    function formatResponse(responseText) {
        const lines = responseText.split('\n');
        let formattedResponse = '';
        let inUnorderedList = false;
        let inOrderedList = false;

        lines.forEach(line => {
            // Remove surrounding ** for bold text and replace with <strong> tags
            line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

            // Check if the line is a bullet point
            if (line.startsWith('-')) {
                if (!inUnorderedList) {
                    formattedResponse += '<ul>'; // Start an unordered list if not already started
                    inUnorderedList = true;
                }
                formattedResponse += `<li>${line.slice(1).trim()}</li>`;
            }
            // Check if the line is a numbered point
            else if (/^\d+\./.test(line)) {
                if (!inOrderedList) {
                    formattedResponse += '<ol>'; // Start an ordered list if not already started
                    inOrderedList = true;
                }
                formattedResponse += `<li>${line.slice(line.indexOf('.') + 1).trim()}</li>`;
            }
            else {
                // Close any open lists when a non-list item is encountered
                if (inUnorderedList) {
                    formattedResponse += '</ul>';
                    inUnorderedList = false;
                }
                if (inOrderedList) {
                    formattedResponse += '</ol>';
                    inOrderedList = false;
                }
                formattedResponse += `<p>${line}</p>`; // Regular paragraph
            }
        });

        // Close any remaining open lists
        if (inUnorderedList) {
            formattedResponse += '</ul>';
        }
        if (inOrderedList) {
            formattedResponse += '</ol>';
        }

        return formattedResponse;
    }
});
