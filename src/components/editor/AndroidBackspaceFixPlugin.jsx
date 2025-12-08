import { useEffect } from "react";

export default function AndroidImeBackspaceFix() {
  useEffect(() => {
    let lastDeleteTime = 0;

    const handler = (e) => {
      // FUTO keyboard fires deleteContentBackward twice:
      // 1) synthetic beforeinput
      // 2) real keydown Backspace follows immediately

      if (e.inputType === "deleteContentBackward") {
        const now = Date.now();

        // FUTO's duplicate events occur ~0–12ms apart
        if (now - lastDeleteTime < 20) {
          e.stopImmediatePropagation();
          e.preventDefault();
          return;
        }

        lastDeleteTime = now;
      }
    };

    document.addEventListener("beforeinput", handler, true);

    return () => {
      document.removeEventListener("beforeinput", handler, true);
    };
  }, []);

  return null;
}
