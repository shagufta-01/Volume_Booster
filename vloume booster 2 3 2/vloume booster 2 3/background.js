let popupWindowId;
function createPopup(tab) {
    return new Promise((resolve) => {
        let width;
            (width = navigator.platform.includes("Win") ? 341 : 350),
        chrome.windows.create(
            
            {
                type: "popup",
                url: "/popup.html",
                focused: !0,
                height: 470,
                width: width,
            },
            (tab) => {
                popupWindowId =  resolve(tab.id);
            }
        );
    });
}


// Opens the popup only once:

function initPopup() {
    chrome.action.onClicked.addListener(async (tab) => {
        if (!tab.id) return;
        const t_Id = await getPopupId(tab.id);
        if (t_Id) {
            if (await getWindow(t_Id)) return chrome.windows.update(t_Id, { focused: !0 });
        }
        const result = await createPopup(tab.id);
        await savePopupId(tab.id, result);
    });
}
function getWindow(i) {
    return new Promise((resolve) => {
        chrome.windows.get(i, function ignore_error() { if(!chrome.runtime.lastError) return resolve(1); return resolve(0);  });
    });
}
function getPopupId(a) {
    return new Promise((resolve) => {
        const key = `popup_${a}`;
        chrome.storage.local.get([key], (a) => {
            resolve(a[key]);
        });
    });
}

function savePopupId(i, t) {
    return new Promise((e) => {
        const n = `popup_${i}`;
        chrome.storage.local.set({ [n]: t }, e);
    });
}
initPopup();
