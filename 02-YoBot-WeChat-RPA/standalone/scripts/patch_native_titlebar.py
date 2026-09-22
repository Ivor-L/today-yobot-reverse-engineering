"""Enable the native macOS title bar for the recovered Electron window."""
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MAIN = ROOT / "app/dist/electron/electron/main.js"


def main() -> None:
    source = MAIN.read_text()
    old = """        frame: false, // Custom window controls
        webPreferences: {"""
    new = """        frame: true,
        titleBarStyle: 'hiddenInset',
        trafficLightPosition: { x: 14, y: 14 },
        webPreferences: {"""
    count = source.count(old)
    if count == 1:
        source = source.replace(old, new, 1)
    elif new not in source:
        raise RuntimeError(f"main native titlebar: expected one main-window token, found {count}")
    MAIN.write_text(source)
    print("Enabled native macOS traffic-light controls")


if __name__ == "__main__":
    main()
