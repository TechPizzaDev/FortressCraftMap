import MainFrame from "./MainFrame";

let mainFrame: MainFrame;

export type SpeedyModule = typeof import('../../../fcmap-speedy/pkg/fcmap_speedy');

async function setup() {
    const canvasLayer0 = document.getElementById("canvasLayer0"); // main rendering canvas
    const canvasLayer1 = document.getElementById("canvasLayer1"); // canvas for debugging

    if (canvasLayer0 instanceof HTMLCanvasElement && canvasLayer1 instanceof HTMLCanvasElement) {
        const glContext = canvasLayer0.getContext("webgl");
        if (!glContext) {
            console.error("Failed to initialize WebGL context.");
            return;
        }

        const drawingContext = canvasLayer1.getContext("2d");
        if (!drawingContext) {
            console.error("Failed to initialize 2D context.");
            return;
        }

        // setup gl context
        glContext.enable(glContext.BLEND);
        glContext.blendFunc(glContext.SRC_ALPHA, glContext.ONE_MINUS_SRC_ALPHA);

        console.log("Initialized canvas contexts.");

        const speedyModule: SpeedyModule = await import('../../../fcmap-speedy/pkg/fcmap_speedy');
        speedyModule.init();

        mainFrame = new MainFrame(glContext, speedyModule, drawingContext, () => {
            setupFullscreenElements();
            setupDebugInfoElements();

            setVisibility(document.getElementById("mainContainer"), true);
            mainFrame.run();
        });
    }
    else {
        console.error("Could not find required canvas layers.");
    }
}

function setupFullscreenElements() {
    const fullscreenButton = document.getElementById("fullscreenButton");
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
    const fpsCounterDiv = document.getElementById("fpsCounter");
    const debugInfoDiv = document.getElementById("debugInfo");

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