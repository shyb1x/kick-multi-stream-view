document.addEventListener("DOMContentLoaded", function() {
    const usernameInput = document.getElementById("username");
    const addStreamButton = document.getElementById("add-stream");
    const viewsContainer = document.getElementById("views-container");
    const currentStreams = document.getElementById("current-streams");
    const toggleUIButton = document.getElementById("toggle-ui");
    const toggleUICheckbox = document.getElementById("toggle-ui-checkbox");
    const sizeSlider = document.getElementById("size-slider");
    const favoritesList = document.getElementById("favorites-list");
    const autoFavoriteToggle = document.getElementById("auto-favorite");
    const backToTopButton = document.getElementById("back-to-top");
    const backToBottomButton = document.getElementById("back-to-bottom");
    let dragEnabled = false;
    let pausedStreams = new Set();
    let playingStreams = new Set();
    let favoriteStreams = JSON.parse(localStorage.getItem('favoriteStreams')) || [];
    let savedStreams = JSON.parse(localStorage.getItem('savedStreams')) || [];

    addStreamButton.addEventListener("click", addStream);
    usernameInput.addEventListener("keypress", function(event) {
        if (event.key === "Enter") {
            addStream();
        }
    });

    toggleUICheckbox.addEventListener("change", toggleUI);
    sizeSlider.addEventListener("input", adjustStreamSize);
    autoFavoriteToggle.addEventListener("change", function() {
        if (this.checked) {
            document.getElementById("auto-favorite-label").style.color = '#4CAF50';
        } else {
            document.getElementById("auto-favorite-label").style.color = '#ccc';
        }
    });

    backToTopButton.addEventListener("click", function() {
        viewsContainer.scrollTo({ top: 0, behavior: 'smooth' });
    });

    backToBottomButton.addEventListener("click", function() {
        viewsContainer.scrollTo({ top: viewsContainer.scrollHeight, behavior: 'smooth' });
    });

    function addStream() {
        const username = usernameInput.value.trim();
        if (username) {
            const view = document.createElement("div");
            view.classList.add("view", "no-color");
            view.id = `view-${username}`;

            const iframe = document.createElement("iframe");
            iframe.src = `https://cxwatcher.github.io/embed.html?user=${username}`;
            iframe.frameBorder = "0";
            iframe.allow = "autoplay";
            iframe.scrolling = "no"; 
            iframe.id = `iframe-${username}`;
            iframe.allowFullscreen = true;
            iframe.webkitallowfullscreen = true;
            iframe.mozallowfullscreen = true;
            iframe.msallowfullscreen = true;
            iframe.onload = function() {
                setTimeout(() => {
                    sendCommandToIframe(iframe, "unMute");
                    sendCommandToIframe(iframe, "playVideo");
                    playingStreams.add(username);
                }, 1000);
            };
            iframe.addEventListener('fullscreenchange', function() {
                if (document.fullscreenElement) {
                    pauseAllStreamsExcept(username);
                } else {
                    resumePausedStreams();
                }
            });
            view.appendChild(iframe);

            viewsContainer.appendChild(view);
            updateCurrentStreams(username);
            usernameInput.value = "";
            resizeViews();
            makeDraggable();
            adjustStreamSize();
            if (autoFavoriteToggle.checked) {
                addFavoriteOption(username);
            }
            saveCurrentStreams();
        }
    }

    function updateCurrentStreams(username) {
        const streamItem = document.createElement("div");
        streamItem.classList.add("stream-item");

        const nameSpan = document.createElement("span");
        nameSpan.textContent = username;

        const colorSelect = document.createElement("select");
        ["", "red", "green", "blue", "yellow", "purple", "orange"].forEach(color => {
            const option = document.createElement("option");
            option.value = color;
            option.textContent = color || "no color";
            colorSelect.appendChild(option);
        });
        colorSelect.addEventListener("change", function() {
            const view = document.getElementById(`view-${username}`);
            view.className = `view ${this.value}`;
            nameSpan.style.fontWeight = this.value ? "bold" : "normal";
        });

        const removeButton = document.createElement("button");
        removeButton.textContent = "X";
        removeButton.addEventListener("click", function() {
            viewsContainer.removeChild(document.getElementById(`view-${username}`));
            currentStreams.removeChild(streamItem);
            resizeViews();
            adjustStreamSize(); // Fix sizes after removing
            saveCurrentStreams();
        });

        const favoriteButton = document.createElement("button");
        favoriteButton.textContent = "★";
        favoriteButton.style.color = favoriteStreams.includes(username) ? "yellow" : "grey";
        favoriteButton.addEventListener("click", function() {
            toggleFavorite(username);
            favoriteButton.style.color = favoriteStreams.includes(username) ? "yellow" : "grey";
        });

        streamItem.appendChild(nameSpan);
        streamItem.appendChild(colorSelect);
        streamItem.appendChild(removeButton);
        streamItem.appendChild(favoriteButton);
        currentStreams.appendChild(streamItem);
    }

    function resizeViews() {
        const views = document.querySelectorAll(".view");
        views.forEach(view => {
            view.style.height = `calc(20% - 10px)`; // Slightly taller
        });
    }

    function makeDraggable() {
        $(function() {
            $("#views-container").sortable({
                update: function(event, ui) {
                    ui.item[0].querySelector('iframe').src += '';
                }
            }).sortable("option", "axis", "");
            $("#views-container").disableSelection();
        });
    }

    function toggleUI() {
        dragEnabled = toggleUICheckbox.checked;
        if (dragEnabled) {
            document.body.classList.add("drag-enabled");
            toggleUIButton.textContent = "Disable Drag/Drop";
        } else {
            document.body.classList.remove("drag-enabled");
            toggleUIButton.textContent = "Enable Drag/Drop";
        }
    }

    function sendCommandToIframe(iframe, command, args = []) {
        const message = { event: "command", func: command, args };
        iframe.contentWindow.postMessage(JSON.stringify(message), "*");
    }

    function adjustStreamSize() {
        const sizeValue = sizeSlider.value;
        const views = document.querySelectorAll(".view");
        const minWidth = 100 / 8;
        const maxWidth = 100;
        const minHeight = 20;
        const maxHeight = 100;

        const newWidth = minWidth + ((maxWidth - minWidth) * sizeValue / 100);
        const newHeight = minHeight + ((maxHeight - minHeight) * sizeValue / 100);

        views.forEach(view => {
            view.style.width = `${newWidth}%`;
            view.style.height = `calc(${newHeight}vh - 10px)`;
        });
    }

    function pauseAllStreamsExcept(activeUsername) {
        const iframes = document.querySelectorAll("iframe");
        iframes.forEach(iframe => {
            const username = iframe.id.split('-')[1];
            if (username !== activeUsername && !pausedStreams.has(username)) {
                sendCommandToIframe(iframe, "pauseVideo");
                playingStreams.delete(username);
                pausedStreams.add(username);
            }
        });
    }

    function resumePausedStreams() {
        pausedStreams.forEach(username => {
            const iframe = document.getElementById(`iframe-${username}`);
            sendCommandToIframe(iframe, "playVideo");
            playingStreams.add(username);
        });
        pausedStreams.clear();
    }

    function addFavoriteOption(username) {
        if (!favoriteStreams.includes(username)) {
            favoriteStreams.push(username);
            localStorage.setItem('favoriteStreams', JSON.stringify(favoriteStreams));
            renderFavorites();
        }
    }

    function toggleFavorite(username) {
        if (favoriteStreams.includes(username)) {
            favoriteStreams = favoriteStreams.filter(fav => fav !== username);
        } else {
            favoriteStreams.push(username);
        }
        localStorage.setItem('favoriteStreams', JSON.stringify(favoriteStreams));
        renderFavorites();
    }

    function renderFavorites() {
        favoritesList.innerHTML = '';
        favoriteStreams.forEach(username => {
            const favoriteItem = document.createElement("div");
            favoriteItem.classList.add("favorite-item");

            const nameSpan = document.createElement("span");
            nameSpan.textContent = username;

            const addButton = document.createElement("button");
            addButton.textContent = "Add";
            addButton.addEventListener("click", function() {
                usernameInput.value = username;
                addStream();
            });

            favoriteItem.appendChild(nameSpan);
            favoriteItem.appendChild(addButton);
            favoritesList.appendChild(favoriteItem);
        });
    }

    function saveCurrentStreams() {
        const currentStreams = [];
        const views = document.querySelectorAll(".view");
        views.forEach(view => {
            const username = view.id.split('-')[1];
            currentStreams.push(username);
        });
        localStorage.setItem('savedStreams', JSON.stringify(currentStreams));
    }

    function loadSavedStreams() {
        savedStreams.forEach(username => {
            usernameInput.value = username;
            addStream();
        });
    }

    // Mouse hiding functionality
    let mouseTimer;
    let isMouseHidden = false;
    let lastMousePosition = { x: 0, y: 0 };

    function hideMouse() {
        document.body.style.cursor = 'none';
        isMouseHidden = true;
    }

    function showMouse() {
        document.body.style.cursor = 'default';
        isMouseHidden = false;
    }

    document.addEventListener('mousemove', (event) => {
        clearTimeout(mouseTimer);
        const currentMousePosition = { x: event.clientX, y: event.clientY };
        const distance = Math.hypot(currentMousePosition.x - lastMousePosition.x, currentMousePosition.y - lastMousePosition.y);

        if (isMouseHidden || distance > 10) {
            showMouse();
        }

        lastMousePosition = currentMousePosition;
        mouseTimer = setTimeout(() => {
            if (!document.querySelector('.view iframe:hover')) {
                hideMouse();
            }
        }, 1000);
    });

    makeDraggable();
    document.body.classList.remove("drag-enabled");
    toggleUICheckbox.checked = false;
    toggleUIButton.textContent = "Enable Drag/Drop";
    renderFavorites();
    loadSavedStreams();
});
