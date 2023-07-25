let gainNode, playingTabId, display;

function debounce(func, delay = 300) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
}

document.addEventListener("DOMContentLoaded", function () {
  const slider = document.getElementById("boostAmount");
  const range = document.getElementById("text");
  const toggleSwitch = document.getElementById("onoff");
  const Image = document.getElementById("image");
  const Level = document.getElementById("gray");
  let tabsTitle = document.querySelector(".tabs__title");
  let tabsList = document.querySelector(".tabs__list");
  let state = localStorage.getItem("state");

  chrome.tabs.onUpdated.addListener(
    debounce(() => {
      display();
    }, 500)
  );
  chrome.tabs.onUpdated.addListener(handleTabUpdate);
  function handleTabUpdate(tabId, info) {
    if (info.status === "loading") {
      store.dispatch({ type: "RESET_TABHOSTS" });
      chrome.tabs.get(tabId, (activeTab) => {
        if (tabId === store.getState().currentTab["id"]) {
          store.dispatch({ type: "ACTIVE_TAB", payload: activeTab });
        }
      });
    }
  }

  if (toggleSwitch.checked) {
    enableFunction();
  }

  if (state === "true") {
    toggleSwitch.checked;
    enableFunction();
  } else if (state === "false") {
    toggleSwitch.checked = false;
    disableFunction();
  }

  slider.addEventListener("input", function () {
    var amount = parseFloat(slider.value);
    chrome.storage.local.set({ amount: amount }, function () {});
    range.textContent = amount + "%";
  });

  chrome.storage.local.get(["volumeBoosterEnabled", "amount"], function (data) {
    slider.value = data.amount || 1;
    range.textContent = boostAmount.value + "%";
  });

  toggleSwitch.addEventListener("change", function () {
    if (toggleSwitch.checked) {
      localStorage.setItem("state", true);
      chrome.storage.local.set({ volumeBoosterEnabled: true });
      enableFunction();
    } else {
      // Call the function when the toggle switch is unchecked
      localStorage.setItem("state", false);

      chrome.storage.local.set({ volumeBoosterEnabled: false });
      disableFunction();
    }
  });

  function enableFunction() {
    chrome.storage.local.get("amount", function (result) {
      var storedAmount = parseFloat(result.amount);
      if (!isNaN(storedAmount)) {
        handleGainChange(storedAmount);
      }
    });

    Image.classList.remove("grayscale");
    Level.classList.remove("graay");
    tabsTitle.classList.remove("graay");
    slider.style.background = "white";
    slider.disabled = false;
    slider.addEventListener("input", setSliderOutputValue);
  }

  function setSliderOutputValue() {
    if (slider.value > 500) {
      range.style.color = "red";
    } else {
      range.style.color = "white";
    }
    range.innerHTML = slider.value + "%";
    slider.onchange = (event) => {
      handleGainChange(event.target.value);
      return;
    };
  }

  function disableFunction() {
    start();
    slider.disabled = true;
    Image.classList.add("grayscale");
    Level.classList.add("graay");
    tabsTitle.classList.add("graay");
    slider.style.background = "gray";
  }

  tabsList.addEventListener("click", (e) => handleTabListClick(e));

  function handleTabListClick(e) {
    e.preventDefault();
    const t = e.target.closest(".tab"),
      a = parseInt(t.dataset.tabId, 10);
    chrome.tabs.update(a, { active: !0 }, (e) => {
      chrome.windows.update(e.windowId, { focused: !0 });
    });
  }

  async function display() {
    tabsList.innerHTML = "";
    await chrome.tabs.query({ audible: !0, windowType: "normal" }, (arr) => {
      arr.sort((e, t) => t.id - e.id);

      (tabsTitle.textContent = arr.length
        ? "Playing sound currently on tabs"
        : "No tabs playing  audio right now"),
        arr.forEach((e) => {
          const template_tab = document.querySelector("#template-tab").content;
          (template_tab.querySelector(".tab").dataset.tabId = e.id),
            (template_tab.querySelector(".tab__icon-image").src =
              e.favIconUrl || "icons/icon-logo.png"),
            (template_tab.querySelector(".tab__title").textContent =
              e.title || "playing tab"),
            tabsList.appendChild(document.importNode(template_tab, !0));
        });
    });
  }
  display();

  // TABCAPTURE
  async function initializeAudioContext() {
    const currentTab = await chrome.tabs.getCurrent();
    const currentTabId = currentTab ? currentTab.id : null;
    chrome.tabCapture.getMediaStreamId(
      { consumerTabId: currentTabId, targetTabId: playingTabId },
      (streamId) => {
        if (!chrome.runtime.lastError) {
          getMediaStream(streamId).then((stream) => {
            const audioContext = new AudioContext();
            const audioSource = audioContext.createMediaStreamSource(stream);
            gainNode = audioContext.createGain();
            audioSource.connect(gainNode);
            gainNode.connect(audioContext.destination);
          });
        }
      }
    );
  }

  function getPlayingTabId() {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true }, (tabs) => {
        if (!chrome.runtime.lastError) {
          playingTabId = tabs[0].id;
          resolve(playingTabId);
        }
      });
    });
  }

  function getMediaStream(streamId) {
    return new Promise((resolve) => {
      resolve(
        navigator.mediaDevices.getUserMedia({
          video: false,
          audio: {
            mandatory: {
              chromeMediaSource: "tab",
              chromeMediaSourceId: streamId,
            },
          },
        })
      );
    });
  }

  function handleGainChange(volume) {
    const newVolume = parseInt(volume, 10);
    if (!gainNode) return;
    gainNode.gain.value = newVolume / 300;
  }
  async function start() {
    await getPlayingTabId();
    await initializeAudioContext();
    handleGainChange(100);
  }
  start();
});
