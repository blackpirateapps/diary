import {useEffect} from "react";

export default function AndroidBackspaceFixPlugin() {
  useEffect(() => {
    let lastEventTime = 0;

    const handleBeforeInput = (e) => {
      if (e.inputType === "deleteContentBackward") {
        const now = Date.now();

        // Prevent duplicate delete events (Android sends two)
        if (now - lastEventTime < 25) {
          e.preventDefault();
          return;
        }

        lastEventTime = now;
      }
    };

    document.addEventListener("beforeinput", handleBeforeInput, true);

    return () =>
      document.removeEventListener("beforeinput", handleBeforeInput, true);
  }, []);

  return null;
}
