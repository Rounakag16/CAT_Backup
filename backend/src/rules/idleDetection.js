// Bucket 4: Unusual behavior detection — RPM high + GPS speed ~0 for longer
// than the threshold means the machine is idling instead of working.

const store = require("../store");

const RPM_IDLE_THRESHOLD = 1000; // engine running
const GPS_SPEED_IDLE_THRESHOLD = 0.5; // km/h, effectively stationary
const IDLE_DURATION_THRESHOLD_MIN = 5;

// Tracks in-progress idle windows per machine so we can measure duration
// across consecutive idling ticks rather than flagging on a single sample.
const openIdleWindows = new Map(); // machineId -> { start, taskId }

function ingestTick({ machineId, taskId, rpm, gpsSpeed, at }) {
  const timestamp = at || new Date().toISOString();
  const isIdling = rpm >= RPM_IDLE_THRESHOLD && gpsSpeed <= GPS_SPEED_IDLE_THRESHOLD;

  if (isIdling) {
    if (!openIdleWindows.has(machineId)) {
      openIdleWindows.set(machineId, { start: timestamp, taskId });
    }
    const window = openIdleWindows.get(machineId);
    const durationMin = (new Date(timestamp) - new Date(window.start)) / 60000;

    if (durationMin >= IDLE_DURATION_THRESHOLD_MIN) {
      const event = {
        machineId,
        taskId: window.taskId,
        idleStart: window.start,
        idleDurationMin: Number(durationMin.toFixed(1)),
        flagged: true,
        at: timestamp,
      };
      store.idleEvents.push(event);
      openIdleWindows.delete(machineId); // reset window after flagging
      return event;
    }
    return null;
  }

  openIdleWindows.delete(machineId); // machine moved — window resets
  return null;
}

function idleEventsForMachine(machineId) {
  return machineId
    ? store.idleEvents.filter((e) => e.machineId === machineId)
    : store.idleEvents;
}

module.exports = { ingestTick, idleEventsForMachine };
