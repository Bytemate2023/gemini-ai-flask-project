document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('prompt-form');
    const voiceButton = document.getElementById('voice-button');
    const responseDiv = document.getElementById('response');
    const historyDiv = document.getElementById('history');

    let isSpeaking = false;
    let isPaused = false;
    let speechInstance;

    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const response = await fetch('/generate', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            displayResponse(data);
            loadHistory();
        };
    }

    if (voiceButton) {
        voiceButton.onclick = () => {
            const recognition = new webkitSpeechRecognition();
            recognition.lang = 'en-US';
            recognition.start();
            recognition.onresult = (event) => {
                document.getElementById('prompt').value = event.results[0][0].transcript;
            };
        };
    }

    function displayResponse(text) {
        const lines = text.split('\n');
        let formattedText = '<ul>';
        lines.forEach(line => {
            if (line.startsWith('*')) {
                formattedText += `<li>${line.substring(1).trim()}</li>`;
            } else {
                formattedText += `</ul><p>${line}</p><ul>`;
            }
        });
        formattedText += '</ul>';
        responseDiv.innerHTML = `
            <div class="response-text">${formattedText}</div>
            <button id="read-aloud-button">🔊 Read</button>
        `;
        const readAloudButton = document.getElementById('read-aloud-button');
        readAloudButton.onclick = () => {
            toggleReadAloud(text);
        };
    }

    function toggleReadAloud(text) {
        if (isSpeaking && !isPaused) {
            window.speechSynthesis.pause();
            isPaused = true;
            updateButtonText('🔊 Resume');
        } else if (isPaused) {
            window.speechSynthesis.resume();
            isPaused = false;
            updateButtonText('⏸️ Pause');
        } else {
            if (speechInstance) {
                window.speechSynthesis.cancel();
            }
            speechInstance = new SpeechSynthesisUtterance(text.replace(/\n/g, ' '));
            speechInstance.lang = 'en-US';
            speechInstance.onend = () => {
                isSpeaking = false;
                isPaused = false;
                updateButtonText('🔊 Read Aloud');
            };
            window.speechSynthesis.speak(speechInstance);
            isSpeaking = true;
            updateButtonText('⏸️ Pause');
        }
    }

    function updateButtonText(text) {
        const readAloudButton = document.getElementById('read-aloud-button');
        if (readAloudButton) {
            readAloudButton.textContent = text;
        }
    }

    async function loadHistory() {
        const response = await fetch('/history');
        const data = await response.json();
        historyDiv.innerHTML = data.map(item => `
            <div class="history-item">
                <strong>Prompt:</strong> ${item[0]}<br>
                <strong>Response:</strong> ${item[1]}
            </div>
        `).join('');
    }

    loadHistory();
});
