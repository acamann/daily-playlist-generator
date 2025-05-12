export function setupLogging() {
  const logMessages: string[] = [];
  const originalConsoleLog = console.log;

  console.log = function(message) {
    logMessages.push(`${new Date().toISOString()}: ${message}`);
    originalConsoleLog(message);
  };

  return () => logMessages;
}