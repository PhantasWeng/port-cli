export function killProcess(pid) {
  try {
    process.kill(pid, 'SIGTERM');
    return { pid, success: true, error: null };
  } catch (err) {
    if (err.code === 'EPERM') {
      return { pid, success: false, error: `PID ${pid}: Permission denied. Try running with sudo.` };
    }
    if (err.code === 'ESRCH') {
      return { pid, success: false, error: `PID ${pid}: Process no longer running.` };
    }
    return { pid, success: false, error: `PID ${pid}: ${err.message}` };
  }
}
