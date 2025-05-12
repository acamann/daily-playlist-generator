const logMessages: string[] = [];

function setupLogging() {
  const originalConsoleLog = console.log;

  console.log = function(message) {
    logMessages.push(`${new Date().toISOString()}: ${message}`);
    originalConsoleLog(message);
  };
}

setupLogging();

export const getLogs = () => logMessages;
