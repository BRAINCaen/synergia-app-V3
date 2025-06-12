export function delayUntilElementExists(selector, timeout = 3000) {
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      if (document.querySelector(selector)) {
        clearInterval(interval);
        resolve();
      }
    }, 100);
    setTimeout(() => {
      clearInterval(interval);
      reject(new Error("Timeout: element not found"));
    }, timeout);
  });
}
