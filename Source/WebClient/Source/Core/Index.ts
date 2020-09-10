import MainFrame from "./MainFrame";

let mainFrame: MainFrame;

async function setup() {
    const canvasLayerMain = document.getElementById("canvas-layer-main"); // main rendering canvas
    const canvasLayerDebug = document.getElementById("canvas-layer-debug"); // canvas for debugging

    if (canvasLayerMain instanceof HTMLCanvasElement &&
        canvasLayerDebug instanceof HTMLCanvasElement) {
        const glContext = canvasLayerMain.getContext("webgl");
        if (!glContext) {
            console.error("Failed to initialize WebGL context.");
            return;
        }

        // TODO: remove debug canvas
        const debugCanvas = canvasLayerDebug.getContext("2d");
        if (!debugCanvas) {
            console.error("Failed to initialize 2D context.");
            return;
        }

        // setup gl context
        glContext.enable(glContext.BLEND);
        glContext.blendFunc(glContext.SRC_ALPHA, glContext.ONE_MINUS_SRC_ALPHA);

        console.log("Initialized canvas contexts.");

        mainFrame = new MainFrame(glContext, debugCanvas, () => {
            setupFullscreenElements();
            setupDebugInfoElements();

            setElementVisibility(document.getElementById("app-container"), true);
            mainFrame.run();
        });
    }
    else {
        console.error("Could not find required canvas layers.");
    }
}

function setupFullscreenElements() {
    const fullscreenButton = document.getElementById("fullscreen-button");
    const fullscreenIcon = fullscreenButton.firstElementChild as HTMLImageElement;

    if (!document.fullscreenEnabled) {
        setElementVisibility(fullscreenButton, false);
        return;
    }

    document.addEventListener("fullscreenerror", (ev) => {
        console.warn("Failed to enter fullscreen:\n", ev);
    });

    document.addEventListener("fullscreenchange", () => {
        fullscreenIcon.src = "Icons/" + (document.fullscreenElement
            ? "exit-fullscreen.png" : "enter-fullscreen.png");
    });

    if (document.fullscreenEnabled) {
        fullscreenButton.addEventListener("click", () => {
            if (document.fullscreenElement)
                document.exitFullscreen();
            else
                document.documentElement.requestFullscreen({ navigationUI: "hide" });
        });
    }
    else {
        setElementVisibility(fullscreenButton, false);
    }
}

function setupDebugInfoElements() {
    const fpsCounterDiv = document.getElementById("fps-counter");
    const debugInfoDiv = document.getElementById("debug-info");

    fpsCounterDiv.onclick = (ev) => {
        const wasVisible = isElementVisible(debugInfoDiv);
        setElementVisibility(debugInfoDiv, !wasVisible, true);

        if (mainFrame !== null) {
            if (!wasVisible) // clear to prevent stacked values
                mainFrame.clearDebugInfo();
            mainFrame.updateDebugInfo();
        }
    };

    fpsCounterDiv.click();
}

export function isElementVisible(element: HTMLElement) {
    if (element.classList.contains("hidden"))
        return false;
    return true;
}

export function setElementVisibility(
    element: HTMLElement,
    visible: boolean,
    addVisibleClass = false) {

    if (visible) {
        element.classList.remove("hidden");
        if (addVisibleClass)
            element.classList.add("visible");
    }
    else {
        element.classList.add("hidden");
        if (addVisibleClass)
            element.classList.remove("visible");
    }
}

setup();