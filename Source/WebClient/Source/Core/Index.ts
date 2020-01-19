import MainFrame from "./MainFrame";

let mainFrame: MainFrame;

export type SpeedyModule = typeof import('../../../fcmap-speedy/pkg/fcmap_speedy');

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

        const speedyModule: SpeedyModule = await import('../../../fcmap-speedy/pkg/fcmap_speedy');
        speedyModule.init();

        mainFrame = new MainFrame(glContext, speedyModule, debugCanvas, () => {
            setupFullscreenElements();
            setupDebugInfoElements();

            setVisibility(document.getElementById("app-container"), true);
            mainFrame.run();
        });
    }
    else {
        console.error("Could not find required canvas layers.");
    }
}

function setupFullscreenElements() {
    const fullscreenButton = document.getElementById("fullscreen-button");
    const fullscreenIcon = fullscreenButton.firstElementChild;

    if (!document.fullscreenEnabled) {
        setVisibility(fullscreenButton, false);
        return;
    }

    document.addEventListener("fullscreenerror", (ev) => {
        console.warn("Failed to enter fullscreen:\n", ev);
    });

    document.addEventListener("fullscreenchange", () => {
        fullscreenIcon.className = document.fullscreenElement
            ? "icon-exitfullscreen" : "icon-fullscreen";
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
        setVisibility(fullscreenButton, false);
    }
}

function setupDebugInfoElements() {
    const fpsCounterDiv = document.getElementById("fps-counter");
    const debugInfoDiv = document.getElementById("debug-info");

    fpsCounterDiv.onclick = (ev) => {
        const wasVisible = isVisible(debugInfoDiv);
        setVisibility(debugInfoDiv, !wasVisible, true);

        if (mainFrame != null) {
            if (!wasVisible) // clear to prevent stacked values
                mainFrame.clearDebugInfo();
            mainFrame.updateDebugInfo();
        }
    };

    fpsCounterDiv.click();
}

function isVisible(element: HTMLElement) {
    if (element.classList.contains("hidden"))
        return false;
    return true;
}

function setVisibility(element: HTMLElement, visible: boolean, updateVisibleClass: boolean = false) {
    if (visible) {
        element.classList.remove("hidden");
        if (updateVisibleClass)
            element.classList.add("visible");
    }
    else {
        element.classList.add("hidden");
        if (updateVisibleClass)
            element.classList.remove("visible");
    }
}

setup();