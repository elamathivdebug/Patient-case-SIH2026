const API_BASE = "http://localhost:8000/api";

let sessionData = {
    patient_db_id: null,
    case_db_id: null,
    language: 'English',
    lang_code: 'en-US',
    currentStepIdx: 0,
    recordedResponses: {}
};

const STEPS = [
    { key: "welcome", title: "Welcome" },
    { key: "get_name", title: "Name" },
    { key: "get_age", title: "Age" },
    { key: "get_gender", title: "Gender" },
    { key: "get_phone", title: "Phone" },
    { key: "reason_for_visit", title: "Reason for Visit" },
    { key: "symptoms", title: "Symptoms" },
    { key: "severity", title: "Severity" },
    { key: "history", title: "History" },
    { key: "medications", title: "Medications" },
    { key: "allergies", title: "Allergies" }
];

let recognition = null;

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {

    const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

    recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event) => {

        let transcript = '';

        for (
            let i = event.resultIndex;
            i < event.results.length;
            ++i
        ) {
            transcript += event.results[i][0].transcript;
        }

        document.getElementById('recognized-speech-text').innerText = transcript;
    };

    recognition.onend = () => {
        setMicVisualizerState('idle');
    };
}


function switchView(view) {

    document.getElementById('patient-view')
        .classList.toggle('hidden', view !== 'patient');

    document.getElementById('doctor-view')
        .classList.toggle('hidden', view !== 'doctor');

    if (view === 'doctor') {
        fetchDoctorQueue();
    }
}


async function selectLanguage(lang, code) {

    sessionData.language = lang;
    sessionData.lang_code = code;

    try {

        const res = await fetch(`${API_BASE}/session/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                language: lang
            })
        });

        const data = await res.json();

        sessionData.patient_db_id = data.patient_db_id;
        sessionData.case_db_id = data.case_db_id;

        document.getElementById('session-lang-badge').innerText = lang;

        document.getElementById('session-patient-id').innerText =
            `ID: ${data.patient_id}`;

        document.getElementById('lang-selection-card')
            .classList.add('hidden');

        document.getElementById('voice-assistant-card')
            .classList.remove('hidden');

        executeStep(0);

    } catch (err) {

        alert(
            "Failed to connect to Python backend at http://localhost:8000. Ensure backend.py is running."
        );
    }
}


async function executeStep(stepIndex) {

    if (stepIndex >= STEPS.length) {

        document.getElementById('voice-assistant-card')
            .classList.add('hidden');

        document.getElementById('document-upload-card')
            .classList.remove('hidden');

        return;
    }

    sessionData.currentStepIdx = stepIndex;

    const currentStep = STEPS[stepIndex];

    document.getElementById('current-step-num').innerText =
        stepIndex + 1;

    document.getElementById('recognized-speech-text').innerText =
        "Listening for voice response...";

    setMicVisualizerState('speaking');

    try {

        const response = await fetch(`${API_BASE}/voice/tts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                language: sessionData.language,
                step_key: currentStep.key
            })
        });

        const audioBlob = await response.blob();

        const audioUrl = URL.createObjectURL(audioBlob);

        const audio = new Audio(audioUrl);

        audio.play();

        audio.onended = () => {
            startListening();
        };

    } catch (e) {

        startListening();
    }
}


function startListening() {

    if (!recognition) return;

    setMicVisualizerState('listening');

    recognition.lang = sessionData.lang_code;

    try {
        recognition.start();
    } catch (e) {}
}


function setMicVisualizerState(state) {

    const visualizer =
        document.getElementById('mic-visualizer');

    const icon =
        document.getElementById('mic-icon');

    const text =
        document.getElementById('mic-status-text');

    visualizer.className =
        "w-24 h-24 rounded-full mx-auto flex items-center justify-center text-white text-3xl shadow-lg transition-all duration-300 ";

    if (state === 'speaking') {

        visualizer.classList.add('bg-blue-600');

        icon.className =
            "fa-solid fa-volume-high";

        text.innerText =
            "Assistant Speaking...";

    } else if (state === 'listening') {

        visualizer.classList.add(
            'bg-emerald-500',
            'pulse-ring'
        );

        icon.className =
            "fa-solid fa-microphone";

        text.innerText =
            "Listening... Speak Now";

    } else {

        visualizer.classList.add('bg-slate-700');

        icon.className =
            "fa-solid fa-microphone-slash";

        text.innerText =
            "Paused";
    }
}


async function confirmAndNext() {

    const recognized =
        document.getElementById('recognized-speech-text').innerText;

    const currentStepKey =
        STEPS[sessionData.currentStepIdx].key;

    if (
        recognized &&
        recognized !== "Listening for voice response..."
    ) {

        sessionData.recordedResponses[currentStepKey] =
            recognized;

        await fetch(`${API_BASE}/session/step`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                patient_db_id: sessionData.patient_db_id,
                case_db_id: sessionData.case_db_id,
                step_key: currentStepKey,
                response_text: recognized
            })
        });
    }

    executeStep(
        sessionData.currentStepIdx + 1
    );
}


