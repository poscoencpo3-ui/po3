/*
 * 탁구 경기 규칙 (ITTF 기준) — 순수 함수 모음.
 *
 * - 한 게임 11점, 10:10(듀스) 이후에는 2점 차가 나야 승리
 * - 서브는 2점마다 교대, 듀스 이후에는 1점마다 교대
 * - 복식 서브 순서: (서버 S, 리시버 R) → (R, S의 파트너) → ...
 * - 복식 타구 순서: S → R → S의 파트너 → R의 파트너 → S ...
 * - 다음 게임은 직전 게임 첫 리시버가 서브, 직전 게임 첫 서버가 리시브
 * - 매치는 3게임 중 2선승 / 5게임 중 3선승 / 7게임 중 4선승
 */

function teamOf(slot) {
  return slot[0];
}

function otherTeam(team) {
  return team === 'A' ? 'B' : 'A';
}

function partnerOf(slot, doubles) {
  if (!doubles) return slot;
  return slot[0] + (slot[1] === '1' ? '2' : '1');
}

function serverChanges(totalPoints) {
  if (totalPoints < 20) return Math.floor(totalPoints / 2);
  return 10 + (totalPoints - 20);
}

// 게임 첫 서버/리시버와 현재까지 득점 합계로 현재 서버/리시버 계산
function currentServer(firstServer, firstReceiver, totalPoints, doubles) {
  let s = firstServer;
  let r = firstReceiver;
  const n = serverChanges(totalPoints);
  for (let i = 0; i < n; i++) {
    const ns = r;
    const nr = partnerOf(s, doubles);
    s = ns;
    r = nr;
  }
  return { server: s, receiver: r };
}

// 랠리 타구 순서 (서버부터)
function hittingOrder(server, receiver, doubles) {
  if (!doubles) return [server, receiver];
  return [server, receiver, partnerOf(server, doubles), partnerOf(receiver, doubles)];
}

function gameWinner(a, b) {
  if ((a >= 11 || b >= 11) && Math.abs(a - b) >= 2) return a > b ? 'A' : 'B';
  return null;
}

function matchWinner(gamesA, gamesB, bestOf) {
  const need = Math.floor(bestOf / 2) + 1;
  if (gamesA >= need) return 'A';
  if (gamesB >= need) return 'B';
  return null;
}

// 다음 게임 첫 서버/리시버
function nextGameServers(prevFirstServer, prevFirstReceiver) {
  return { server: prevFirstReceiver, receiver: prevFirstServer };
}

// 복식 서브는 서버의 오른쪽 하프 → 리시버의 오른쪽 하프 (대각선)
// A팀은 +y 방향을 보므로 오른쪽이 +x, B팀은 오른쪽이 -x. 센터라인 위는 오른쪽 하프로 인정.
function inRightHalf(team, x) {
  return team === 'A' ? x >= -0.003 : x <= 0.003;
}

module.exports = {
  teamOf,
  otherTeam,
  partnerOf,
  serverChanges,
  currentServer,
  hittingOrder,
  gameWinner,
  matchWinner,
  nextGameServers,
  inRightHalf,
};
