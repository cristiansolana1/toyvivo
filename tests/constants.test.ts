import test from "node:test";
import assert from "node:assert/strict";
import {
  isHeartbeatOverdue,
  formatHeartbeatCountdown,
  HEARTBEAT_LIMIT_MS,
} from "../src/constants.ts";

test("isHeartbeatOverdue checks 24 hour threshold correctly", () => {
  const now = Date.now();
  assert.equal(isHeartbeatOverdue(null, now), true);

  const freshTimestamp = new Date(now - 1000 * 60 * 60).toISOString(); // 1 hour ago
  assert.equal(isHeartbeatOverdue(freshTimestamp, now), false);

  const overdueTimestamp = new Date(now - (HEARTBEAT_LIMIT_MS + 1000)).toISOString(); // 24h + 1s ago
  assert.equal(isHeartbeatOverdue(overdueTimestamp, now), true);
});

test("formatHeartbeatCountdown formats remaining time properly", () => {
  const now = Date.now();
  assert.equal(formatHeartbeatCountdown(null, now), "Estoy bien");

  const lastHeartbeat = new Date(now - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago
  // 24h - 2h = 22h remaining
  const formatted = formatHeartbeatCountdown(lastHeartbeat, now);
  assert.match(formatted, /Disponible en 22h 00m/);
});