function reSpeakQuestion() {

    executeStep(
        sessionData.currentStepIdx
    );
}


function clearAndReListen() {

    document.getElementById(
        'recognized-speech-text'
    ).innerText = "";

    startListening();
}


function toggleTouchFallback() {

    document.getElementById(
        'touchscreen-fallback-input'
    ).classList.toggle('hidden');
}


function submitManualInput() {

    const text =
        document.getElementById('manual-text-input').value;

    if (text) {

        document.getElementById(
            'recognized-speech-text'
        ).innerText = text;

        document.getElementById(
            'manual-text-input'
        ).value = '';
    }
}


async function handleFileUpload(e) {

    const file = e.target.files[0];

    if (!file) return;

    const formData = new FormData();

    formData.append("file", file);

    const res = await fetch(
        `${API_BASE}/documents/ocr`,
        {
            method: 'POST',
            body: formData
        }
    );

    const result = await res.json();

    document.getElementById(
        'ocr-results-box'
    ).classList.remove('hidden');

    document.getElementById(
        'ocr-text-content'
    ).innerText = result.extracted_text;
}


async function finalizeCompleteCase() {

    const res = await fetch(
        `${API_BASE}/session/finalize/${sessionData.case_db_id}`,
        {
            method: 'POST'
        }
    );

    const data = await res.json();

    document.getElementById(
        'document-upload-card'
    ).classList.add('hidden');

    document.getElementById(
        'summary-view-card'
    ).classList.remove('hidden');

    document.getElementById(
        'summary-content-render'
    ).innerHTML = `
        <div>
            <strong>Patient Name:</strong>
            ${data.summary.patient_details.name}
        </div>

        <div>
            <strong>Age/Gender:</strong>
            ${data.summary.patient_details.age}
            /
            ${data.summary.patient_details.gender}
        </div>

        <div>
            <strong>Reason for Visit:</strong>
            ${data.summary.chief_complaint}
        </div>

        <div>
            <strong>Registration Status:</strong>
            Transmitted to Doctor Dashboard Queue.
        </div>
    `;
}


async function fetchDoctorQueue() {

    const res =
        await fetch(`${API_BASE}/doctor/queue`);

    const queue =
        await res.json();

    const container =
        document.getElementById(
            'queue-list-container'
        );

    container.innerHTML = '';

    queue.forEach(item => {

        const el =
            document.createElement('div');

        el.className =
            "p-3 bg-slate-50 border rounded-xl cursor-pointer hover:bg-blue-50 transition flex justify-between items-center";

        el.onclick = () =>
            loadCaseDetails(item.case_id);

        el.innerHTML = `
            <div>
                <div class="font-bold text-sm text-slate-800">
                    ${item.name}
                </div>

                <div class="text-xs text-slate-400">
                    ${item.reason_for_visit || 'General Consultation'}
                </div>
            </div>

            <span class="text-xs px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono">
                ${item.time}
            </span>
        `;

        container.appendChild(el);
    });
}


let selectedDoctorCaseId = null;


async function loadCaseDetails(caseId) {

    selectedDoctorCaseId = caseId;

    const res =
        await fetch(
            `${API_BASE}/doctor/case/${caseId}`
        );

    const data =
        await res.json();

    document.getElementById(
        'case-detail-placeholder'
    ).classList.add('hidden');

    document.getElementById(
        'case-detail-content'
    ).classList.remove('hidden');

    document.getElementById(
        'doc-patient-name'
    ).innerText =
        data.patient.name || "Anonymous";

    document.getElementById(
        'doc-patient-sub'
    ).innerText =
        `ID: ${data.patient.patient_id} | ${data.patient.age} yrs | ${data.patient.gender} | Language: ${data.patient.language}`;

    document.getElementById(
        'doc-reason-text'
    ).innerText =
        data.reason_for_visit || "None specified";

    document.getElementById(
        'doc-symptoms-text'
    ).innerText =
        JSON.stringify(data.symptoms);

    document.getElementById(
        'doc-history-text'
    ).innerText =
        JSON.stringify(data.history);

    document.getElementById(
        'doc-ai-summary-json'
    ).innerText =
        JSON.stringify(
            data.ai_summary,
            null,
            2
        );

    document.getElementById(
        'doc-case-status'
    ).innerText =
        data.status;
}


async function markCaseReviewed() {

    if (!selectedDoctorCaseId) return;

    await fetch(
        `${API_BASE}/doctor/review`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                case_id: selectedDoctorCaseId,
                status: "REVIEWED"
            })
        }
    );

    alert("Case verified!");

    fetchDoctorQueue();
}
