// Loads the YouTube IFrame API once and resolves when ready
let apiReady: boolean = (window as unknown as { YT?: unknown }).YT !== undefined;
let apiPromise: Promise<void> | null = null;

export function loadYouTubeAPI(): Promise<void> {
  if (apiReady) return Promise.resolve();
  if (apiPromise) return apiPromise;

  apiPromise = new Promise<void>((resolve) => {
    const w = window as unknown as {
      onYouTubeIframeAPIReady?: () => void;
      YT?: unknown;
    };

    const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]');
    if (existingScript) {
      const checkReady = setInterval(() => {
        if (w.YT) {
          apiReady = true;
          clearInterval(checkReady);
          resolve();
        }
      }, 100);
      return;
    }

    w.onYouTubeIframeAPIReady = () => {
      apiReady = true;
      resolve();
    };

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(script);
  });

  return apiPromise;
}
