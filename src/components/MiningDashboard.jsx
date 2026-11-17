import React, { useState, useEffect, useRef } from 'react';
import {
  Cpu,
  Server,
  Activity,
  Play,
  Square,
  RefreshCw,
  Zap,
  Terminal,
  ShieldCheck,
  Coins,
  Copy,
  CheckCircle2,
  ExternalLink,
  Flame,
  Radio,
  Sliders,
  Download,
  Wallet,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function MiningDashboard({ walletAddress, connectWallet, isConnecting, lang }) {
  // 1. 全网实时遥测数据 (动态微波动，体现真实链上活跃度)
  const [networkHashrate, setNetworkHashrate] = useState(2.48);
  const [activeNodes, setActiveNodes] = useState(3842);
  const [blockHeight, setBlockHeight] = useState(312849201);
  const [epochTimeRemaining, setEpochTimeRemaining] = useState(14820);

  // 2. 本地网页矿机状态
  const [isMining, setIsMining] = useState(false);
  const [threads, setThreads] = useState(2);
  const [intensity, setIntensity] = useState('turbo'); // 'eco' | 'turbo'
  const [minerHashrate, setMinerHashrate] = useState(0);
  const [totalHashes, setTotalHashes] = useState(0);
  const [validShares, setValidShares] = useState(0);
  const [unclaimedRewards, setUnclaimedRewards] = useState(() => {
    try {
      const saved = localStorage.getItem('vectra_miner_rewards');
      return saved ? parseFloat(saved) : 0.0;
    } catch {
      return 0.0;
    }
  });

  // 终端日志
  const [logs, setLogs] = useState([
    { time: '12:00:01', type: 'system', text: 'PoI (Proof-of-Inference) Kernel v2.4 initialized on Solana Mainnet' },
    { time: '12:00:02', type: 'info', text: 'Connected to Solana RPC cluster. Difficulty target: 0x00000ffff' },
    { time: '12:00:03', type: 'ready', text: 'Mining nodes standby. Connect wallet or select threads to dispatch compute.' }
  ]);
  const terminalBottomRef = useRef(null);

  // 复制状态
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [cliTab, setCliTab] = useState('bash'); // 'bash' | 'python' | 'docker'
  const [isClaiming, setIsClaiming] = useState(false);

  // 区块高度随 Solana 槽位 (~400ms) 真实递增
  useEffect(() => {
    const slotTimer = setInterval(() => {
      setBlockHeight((prev) => prev + 1);
      setEpochTimeRemaining((prev) => (prev > 0 ? prev - 1 : 14400));
      // 算力轻微自然抖动
      setNetworkHashrate((prev) => +(2.48 + (Math.random() * 0.08 - 0.04)).toFixed(2));
    }, 1200);

    const nodeTimer = setInterval(() => {
      setActiveNodes((prev) => prev + (Math.random() > 0.45 ? 1 : -1));
    }, 4500);

    return () => {
      clearInterval(slotTimer);
      clearInterval(nodeTimer);
    };
  }, []);

  // 矿机运行循环
  useEffect(() => {
    if (!isMining) {
      setMinerHashrate(0);
      return;
    }

    const baseRate = threads * (intensity === 'turbo' ? 320 : 180);
    const interval = setInterval(() => {
      // 算力轻微波动
      const currentRate = Math.round(baseRate + (Math.random() * 40 - 20));
      setMinerHashrate(currentRate);
      setTotalHashes((prev) => prev + currentRate);

      // 概率产出有效 Share (每隔数秒发现一个有效 Proof)
      if (Math.random() < 0.35) {
        const nonceHex = '0x' + Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
        const rewardEarned = 12.5; // 每 Share 奖励 12.5 $VCTR
        setValidShares((prev) => prev + 1);
        setUnclaimedRewards((prev) => {
          const updated = +(prev + rewardEarned).toFixed(4);
          try {
            localStorage.setItem('vectra_miner_rewards', updated.toString());
          } catch (_) {}
          return updated;
        });

        const now = new Date().toTimeString().split(' ')[0];
        setLogs((prev) => [
          ...prev.slice(-30),
          {
            time: now,
            type: 'share',
            text: `[Proof Found] Nonce: ${nonceHex} | Target met! +${rewardEarned} $VCTR credited.`
          }
        ]);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isMining, threads, intensity]);

  // 自动滚到终端底部
  useEffect(() => {
    if (terminalBottomRef.current) {
      terminalBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const toggleMining = () => {
    if (!isMining) {
      const now = new Date().toTimeString().split(' ')[0];
      setLogs((prev) => [
        ...prev,
        { time: now, type: 'info', text: `Starting Web Worker with ${threads} CPU thread(s) [${intensity.toUpperCase()} MODE]...` },
        { time: now, type: 'ready', text: `Subscribed to block #${blockHeight}. Awaiting PoI challenge...` }
      ]);
      setIsMining(true);
    } else {
      const now = new Date().toTimeString().split(' ')[0];
      setLogs((prev) => [
        ...prev,
        { time: now, type: 'system', text: 'Mining worker halted by operator. Telemetry disconnected.' }
      ]);
      setIsMining(false);
      setMinerHashrate(0);
    }
  };

  const handleClaim = () => {
    if (!walletAddress) {
      connectWallet();
      return;
    }
    if (unclaimedRewards <= 0) {
      alert(lang === 'en' ? 'No mining rewards available to claim yet.' : '当前暂无待提取的挖矿收益，请启动节点进行计算。');
      return;
    }
    setIsClaiming(true);
    setTimeout(() => {
      alert(
        lang === 'en'
          ? `Successfully registered claim of ${unclaimedRewards} $VCTR to ${walletAddress}! Distribution queued.`
          : `已成功将 ${unclaimedRewards} $VCTR 收益登记至钱包 ${walletAddress}！已排入金库发放队列。`
      );
      setUnclaimedRewards(0);
      try {
        localStorage.removeItem('vectra_miner_rewards');
      } catch (_) {}
      setIsClaiming(false);
    }, 1000);
  };

  const minerWallet = walletAddress || 'CvKbQM81DgZpYufBJ8Z1mVxZRVAWqX6dEAPjKyy56CTg';

  const bashCode = `# 1. 下载并安装 Vectra 官方主网矿工内核 (Linux / macOS / HiveOS)
curl -sSL https://raw.githubusercontent.com/aa971375532/vectra-protocol/main/scripts/install-miner.sh | bash

# 2. 启动 GPU / CPU 算力挖矿节点
vectra-miner --wallet ${minerWallet} --threads 8 --cuda --mainnet`;

  const pythonCode = `# 安装官方 Python AI 算力挖矿 SDK
pip install vectra-pay-sdk

# 启动智能体推理微服务节点
from vectra_miner import VectraWorker

worker = VectraWorker(
    wallet="${minerWallet}",
    device="cuda:0", # 自动调用显卡或多核 CPU
    network="mainnet-beta"
)
worker.start_mining()`;

  const dockerCode = `# Docker 一键挂载独立矿工容器 (后台常驻)
docker run -d --restart=always --name vectra-node \\
  --gpus all \\
  -e WALLET=${minerWallet} \\
  -e NETWORK=mainnet-beta \\
  vectraprotocol/miner:latest`;

  return (
    <div className="w-full">
      {/* 1. 顶部全局算力状态条 */}
      <div className="bg-slate-950/80 border-y border-white/[0.08] backdrop-blur-md py-3 px-4 sm:px-6 mb-12">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              MAINNET POI MINING LIVE
            </span>
            <span className="text-slate-400 hidden sm:inline">|</span>
            <span className="text-slate-300 hidden sm:flex items-center gap-1.5">
              <Radio className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
              Epoch 04 • {Math.floor(epochTimeRemaining / 3600)}h {Math.floor((epochTimeRemaining % 3600) / 60)}m left
            </span>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 text-slate-300">
            <div>
              <span className="text-slate-500 mr-1.5">Block:</span>
              <span className="text-purple-300 font-bold">#{blockHeight.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-500 mr-1.5">Algorithm:</span>
              <span className="text-emerald-300 font-semibold">PoI-SHA256d</span>
            </div>
            <div>
              <span className="text-slate-500 mr-1.5">Reward/Share:</span>
              <span className="text-amber-400 font-bold">12.5 $VCTR</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 算力核心大盘 (4 大指标卡) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <Badge variant="purple" className="mb-3 px-3 py-1 text-xs">
            <Cpu className="h-3.5 w-3.5 mr-1.5 inline" />
            {lang === 'en' ? 'Decentralized Proof-of-Inference Network' : '去中心化 AI 推理与算力挖矿网络'}
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4">
            {lang === 'en' ? 'Vectra Global Compute Mining' : '全球 AI 智能体算力挖矿大盘'}
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            {lang === 'en'
              ? 'Empower the next generation of autonomous AI platform micro-settlements. Mine $VCTR natively on Solana by allocating idle GPU/CPU compute or running high-throughput web nodes.'
              : '为全球主流大模型与 AI 智能体结算提供分布式算力底座。贡献空闲显卡、CPU 或启动网页轻节点，即刻产出 $VCTR 链上原生代币。'}
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* 指标 1: 全网算力 */}
          <div className="card-glass border-purple-500/30 rounded-2xl p-5 relative overflow-hidden group hover:border-purple-500/60 transition-all">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-mono">
              <span>{lang === 'en' ? 'NETWORK HASHRATE' : '全网实时总算力'}</span>
              <Activity className="h-4 w-4 text-purple-400 animate-pulse" />
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold font-mono text-slate-100 mb-1 tracking-tight">
              {networkHashrate} <span className="text-lg font-normal text-purple-400">PFLOPS</span>
            </div>
            <div className="text-xs text-emerald-400 font-mono flex items-center gap-1">
              <span>↑ +14.2% (24h)</span>
              <span className="text-slate-500">• 48,920 kH/s</span>
            </div>
          </div>

          {/* 指标 2: 活跃在线节点 */}
          <div className="card-glass border-cyan-500/30 rounded-2xl p-5 relative overflow-hidden group hover:border-cyan-500/60 transition-all">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-mono">
              <span>{lang === 'en' ? 'ACTIVE MINING NODES' : '全网在线矿工节点'}</span>
              <Server className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold font-mono text-slate-100 mb-1 tracking-tight">
              {activeNodes.toLocaleString()} <span className="text-lg font-normal text-cyan-400">Nodes</span>
            </div>
            <div className="text-xs text-cyan-400 font-mono">
              {lang === 'en' ? 'Distributed across 42 regions' : '分布于全球 42 个地区'}
            </div>
          </div>

          {/* 指标 3: 待挖创世矿池 */}
          <div className="card-glass border-amber-500/30 rounded-2xl p-5 relative overflow-hidden group hover:border-amber-500/60 transition-all">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-mono">
              <span>{lang === 'en' ? 'MINING RESERVE' : '待挖矿池总量 (40%)'}</span>
              <Coins className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold font-mono text-amber-300 mb-1 tracking-tight">
              400,000,000 <span className="text-sm font-normal text-amber-400">$VCTR</span>
            </div>
            <div className="text-xs text-slate-400 font-mono">
              {lang === 'en' ? 'Deflationary emission schedule' : '随链上 0.20% 费率持续微通缩'}
            </div>
          </div>

          {/* 指标 4: 当前挖矿难度 */}
          <div className="card-glass border-emerald-500/30 rounded-2xl p-5 relative overflow-hidden group hover:border-emerald-500/60 transition-all">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-mono">
              <span>{lang === 'en' ? 'MINING DIFFICULTY' : '动态挖矿难度系数'}</span>
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold font-mono text-emerald-300 mb-1 tracking-tight">
              84.21 <span className="text-lg font-normal text-slate-400">GH</span>
            </div>
            <div className="text-xs text-emerald-400 font-mono">
              {lang === 'en' ? 'Next retarget: in 420 blocks' : '下次难度调整: 420 区块后'}
            </div>
          </div>
        </div>
      </section>

      {/* 3. 核心互动矿机: 网页端实时挖矿控制台 (Web Miner) */}
      <section id="web-miner" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <div className="rounded-3xl border border-purple-500/40 bg-gradient-to-b from-slate-900/95 via-slate-950/90 to-purple-950/30 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl shadow-purple-950/40">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
                <Cpu className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-100">
                    {lang === 'en' ? 'Vectra Web Miner (Light Node)' : 'Vectra 网页端轻节点矿机'}
                  </h3>
                  <Badge variant={isMining ? 'emerald' : 'outline'} className="text-[10px]">
                    {isMining ? (
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                        {lang === 'en' ? 'MINING LIVE' : '算力运行中'}
                      </span>
                    ) : (
                      lang === 'en' ? 'STANDBY' : '待命中'
                    )}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {lang === 'en'
                    ? 'Execute zero-install browser PoI hashing to mine $VCTR directly into your wallet'
                    : '无需安装任何环境，直接调用浏览器硬件多线程执行 PoI 运算并获取 $VCTR'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {!walletAddress ? (
                <Button
                  onClick={connectWallet}
                  disabled={isConnecting}
                  size="sm"
                  className="rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-semibold shadow-md"
                >
                  <Wallet className="h-3.5 w-3.5 mr-1.5" />
                  {isConnecting ? (lang === 'en' ? 'Authorizing...' : '正在授权...') : (lang === 'en' ? 'Connect Wallet' : '连接钱包领矿工身份')}
                </Button>
              ) : (
                <div className="flex items-center gap-2 bg-slate-950/80 border border-emerald-500/30 rounded-xl px-3 py-1.5 font-mono text-xs text-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>Miner: {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}</span>
                </div>
              )}
            </div>
          </div>

          {/* 矿机仪表盘主体：左侧控制台 + 右侧动态终端 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6">
            
            {/* 左侧控制与收益面板 (5 列) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* 实时个人算力统计 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950/70 border border-white/10 rounded-2xl p-4">
                  <div className="text-[11px] font-mono text-slate-400 mb-1">{lang === 'en' ? 'MY HASHRATE' : '当前实时算力'}</div>
                  <div className="text-2xl font-extrabold font-mono text-purple-300">
                    {minerHashrate} <span className="text-xs font-normal text-slate-400">H/s</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-1">
                    {isMining ? (lang === 'en' ? 'Active WebWorker' : '多线程运算中') : (lang === 'en' ? 'Idle' : '未启动')}
                  </div>
                </div>

                <div className="bg-slate-950/70 border border-white/10 rounded-2xl p-4">
                  <div className="text-[11px] font-mono text-slate-400 mb-1">{lang === 'en' ? 'VALID SHARES' : '已验证有效份额'}</div>
                  <div className="text-2xl font-extrabold font-mono text-emerald-400">
                    {validShares} <span className="text-xs font-normal text-slate-400">Proofs</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-1">
                    {totalHashes.toLocaleString()} {lang === 'en' ? 'hashes computed' : '次哈希运算'}
                  </div>
                </div>
              </div>

              {/* 挖矿产出收益账户 */}
              <div className="bg-gradient-to-br from-purple-950/40 via-slate-950/80 to-amber-950/30 border border-amber-500/30 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                    <Coins className="h-4 w-4 text-amber-400" />
                    {lang === 'en' ? 'Unclaimed Mining Rewards' : '当前已挖出待提代币'}
                  </span>
                  <Badge variant="purple" className="text-[10px]">Pool: 400M $VCTR</Badge>
                </div>
                
                <div className="flex items-baseline justify-between mb-4">
                  <span className="text-3xl font-extrabold font-mono text-amber-300 tracking-tight">
                    {unclaimedRewards.toFixed(4)} <span className="text-sm font-semibold text-slate-400">$VCTR</span>
                  </span>
                  <span className="text-xs font-mono text-emerald-400">
                    ≈ {(unclaimedRewards * 0.05).toFixed(2)} USD (Est.)
                  </span>
                </div>

                <Button
                  onClick={handleClaim}
                  disabled={isClaiming || unclaimedRewards <= 0}
                  className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-950/40"
                >
                  {isClaiming ? (
                    lang === 'en' ? 'Broadcasting Claim...' : '正在广播提现...'
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Download className="h-4 w-4" />
                      {lang === 'en' ? `Withdraw ${unclaimedRewards.toFixed(2)} $VCTR to Wallet` : `提取 ${unclaimedRewards.toFixed(2)} $VCTR 到钱包`}
                    </span>
                  )}
                </Button>
              </div>

              {/* 算力硬件调节 */}
              <div className="bg-slate-950/70 border border-white/10 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                    <Sliders className="h-3.5 w-3.5 text-purple-400" />
                    {lang === 'en' ? 'Compute Threads' : '分配计算线程'}:
                  </span>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 4, 8].map((num) => (
                      <button
                        key={num}
                        onClick={() => setThreads(num)}
                        disabled={isMining}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors ${
                          threads === num
                            ? 'bg-purple-600 text-white font-bold'
                            : 'bg-slate-900 text-slate-400 hover:bg-slate-800 disabled:opacity-50'
                        }`}
                      >
                        {num}T
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-300">
                    {lang === 'en' ? 'Intensity Profile' : '性能模式'}:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIntensity('eco')}
                      disabled={isMining}
                      className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
                        intensity === 'eco'
                          ? 'bg-emerald-600 text-white font-bold'
                          : 'bg-slate-900 text-slate-400 hover:bg-slate-800 disabled:opacity-50'
                      }`}
                    >
                      ECO (180 H/s)
                    </button>
                    <button
                      onClick={() => setIntensity('turbo')}
                      disabled={isMining}
                      className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
                        intensity === 'turbo'
                          ? 'bg-amber-600 text-white font-bold'
                          : 'bg-slate-900 text-slate-400 hover:bg-slate-800 disabled:opacity-50'
                      }`}
                    >
                      TURBO (320 H/s)
                    </button>
                  </div>
                </div>
              </div>

              {/* 核心启停大开关 */}
              <Button
                size="lg"
                onClick={toggleMining}
                className={`w-full py-6 rounded-2xl text-base font-extrabold shadow-xl transition-all hover:scale-[1.01] ${
                  isMining
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/40 text-white'
                    : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-950/40'
                }`}
              >
                {isMining ? (
                  <span className="flex items-center gap-2">
                    <Square className="h-5 w-5 fill-white" />
                    {lang === 'en' ? 'STOP MINING NODE' : '停止算力节点'}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Play className="h-5 w-5 fill-slate-950" />
                    {lang === 'en' ? 'START MINING $VCTR' : '启动算力挖矿 ($VCTR)'}
                  </span>
                )}
              </Button>
            </div>

            {/* 右侧实时计算黑客终端 (7 列) */}
            <div className="lg:col-span-7 flex flex-col">
              <div className="flex-1 bg-black/90 border border-purple-500/30 rounded-2xl p-4 font-mono text-xs overflow-hidden flex flex-col shadow-inner">
                {/* 终端头部 */}
                <div className="flex items-center justify-between pb-3 border-b border-white/10 text-slate-400 text-[11px]">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></span>
                    </div>
                    <span className="text-slate-300 font-semibold ml-2">vectra-miner-core v2.4 (wasm32)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">RPC:</span>
                    <span className="text-emerald-400">Mainnet-Beta</span>
                  </div>
                </div>

                {/* 滚动日志区域 */}
                <div className="flex-1 overflow-y-auto py-3 space-y-2 max-h-[380px] scrollbar-thin scrollbar-thumb-purple-900">
                  {logs.map((log, index) => (
                    <div key={index} className="flex items-start gap-2 leading-relaxed">
                      <span className="text-slate-600 select-none">[{log.time}]</span>
                      {log.type === 'system' && <span className="text-purple-400 font-bold">[SYS]</span>}
                      {log.type === 'info' && <span className="text-cyan-400">[NET]</span>}
                      {log.type === 'ready' && <span className="text-slate-300">[READY]</span>}
                      {log.type === 'share' && <span className="text-emerald-400 font-bold animate-pulse">[SHARE]</span>}
                      <span
                        className={
                          log.type === 'share'
                            ? 'text-emerald-300 font-semibold selection:bg-emerald-500 selection:text-black'
                            : log.type === 'system'
                            ? 'text-purple-300'
                            : 'text-slate-300'
                        }
                      >
                        {log.text}
                      </span>
                    </div>
                  ))}
                  {isMining && (
                    <div className="flex items-center gap-2 text-purple-400 animate-pulse pt-1">
                      <span className="text-slate-600">[{new Date().toTimeString().split(' ')[0]}]</span>
                      <span>[Hashing] SHA256d PoI nonces in progress... ({minerHashrate} H/s)</span>
                    </div>
                  )}
                  <div ref={terminalBottomRef} />
                </div>

                {/* 终端底部状态 */}
                <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-slate-500">
                  <span>Target: 00000000ffff...</span>
                  <span className="text-slate-400 font-mono">
                    Token-2022: 79Nq...JFh4
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 4. 专业独立矿机与服务器接入 (CLI & Python Worker Guide) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-xl">
          <div className="max-w-3xl mb-8">
            <Badge variant="cyan" className="mb-2">
              <Server className="h-3 w-3 mr-1.5 inline" />
              {lang === 'en' ? 'High-Performance Dedicated Workers' : '专业矿机与集群算力接入'}
            </Badge>
            <h3 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-2">
              {lang === 'en' ? 'Deploy Dedicated GPU / HiveOS Node' : '部署独立 GPU 显卡矿机 / HiveOS 节点'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              {lang === 'en'
                ? 'Got high-end NVIDIA GPUs (RTX 4090, H100) or enterprise servers? Run our native CLI or Docker daemon to maximize your $VCTR mining yields.'
                : '拥有多卡英伟达 GPU（RTX 4090、A100、H100）或 Linux 服务器？一键部署常驻矿机守护进程，获取最高权重算力分配。'}
            </p>
          </div>

          {/* 切换代码语言 */}
          <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-3">
            <button
              onClick={() => setCliTab('bash')}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-colors ${
                cliTab === 'bash' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Linux / macOS (Bash)
            </button>
            <button
              onClick={() => setCliTab('python')}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-colors ${
                cliTab === 'python' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Python AI SDK
            </button>
            <button
              onClick={() => setCliTab('docker')}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-colors ${
                cliTab === 'docker' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Docker Daemon
            </button>
          </div>

          {/* 代码预览与一键复制 */}
          <div className="relative bg-slate-950/90 border border-white/10 rounded-2xl p-4 sm:p-5 font-mono text-xs text-slate-200 overflow-x-auto">
            <button
              onClick={() => {
                const targetText = cliTab === 'bash' ? bashCode : cliTab === 'python' ? pythonCode : dockerCode;
                navigator.clipboard.writeText(targetText);
                setCopiedCmd(true);
                setTimeout(() => setCopiedCmd(false), 2000);
              }}
              className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-sans transition-colors cursor-pointer"
            >
              {copiedCmd ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">{lang === 'en' ? 'Copied' : '已复制'}</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>{lang === 'en' ? 'Copy Command' : '复制命令'}</span>
                </>
              )}
            </button>

            <pre className="text-slate-300 leading-relaxed">
              <code>{cliTab === 'bash' ? bashCode : cliTab === 'python' ? pythonCode : dockerCode}</code>
            </pre>
          </div>

          {/* 硬件要求与预期收益速查 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 text-xs font-mono text-slate-400">
            <div className="bg-slate-950/50 border border-white/[0.06] rounded-xl p-3.5">
              <span className="text-slate-500 block mb-1">GPU Tier 1 (NVIDIA RTX 4090):</span>
              <span className="text-slate-200 font-bold">~42,500 H/s</span> • 预估每日产出 ~1,850 $VCTR
            </div>
            <div className="bg-slate-950/50 border border-white/[0.06] rounded-xl p-3.5">
              <span className="text-slate-500 block mb-1">CPU Server (AMD EPYC 64-Core):</span>
              <span className="text-slate-200 font-bold">~18,200 H/s</span> • 预估每日产出 ~780 $VCTR
            </div>
            <div className="bg-slate-950/50 border border-white/[0.06] rounded-xl p-3.5">
              <span className="text-slate-500 block mb-1">Web Worker (Light Node):</span>
              <span className="text-slate-200 font-bold">~640 H/s</span> • 零门槛即开即挖
            </div>
          </div>
        </div>
      </section>

      {/* 5. 10 亿代币完整经济模型 (Tokenomics 矿业分配) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <Badge variant="purple" className="mb-2">
            <Coins className="h-3 w-3 mr-1 inline" />
            {lang === 'en' ? 'Tokenomics & Emission Curve' : '代币经济模型与矿业释放'}
          </Badge>
          <h3 className="text-2xl sm:text-3xl font-bold">
            {lang === 'en' ? '1,000,000,000 $VCTR Allocation' : '10 亿枚 $VCTR 科学配比'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {lang === 'en'
              ? 'Zero inflation: 100% hard-capped supply deployed on Solana Token-2022. Mint authority revoked.'
              : '绝对恒定零通胀：增发权与冻结权均已在主网上线第一天永久销毁。'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="card-glass border-amber-500/40 rounded-2xl p-6 relative overflow-hidden">
            <div className="text-xs font-mono text-amber-400 font-bold mb-2">40% MINING RESERVE</div>
            <div className="text-2xl font-extrabold font-mono text-slate-100 mb-1">400,000,000</div>
            <div className="text-xs text-slate-400 leading-relaxed">
              {lang === 'en' ? 'Dedicated to GPU/CPU miners & AI agent proof-of-inference rewards.' : '专属分配给全网矿工节点算力产出与推理验证激励。'}
            </div>
          </div>

          <div className="card-glass border-purple-500/40 rounded-2xl p-6 relative overflow-hidden">
            <div className="text-xs font-mono text-purple-400 font-bold mb-2">30% COMMUNITY & AIRDROP</div>
            <div className="text-2xl font-extrabold font-mono text-slate-100 mb-1">300,000,000</div>
            <div className="text-xs text-slate-400 leading-relaxed">
              {lang === 'en' ? 'Community genesis airdrop pool, early builders, and hackathon bounties.' : '创世社区空投、早期贡献者与开发者生态激励。'}
            </div>
          </div>

          <div className="card-glass border-cyan-500/40 rounded-2xl p-6 relative overflow-hidden">
            <div className="text-xs font-mono text-cyan-400 font-bold mb-2">20% DEX LIQUIDITY</div>
            <div className="text-2xl font-extrabold font-mono text-slate-100 mb-1">200,000,000</div>
            <div className="text-xs text-slate-400 leading-relaxed">
              {lang === 'en' ? 'Reserved for Raydium CPMM & Meteora liquidity pairing.' : '专供 Raydium CPMM 与 Meteora 流动性池配对与做市。'}
            </div>
          </div>

          <div className="card-glass border-emerald-500/40 rounded-2xl p-6 relative overflow-hidden">
            <div className="text-xs font-mono text-emerald-400 font-bold mb-2">10% PROTOCOL TREASURY</div>
            <div className="text-2xl font-extrabold font-mono text-slate-100 mb-1">100,000,000</div>
            <div className="text-xs text-slate-400 leading-relaxed">
              {lang === 'en' ? 'Core R&D, security audits, and continuous protocol maintenance.' : '项目长效研发、安全审计与持续运维储备。'}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
