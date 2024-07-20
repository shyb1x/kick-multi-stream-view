document.addEventListener("DOMContentLoaded", function() {
    const usernameInput = document.getElementById("username");
    const addStreamButton = document.getElementById("add-stream");
    const viewsContainer = document.getElementById("views-container");
    const currentStreams = document.getElementById("current-streams");
    const toggleUIButton = document.getElementById("toggle-ui");
    const uiDescription = document.getElementById("ui-description");
    let dragEnabled = false;

    addStreamButton.addEventListener("click", addStream);
    usernameInput.addEventListener("keypress", function(event) {
        if (event.key === "Enter") {
            addStream();
        }
    });

    toggleUIButton.addEventListener("click", toggleUI);

    function addStream() {
        const username = usernameInput.value.trim();
        if (username) {
            const view = document.createElement("div");
            view.classList.add("view", "no-color");
            view.id = `view-${username}`;

            const iframe = document.createElement("iframe");
            iframe.src = `https://player.kick.com/${username}`;
            iframe.frameBorder = "0";
            iframe.allow = "autoplay";
            iframe.scrolling = "no"; /* Prevent iframe scrolling */
            iframe.id = `iframe-${username}`;
            iframe.allowFullscreen = true;
            iframe.webkitallowfullscreen = true;
            iframe.mozallowfullscreen = true;
            iframe.msallowfullscreen = true;
            iframe.onload = function() {
                setTimeout(() => {
                    sendCommandToIframe(iframe, "unMute");
                    sendCommandToIframe(iframe, "playVideo");
                }, 1000); // Delay to ensure the iframe is fully loaded
            };
            view.appendChild(iframe);

            viewsContainer.appendChild(view);
            updateCurrentStreams(username);
            usernameInput.value = "";
            resizeViews();
            makeDraggable();
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
        });

        streamItem.appendChild(nameSpan);
        streamItem.appendChild(colorSelect);
        streamItem.appendChild(removeButton);
        currentStreams.appendChild(streamItem);
    }

    function resizeViews() {
        const views = document.querySelectorAll(".view");
        const viewCount = views.length;
        const width = 100 / 8; // Slightly larger
        const height = 75 / 5; // Slightly taller
        views.forEach(view => {
            view.style.width = `${width}%`;
            view.style.height = `calc(${height}vh - 10px)`;
        });
    }

    function makeDraggable() {
        $(function() {
            $("#views-container").sortable({
                update: function(event, ui) {
                    // Prevent iframe reload on drag end
                    ui.item[0].querySelector('iframe').src += '';
                }
            }).sortable("option", "axis", "");
            $("#views-container").disableSelection();
        });
    }

    function toggleUI() {
        dragEnabled = !dragEnabled;
        if (dragEnabled) {
            document.body.classList.add("drag-enabled");
            toggleUIButton.textContent = "Disable Drag/Drop";
            uiDescription.textContent = "Disable to toggle mute/pause on stream";
        } else {
            document.body.classList.remove("drag-enabled");
            toggleUIButton.textContent = "Enable Drag/Drop";
            uiDescription.textContent = "Enable to organize";
        }
    }

    function sendCommandToIframe(iframe, command) {
        const message = { event: "command", func: command, args: [] };
        iframe.contentWindow.postMessage(JSON.stringify(message), "*");
    }

    makeDraggable(); // Initialize draggable functionality

    // Start with drag and drop disabled
    document.body.classList.remove("drag-enabled");
    toggleUIButton.textContent = "Enable Drag/Drop";
    uiDescription.textContent = "Enable to organize";
});
