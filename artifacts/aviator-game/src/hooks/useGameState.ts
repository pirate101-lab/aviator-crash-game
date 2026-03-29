import { useState, useEffect, useRef, useCallback } from "react";
import {
  GamePhase,
  Bet,
  PlayerBet,
  HistoryEntry,
  generateCrashPoint,
  generateSimulatedPlayers,
  computeMultiplier,
} from "@/lib/gameEngine";

const WAITING_DURATION = 5000;
const INITIAL_BALANCE = 10000;

export function useGameState() {
  const [phase, setPhase] = useState<GamePhase>("waiting");
  const [multiplier, setMultiplier] = useState(1.0);
  const [crashPoint, setCrashPoint] = useState(2.0);
  const [countdown, setCountdown] = useState(5);
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [playerBets, setPlayerBets] = useState<PlayerBet[]>([]);
  const [myBets, setMyBets] = useState<HistoryEntry[]>([]);

  const [bet1Amount, setBet1Amount] = useState<string>("200");
  const [bet2Amount, setBet2Amount] = useState<string>("200");
  const [bet1Active, setBet1Active] = useState(false);
  const [bet2Active, setBet2Active] = useState(false);
  const [bet1AutoCashOut, setBet1AutoCashOut] = useState<string>("");
  const [bet2AutoCashOut, setBet2AutoCashOut] = useState<string>("");
  const [bet1AutoEnabled, setBet1AutoEnabled] = useState(false);
  const [bet2AutoEnabled, setBet2AutoEnabled] = useState(false);
  const [bet1CashedOut, setBet1CashedOut] = useState<{ at: number; profit: number } | null>(null);
  const [bet2CashedOut, setBet2CashedOut] = useState<{ at: number; profit: number } | null>(null);

  const phaseRef = useRef<GamePhase>("waiting");
  const startTimeRef = useRef<number>(0);
  const crashPointRef = useRef<number>(2.0);
  const animFrameRef = useRef<number>(0);
  const bet1ActiveRef = useRef(false);
  const bet2ActiveRef = useRef(false);
  const bet1AmountRef = useRef("200");
  const bet2AmountRef = useRef("200");
  const bet1AutoRef = useRef("");
  const bet2AutoRef = useRef("");
  const bet1AutoEnabledRef = useRef(false);
  const bet2AutoEnabledRef = useRef(false);
  const balanceRef = useRef(INITIAL_BALANCE);
  const bet1CashedRef = useRef(false);
  const bet2CashedRef = useRef(false);

  useEffect(() => { bet1ActiveRef.current = bet1Active; }, [bet1Active]);
  useEffect(() => { bet2ActiveRef.current = bet2Active; }, [bet2Active]);
  useEffect(() => { bet1AmountRef.current = bet1Amount; }, [bet1Amount]);
  useEffect(() => { bet2AmountRef.current = bet2Amount; }, [bet2Amount]);
  useEffect(() => { bet1AutoRef.current = bet1AutoCashOut; }, [bet1AutoCashOut]);
  useEffect(() => { bet2AutoRef.current = bet2AutoCashOut; }, [bet2AutoCashOut]);
  useEffect(() => { bet1AutoEnabledRef.current = bet1AutoEnabled; }, [bet1AutoEnabled]);
  useEffect(() => { bet2AutoEnabledRef.current = bet2AutoEnabled; }, [bet2AutoEnabled]);
  useEffect(() => { balanceRef.current = balance; }, [balance]);

  const startWaiting = useCallback((newCrashPoint: number) => {
    phaseRef.current = "waiting";
    setPhase("waiting");
    crashPointRef.current = newCrashPoint;
    setCrashPoint(newCrashPoint);
    setMultiplier(1.0);
    bet1CashedRef.current = false;
    bet2CashedRef.current = false;
    setBet1CashedOut(null);
    setBet2CashedOut(null);

    const players = generateSimulatedPlayers(Math.floor(Math.random() * 30) + 20);
    setPlayerBets(players);

    let remaining = WAITING_DURATION;
    const interval = setInterval(() => {
      remaining -= 1000;
      setCountdown(Math.max(0, Math.ceil(remaining / 1000)));
      if (remaining <= 0) {
        clearInterval(interval);
        startFlying();
      }
    }, 1000);
    setCountdown(Math.ceil(WAITING_DURATION / 1000));
  }, []);

  const startFlying = useCallback(() => {
    phaseRef.current = "flying";
    setPhase("flying");
    startTimeRef.current = performance.now();

    const flyLoop = (now: number) => {
      if (phaseRef.current !== "flying") return;
      const elapsed = now - startTimeRef.current;
      const m = computeMultiplier(elapsed);
      setMultiplier(m);

      if (m >= crashPointRef.current) {
        handleCrash(m);
        return;
      }

      if (bet1ActiveRef.current && !bet1CashedRef.current && bet1AutoEnabledRef.current) {
        const target = parseFloat(bet1AutoRef.current);
        if (!isNaN(target) && m >= target) {
          performCashOut(1, m);
        }
      }
      if (bet2ActiveRef.current && !bet2CashedRef.current && bet2AutoEnabledRef.current) {
        const target = parseFloat(bet2AutoRef.current);
        if (!isNaN(target) && m >= target) {
          performCashOut(2, m);
        }
      }

      setPlayerBets(prev => {
        const updated = prev.map(p => {
          if (p.cashedOut) return p;
          const cashChance = 0.003 * Math.sqrt(m);
          if (Math.random() < cashChance) {
            return { ...p, cashedOut: true, cashedOutAt: m };
          }
          return p;
        });
        return updated;
      });

      animFrameRef.current = requestAnimationFrame(flyLoop);
    };

    animFrameRef.current = requestAnimationFrame(flyLoop);
  }, []);

  const performCashOut = useCallback((betNum: 1 | 2, at: number) => {
    if (betNum === 1) {
      if (bet1CashedRef.current) return;
      bet1CashedRef.current = true;
      const amt = parseFloat(bet1AmountRef.current) || 0;
      const profit = parseFloat((amt * at - amt).toFixed(2));
      const newBal = parseFloat((balanceRef.current + amt * at).toFixed(2));
      balanceRef.current = newBal;
      setBalance(newBal);
      setBet1CashedOut({ at, profit });
    } else {
      if (bet2CashedRef.current) return;
      bet2CashedRef.current = true;
      const amt = parseFloat(bet2AmountRef.current) || 0;
      const profit = parseFloat((amt * at - amt).toFixed(2));
      const newBal = parseFloat((balanceRef.current + amt * at).toFixed(2));
      balanceRef.current = newBal;
      setBalance(newBal);
      setBet2CashedOut({ at, profit });
    }
  }, []);

  const handleCrash = useCallback((finalMultiplier: number) => {
    cancelAnimationFrame(animFrameRef.current);
    phaseRef.current = "crashed";
    setPhase("crashed");
    setMultiplier(finalMultiplier);

    setPlayerBets(prev => prev.map(p => ({
      ...p,
      cashedOut: p.cashedOut ? p.cashedOut : false,
    })));

    setHistory(prev => [
      { multiplier: finalMultiplier, timestamp: Date.now() },
      ...prev.slice(0, 14),
    ]);

    setTimeout(() => {
      const next = generateCrashPoint();
      startWaiting(next);
    }, 3000);
  }, [startWaiting]);

  useEffect(() => {
    const first = generateCrashPoint();
    startWaiting(first);
    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const placeBet = useCallback((betNum: 1 | 2) => {
    if (phase !== "waiting") return;
    const amtStr = betNum === 1 ? bet1Amount : bet2Amount;
    const amt = parseFloat(amtStr);
    if (isNaN(amt) || amt <= 0 || amt > balance) return;

    const newBal = parseFloat((balanceRef.current - amt).toFixed(2));
    balanceRef.current = newBal;
    setBalance(newBal);

    if (betNum === 1) {
      setBet1Active(true);
      bet1ActiveRef.current = true;
    } else {
      setBet2Active(true);
      bet2ActiveRef.current = true;
    }
  }, [phase, bet1Amount, bet2Amount, balance]);

  const cancelBet = useCallback((betNum: 1 | 2) => {
    if (phase !== "waiting") return;
    const amtStr = betNum === 1 ? bet1Amount : bet2Amount;
    const amt = parseFloat(amtStr);

    const newBal = parseFloat((balanceRef.current + (isNaN(amt) ? 0 : amt)).toFixed(2));
    balanceRef.current = newBal;
    setBalance(newBal);

    if (betNum === 1) {
      setBet1Active(false);
      bet1ActiveRef.current = false;
    } else {
      setBet2Active(false);
      bet2ActiveRef.current = false;
    }
  }, [phase, bet1Amount, bet2Amount]);

  const cashOut = useCallback((betNum: 1 | 2) => {
    if (phase !== "flying") return;
    performCashOut(betNum, multiplier);
  }, [phase, multiplier, performCashOut]);

  useEffect(() => {
    if (phase === "crashed") {
      if (bet1Active && !bet1CashedRef.current) {
        setBet1Active(false);
        bet1ActiveRef.current = false;
      }
      if (bet2Active && !bet2CashedRef.current) {
        setBet2Active(false);
        bet2ActiveRef.current = false;
      }
    }
    if (phase === "waiting") {
      setBet1Active(false);
      setBet2Active(false);
      bet1ActiveRef.current = false;
      bet2ActiveRef.current = false;
    }
  }, [phase]);

  return {
    phase,
    multiplier,
    crashPoint,
    countdown,
    balance,
    history,
    playerBets,

    bet1Amount, setBet1Amount,
    bet2Amount, setBet2Amount,
    bet1Active,
    bet2Active,
    bet1AutoCashOut, setBet1AutoCashOut,
    bet2AutoCashOut, setBet2AutoCashOut,
    bet1AutoEnabled, setBet1AutoEnabled,
    bet2AutoEnabled, setBet2AutoEnabled,
    bet1CashedOut,
    bet2CashedOut,

    placeBet,
    cancelBet,
    cashOut,
  };
}
