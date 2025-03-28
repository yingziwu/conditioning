// Global object to store application state
var sissy = {
  tickSound: new Howl({ src: ["assets/tick.mp3"] }),
  voices: [], // Store available voices
  urls: [], // Store uploaded image URLs
  isSpeaking: false, // Track if TTS is speaking
  metronome: null, // Interval for metronome
  ttsInterval: null, // Interval for mantra TTS
  gallery: null, // Blueimp gallery instance
};

// Populate the voice dropdown
function populateVoiceList() {
  const voiceSelect = document.getElementById("voice-select");
  sissy.voices = speechSynthesis.getVoices();

  // Clear existing options
  voiceSelect.innerHTML = "";

  // Populate the dropdown with available voices
  sissy.voices.forEach((voice, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = `${voice.name} (${voice.lang})${voice.default ? " [default]" : ""}`;
    voiceSelect.appendChild(option);

    // Automatically select Google UK English Female if available
    if (voice.name === "Google UK English Female" && voice.lang === "en-GB") {
      voiceSelect.selectedIndex = index;
    }
  });

  // Default to the first voice if none is selected
  if (voiceSelect.selectedIndex === -1) {
    voiceSelect.selectedIndex = 0;
  }
}

// Ensure voices are loaded (some browsers load them asynchronously)
if (speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = populateVoiceList;
} else {
  populateVoiceList();
}

// Handle folder upload and display file count
function handleFolderUpload(event) {
  const files = event.target.files;
  sissy.urls = Array.from(files).map(file => URL.createObjectURL(file));

  const fileCountElement = document.getElementById("file-count");
  if (fileCountElement) {
    fileCountElement.textContent = `${sissy.urls.length} file(s) uploaded`;
  }
}

// Utility function to shuffle an array
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; // Swap elements
  }
}

// Start the slideshow and metronome
function start() {
  if (!sissy.urls || sissy.urls.length === 0) {
    alert("Please upload a folder with images first.");
    return;
  }

  const bpm = parseInt(document.getElementById("beats-input").value) || 0;
  const next = parseInt(document.getElementById("next-input").value) || 0;
  const mantra = document.getElementById("mantra-input").value.trim();

  // Shuffle the images
  shuffleArray(sissy.urls);

  if (bpm > 0) {
    let beatCount = 0;

    // Start the slideshow
    sissy.gallery = blueimp.Gallery(sissy.urls, {
      onclose: stop,
      onslideend: (index) => {
        if (index === sissy.urls.length - 1) {
          const remainingBeats = next - (beatCount % next);
          setTimeout(stop, (60 / bpm) * 1000 * remainingBeats);
        }
      },
    });

    // Start the metronome
    sissy.metronome = setInterval(() => {
      sissy.tickSound.play();
      beatCount++;

      if (next > 0 && beatCount % next === 0) {
        if (sissy.gallery.getIndex() < sissy.urls.length - 1) {
          sissy.gallery.next();
        }
      }
    }, (60 / bpm) * 1000);

    // Start the mantra TTS
    if (mantra) {
      const interval = (60 / bpm) * 1000;
      sissy.ttsInterval = setInterval(() => {
        speakMantra(mantra);
      }, interval);
    }
  } else {
    alert("Please enter a valid BPM (beats per minute).");
  }
}

// Stop the slideshow and metronome
function stop() {
  if (sissy.isSpeaking) {
    const checkSpeakingInterval = setInterval(() => {
      if (!sissy.isSpeaking) {
        clearInterval(checkSpeakingInterval);
        finalizeStop();
      }
    }, 100);
  } else {
    finalizeStop();
  }
}

// Finalize the stop process
function finalizeStop() {
  clearInterval(sissy.metronome);
  clearInterval(sissy.ttsInterval);
  sissy.metronome = null;
  sissy.ttsInterval = null;

  const mantraDisplay = document.getElementById("mantra-display");
  mantraDisplay.style.display = "none";
  mantraDisplay.textContent = "";
  mantraDisplay.style.animation = "none";

  setTimeout(() => {
    speechSynthesis.cancel();
  }, 100);
}

// Speak the mantra using TTS
function speakMantra(mantra) {
  const mantraDisplay = document.getElementById("mantra-display");
  mantraDisplay.style.display = "block";
  mantraDisplay.textContent = mantra;

  const utterance = new SpeechSynthesisUtterance(mantra);
  utterance.volume = 0.8;
  utterance.rate = 1;
  utterance.pitch = 1;

  const voiceSelect = document.getElementById("voice-select");
  const selectedVoiceIndex = parseInt(voiceSelect.value, 10);
  if (!isNaN(selectedVoiceIndex) && sissy.voices[selectedVoiceIndex]) {
    utterance.voice = sissy.voices[selectedVoiceIndex];
  }

  speechSynthesis.speak(utterance);

  sissy.isSpeaking = true;
  utterance.onend = () => {
    sissy.isSpeaking = false;
  };
}

// Apply settings from the URL
function applySettingsFromURL() {
  const params = new URLSearchParams(window.location.search);

  const bpm = params.get("bpm");
  if (bpm !== null) {
    document.getElementById("beats-input").value = bpm;
  }

  const next = params.get("next");
  if (next !== null) {
    document.getElementById("next-input").value = next;
  }
}

// Apply settings from a provided link
function applySettingsFromLink(link) {
  try {
    const url = new URL(link);
    const params = new URLSearchParams(url.search);

    const bpm = params.get("bpm");
    if (bpm !== null) {
      document.getElementById("beats-input").value = bpm;
    }

    const next = params.get("next");
    if (next !== null) {
      document.getElementById("next-input").value = next;
    }

    alert("Settings successfully imported!");
  } catch (error) {
    alert("Invalid link. Please check the format and try again.");
  }
}

// Event listeners
window.addEventListener("DOMContentLoaded", applySettingsFromURL);
document.getElementById("folder-input").addEventListener("change", handleFolderUpload);
document.getElementById("start-button").addEventListener("click", start);
document.getElementById("apply-link-button").addEventListener("click", () => {
  const link = document.getElementById("import-link-input").value.trim();
  if (link) {
    applySettingsFromLink(link);
  } else {
    alert("Please enter a valid link.");
  }
});