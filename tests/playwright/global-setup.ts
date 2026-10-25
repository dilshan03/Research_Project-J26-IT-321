/** Refuses to run unless the isolated PP1 stack (web 5174, learner-profile 5101) is up. */
export default async function globalSetup() {
  for (const url of ['http://localhost:5174/', 'http://localhost:5101/docs']) {
    try {
      await fetch(url);
    } catch {
      throw new Error(
        `${url} is not reachable. Start the isolated local stack first:\n` +
          '  powershell -ExecutionPolicy Bypass -File scripts\\pp1-local\\start-pp1-local.ps1',
      );
    }
  }
}
