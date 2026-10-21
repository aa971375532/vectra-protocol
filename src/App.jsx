import React, { useState, useEffect } from 'react';
import {
  Zap,
  Globe,
  Coins,
  Flame,
  Landmark,
  Code2,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Wallet,
  Terminal,
  Layers,
  Bot,
  Percent,
  Check,
  CreditCard,
  Sparkles,
  Copy,
  Droplets,
  LogOut,
  BookOpen,
  Presentation,
  Languages,
  ShieldCheck,
  TrendingDown,
  ArrowLeftRight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

import { translations } from '@/i18n/translations';

export default function App() {
  // 默认英文 (English by default)
  const [lang, setLang] = useState('en');
  const t = translations[lang];

  // 钱包真实连接状态
  const [walletAddress, setWalletAddress] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // 模拟支付弹窗状态
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [payResult, setPayResult] = useState(null);

  // 代码复制状态
  const [copiedJs, setCopiedJs] = useState(false);
  const [copiedPy, setCopiedPy] = useState(false);
  const [copiedCa, setCopiedCa] = useState(false);

  const GITHUB_REPO = 'https://github.com/aa971375532/vectra-protocol';

  // 技术文档与白皮书官方在线链接 (确保 100% 正常渲染且永不 404)
  const getWhitepaperUrl = (targetLang) => {
    const file = targetLang === 'en' ? 'VECTRA_WHITEPAPER_EN.md' : 'VECTRA_WHITEPAPER_CN.md';
    return `${GITHUB_REPO}/blob/main/${file}`;
  };

  const getPitchDeckUrl = () => `${GITHUB_REPO}/blob/main/PITCH_DECK.md`;

  // 通用版 Solana / Phantom 钱包检测函数
  const getSolanaProvider = () => {
    if (typeof window === 'undefined') return null;
    if ('phantom' in window && window.phantom?.solana?.isPhantom) {
      return window.phantom.solana;
    }
    if ('solana' in window) {
      return window.solana;
    }
    return null;
  };

  // 初始化监听钱包事件与会话恢复
  useEffect(() => {
    const provider = getSolanaProvider();
    if (!provider) return;

    // 仅当用户此前主动连接过时，才尝试无感静默恢复连接 (onlyIfTrusted)
    if (localStorage.getItem('vectra_wallet_connected') === 'true') {
      if (typeof provider.connect === 'function') {
        provider
          .connect({ onlyIfTrusted: true })
          .then((resp) => {
            if (resp && resp.publicKey) {
              const addr = resp.publicKey.toString();
              setWalletAddress(addr);
            }
          })
          .catch(() => {
            localStorage.removeItem('vectra_wallet_connected');
          });
      }
    }

    const handleAccountChange = (publicKey) => {
      if (publicKey) {
        const addr = publicKey.toString();
        setWalletAddress(addr);
      } else {
        setWalletAddress(null);
        localStorage.removeItem('vectra_wallet_connected');
      }
    };

    const handleDisconnect = () => {
      setWalletAddress(null);
      localStorage.removeItem('vectra_wallet_connected');
    };

    if (typeof provider.on === 'function') {
      provider.on('accountChanged', handleAccountChange);
      provider.on('disconnect', handleDisconnect);
    }

    return () => {
      if (typeof provider.removeListener === 'function') {
        provider.removeListener('accountChanged', handleAccountChange);
        provider.removeListener('disconnect', handleDisconnect);
      }
    };
  }, []);

  // 连接 Phantom 钱包 (通用版逻辑，必定唤起 Phantom 插件弹窗)
  const connectWallet = async () => {
    const provider = getSolanaProvider();

    if (!provider) {
      const confirmDownload = window.confirm(
        lang === 'en'
          ? 'Phantom wallet extension not detected. Would you like to visit phantom.app to install it?'
          : '未检测到 Phantom 钱包扩展。是否前往 phantom.app 官网下载安装？'
      );
      if (confirmDownload) {
        window.open('https://phantom.app/', '_blank');
      }
      return;
    }

    try {
      setIsConnecting(true);
      // 显式调用 connect() 必定唤起 Phantom 插件弹窗
      const resp = await provider.connect();
      if (resp && resp.publicKey) {
        const addr = resp.publicKey.toString();
        setWalletAddress(addr);
        localStorage.setItem('vectra_wallet_connected', 'true');
      }
    } catch (err) {
      console.warn('Wallet connection cancelled or rejected by user:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  // 退出并彻底断开钱包连接
  const disconnectWallet = async () => {
    try {
      const provider = getSolanaProvider();
      if (provider && typeof provider.disconnect === 'function') {
        await provider.disconnect();
      }
    } catch (err) {
      console.warn('Disconnect error:', err);
    } finally {
      setWalletAddress(null);
      localStorage.removeItem('vectra_wallet_connected');
    }
  };

  // 触发官网收银台模拟
  const handleOpenCheckout = async () => {
    if (!walletAddress) {
      await connectWallet();
      return;
    }
    setPayResult(null);
    setIsDialogOpen(true);
  };

  // 执行模拟支付
  const handleExecutePayment = async () => {
    setIsPaying(true);
    try {
      const res = await fetch('/api/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: 'ai-platform-direct',
          serviceName: 'AI Platform Pro Subscription',
          priceVctr: 20.0,
          userWallet: walletAddress || 'CvKbQM81DgZpYufBJ8Z1mVxZRVAWqX6dEAPjKyy56CTg',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPayResult(data);
      }
    } catch (err) {
      console.error(err);
      alert('Payment simulation failed');
    } finally {
      setIsPaying(false);
    }
  };

  // 代码复制代码块内容
  const copyCode = (type) => {
    const jsCode = `import { VectraCheckout } from '@vectra/pay-sdk';\n\nconst checkout = new VectraCheckout({\n  merchantAddress: 'DDngT11XyxqbYi38nNv1sDNxw1K4er1WHQb7EyAQhcgg',\n  amountVctr: 20.0,\n  orderId: 'AI-SUB-20261021',\n  onSuccess: (signature) => {\n    console.log('✅ Payment confirmed on Solana:', signature);\n  }\n});\n\ncheckout.render('#vectra-pay-button');`;
    const pyCode = `from fastapi import FastAPI\nfrom vectra_pay import VectraHTTP402Middleware\n\napp = FastAPI()\n\n# Mount Vectra Decentralized HTTP 402 Middleware\napp.add_middleware(\n  VectraHTTP402Middleware,\n  merchant_address="DDngT11XyxqbYi38nNv1sDNxw1K4er1WHQb7EyAQhcgg",\n  price_per_call=0.05  # 0.05 $VCTR per model inference\n)`;

    if (type === 'js') {
      navigator.clipboard.writeText(jsCode);
      setCopiedJs(true);
      setTimeout(() => setCopiedJs(false), 2000);
    } else {
      navigator.clipboard.writeText(pyCode);
      setCopiedPy(true);
      setTimeout(() => setCopiedPy(false), 2000);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between selection:bg-purple-600 selection:text-white bg-[#030712] text-slate-100 bg-grid-pattern">
      
      {/* 顶部环境渐变光晕 */}
      <div className="ambient-glow-purple" />
      <div className="ambient-glow-emerald" />

      {/* 顶部导航栏 (Navbar) */}
      <header className="border-b border-white/[0.08] bg-[#030712]/75 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo 区域 */}
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-emerald-400 p-[1.5px] shadow-lg shadow-purple-500/20">
              <div className="w-full h-full bg-[#090a0f] rounded-[10px] flex items-center justify-center">
                <Zap className="h-5 w-5 text-emerald-400 fill-emerald-400" />
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-purple-300 via-fuchsia-300 to-emerald-300 bg-clip-text text-transparent">
                VECTRA
              </span>
              <Badge variant="purple" className="ml-2.5 font-mono text-[10px] px-2 py-0.5">
                Token-2022
              </Badge>
            </div>
          </div>

          {/* 桌面端导航链接 */}
          <nav className="hidden lg:flex items-center space-x-6 text-xs font-medium text-slate-300">
            <a
              href={getWhitepaperUrl(lang)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center hover:text-white transition-colors py-1 group"
            >
              <BookOpen className="h-3.5 w-3.5 mr-1.5 text-purple-400 group-hover:text-purple-300" />
              {t.nav.whitepaper}
            </a>
            <a
              href={getPitchDeckUrl()}
              target="_blank"
              rel="noreferrer"
              className="flex items-center hover:text-white transition-colors py-1 group"
            >
              <Presentation className="h-3.5 w-3.5 mr-1.5 text-cyan-400 group-hover:text-cyan-300" />
              {t.nav.pitchDeck}
            </a>
            <a
              href="https://solscan.io/token/79NqWzXcrKsUfwWSv9wP2ZFeLvmRkUPoWyv8fEFxJFh4"
              target="_blank"
              rel="noreferrer"
              className="flex items-center hover:text-white transition-colors py-1 group"
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5 text-cyan-400 group-hover:text-cyan-300" />
              Solscan
            </a>
            <a
              href={GITHUB_REPO}
              target="_blank"
              rel="noreferrer"
              className="flex items-center hover:text-white transition-colors py-1 group"
            >
              <Code2 className="h-3.5 w-3.5 mr-1.5 text-slate-400 group-hover:text-slate-200" />
              {t.nav.github}
            </a>
          </nav>

          {/* 右侧控制栏 */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            
            {/* Solana Devnet 状态徽章 */}
            <div className="hidden sm:flex items-center space-x-2 text-xs bg-slate-900/80 border border-white/10 px-3.5 py-1.5 rounded-full backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-slate-300 font-medium">{t.nav.networkBadge}</span>
            </div>

            {/* 中英文无缝切换按钮 (English / 中文) */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}
              className="text-xs font-semibold px-3 py-1.5 rounded-full border-white/10 bg-slate-900/60 hover:bg-slate-800 backdrop-blur-md"
            >
              <Languages className="h-3.5 w-3.5 mr-1.5 text-purple-400" />
              {lang === 'en' ? '中文' : 'English'}
            </Button>

            {/* 通用版 Phantom 钱包连接与断开控制 */}
            {!walletAddress ? (
              <Button
                variant="default"
                size="sm"
                onClick={connectWallet}
                disabled={isConnecting}
                className="rounded-xl font-medium shadow-lg shadow-purple-600/30 hover:scale-[1.02] transition-transform bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500"
              >
                <Wallet className="h-4 w-4 mr-1.5" />
                {isConnecting
                  ? (lang === 'en' ? 'Connecting...' : '正在连接...')
                  : t.nav.connectWallet}
              </Button>
            ) : (
              <div className="flex items-center space-x-1.5 bg-slate-900/90 border border-emerald-500/40 rounded-xl px-2.5 py-1 backdrop-blur-md shadow-md shadow-emerald-950/40">
                <div className="flex items-center space-x-1.5 text-xs font-mono text-emerald-300 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>{walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={disconnectWallet}
                  title={t.nav.disconnect}
                  className="h-7 px-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 ml-1 text-xs font-medium transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5 mr-1" />
                  <span className="hidden sm:inline">{t.nav.disconnect}</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 主体内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 flex-1 w-full relative z-10">
        
        {/* Hero 区域 */}
        <section className="text-center max-w-4xl mx-auto mb-20 pt-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-medium mb-6 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            <span>{t.hero.badge}</span>
          </div>

          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1]">
            {t.hero.titleLine1} <br />
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-emerald-400 bg-clip-text text-transparent">
              {t.hero.titleLine2}
            </span>
          </h1>

          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mb-10">
            {t.hero.subtitle}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={handleOpenCheckout}
              className="rounded-xl shadow-xl shadow-purple-600/25 px-7 py-3 text-sm font-semibold hover:scale-[1.02] transition-transform"
            >
              {t.hero.btnSimulate}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              asChild
              className="rounded-xl border-white/10 bg-slate-900/60 hover:bg-slate-800/80 backdrop-blur-md px-6 py-3 text-sm"
            >
              <a
                href={getWhitepaperUrl(lang)}
                target="_blank"
                rel="noreferrer"
              >
                <BookOpen className="h-4 w-4 mr-2 text-purple-400" />
                {t.hero.btnWhitepaper}
                <ExternalLink className="h-3.5 w-3.5 ml-2 text-slate-400" />
              </a>
            </Button>
            <Button
              variant="outline"
              size="lg"
              asChild
              className="rounded-xl border-emerald-500/30 bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-300 backdrop-blur-md px-5 py-3 text-sm font-semibold"
            >
              <a
                href="https://solscan.io/token/79NqWzXcrKsUfwWSv9wP2ZFeLvmRkUPoWyv8fEFxJFh4"
                target="_blank"
                rel="noreferrer"
              >
                <ShieldCheck className="h-4 w-4 mr-2 text-emerald-400" />
                {lang === 'en' ? 'Solscan Verification' : 'Solscan 合约核验'}
              </a>
            </Button>
          </div>

          {/* 生产主网官方合约展示卡片 */}
          <div className="mt-10 max-w-2xl mx-auto rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 sm:p-5 backdrop-blur-md shadow-xl shadow-emerald-950/20 text-left">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  {lang === 'en' ? 'Solana Mainnet-Beta Official Contract' : 'Solana 生产主网官方合约'}
                </span>
                <Badge variant="purple" className="text-[10px] py-0">Token-2022</Badge>
                <span className="text-[10px] text-emerald-300/80 font-mono hidden sm:inline">100% Rug-Proof</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <a
                  href="https://explorer.solana.com/address/79NqWzXcrKsUfwWSv9wP2ZFeLvmRkUPoWyv8fEFxJFh4"
                  target="_blank"
                  rel="noreferrer"
                  className="text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1 transition-colors"
                >
                  Explorer <ExternalLink className="h-3 w-3" />
                </a>
                <span className="text-slate-600">|</span>
                <a
                  href="https://solscan.io/token/79NqWzXcrKsUfwWSv9wP2ZFeLvmRkUPoWyv8fEFxJFh4"
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 transition-colors"
                >
                  Solscan <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 bg-slate-900/90 border border-white/10 rounded-xl px-3.5 py-2.5 font-mono text-xs text-slate-200">
              <span className="truncate selection:bg-emerald-500 selection:text-black">
                79NqWzXcrKsUfwWSv9wP2ZFeLvmRkUPoWyv8fEFxJFh4
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText('79NqWzXcrKsUfwWSv9wP2ZFeLvmRkUPoWyv8fEFxJFh4');
                  setCopiedCa(true);
                  setTimeout(() => setCopiedCa(false), 2000);
                }}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 transition-colors font-sans text-xs font-medium cursor-pointer"
              >
                {copiedCa ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span>{lang === 'en' ? 'Copied' : '已复制'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>{lang === 'en' ? 'Copy CA' : '复制合约'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* 链上核心指标看板 (Card 组件) */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-20">
          
          {/* 指标卡 1: 总供应量 */}
          <div className="card-glass rounded-2xl p-6 relative overflow-hidden group">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-medium">{t.metrics.totalSupply}</span>
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Coins className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold font-mono text-slate-100 mb-2 tracking-tight">
              1,000,000,000
            </div>
            <div className="text-xs text-purple-400 font-mono flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
              {t.metrics.totalSupplySub}
            </div>
          </div>

          {/* 指标卡 2: 永久销毁率 */}
          <div className="card-glass card-glass-rose rounded-2xl p-6 relative overflow-hidden group">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-medium">{t.metrics.burnRate}</span>
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <Flame className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold font-mono text-rose-400 mb-2 tracking-tight">
              0.10%
            </div>
            <div className="text-xs text-rose-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              {t.metrics.burnRateSub}
            </div>
          </div>

          {/* 指标卡 3: 协议金库留存 */}
          <div className="card-glass card-glass-emerald rounded-2xl p-6 relative overflow-hidden group">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-medium">{t.metrics.treasuryRate}</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Landmark className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold font-mono text-emerald-400 mb-2 tracking-tight">
              0.10%
            </div>
            <div className="text-xs text-emerald-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              {t.metrics.treasuryRateSub}
            </div>
          </div>

          {/* 指标卡 4: 普通转账税率 */}
          <div className="card-glass card-glass-cyan rounded-2xl p-6 relative overflow-hidden group">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-medium">{t.metrics.transferTax}</span>
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <ArrowLeftRight className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold font-mono text-cyan-400 mb-2 tracking-tight">
              0.00%
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              {t.metrics.transferTaxSub}
            </div>
          </div>

        </section>

        {/* 三大核心价值支柱 (Bento Grid) */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          <div className="card-glass rounded-2xl p-7">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-5">
              <Bot className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-2.5">{t.features.f1Title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t.features.f1Desc}
            </p>
          </div>

          <div className="card-glass card-glass-emerald rounded-2xl p-7">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-2.5">{t.features.f2Title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t.features.f2Desc}
            </p>
          </div>

          <div className="card-glass card-glass-cyan rounded-2xl p-7">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-5">
              <TrendingDown className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-2.5">{t.features.f3Title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t.features.f3Desc}
            </p>
          </div>
        </section>

        {/* AI 平台官网收银台集成预览与 SDK Tabs */}
        <section className="card-glass rounded-3xl p-7 sm:p-10 mb-20">
          <div className="max-w-2xl mb-8">
            <Badge variant="success" className="mb-3">
              {t.showcase.badge}
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
              {t.showcase.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              {t.showcase.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            
            {/* 左侧：模拟 AI 平台官方收银台 */}
            <div className="bg-[#0b0c16]/90 border border-white/10 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08] mb-5 text-xs text-slate-400">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span className="ml-2 font-mono text-[11px] text-slate-400">{t.showcase.mockUrl}</span>
                </div>
                <Badge variant="outline" className="text-[10px] border-white/10">
                  {t.showcase.mockTag}
                </Badge>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-sm text-slate-200">{t.showcase.mockItem}</div>
                    <div className="text-[11px] text-slate-500">{t.showcase.mockCycle}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm text-slate-200">{t.showcase.mockPriceUsd}</div>
                    <div className="text-[11px] text-purple-400 font-mono">{t.showcase.mockPriceVctr}</div>
                  </div>
                </div>

                <div className="h-[1px] bg-white/[0.08] my-2" />

                <div className="space-y-3">
                  <div className="text-xs text-slate-400">{t.showcase.selectMethod}</div>

                  {/* 传统信用卡 (灰显对比) */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/40 border border-white/[0.06] opacity-50 text-xs">
                    <div className="flex items-center gap-2.5">
                      <CreditCard className="h-4 w-4 text-slate-400" />
                      <span>{t.showcase.methodCredit}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">{t.showcase.methodCreditSub}</span>
                  </div>

                  {/* Vectra Pay (高亮) */}
                  <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/50 flex items-center justify-between shadow-lg shadow-purple-900/20">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-emerald-400 flex items-center justify-center text-slate-950 font-bold">
                        <Zap className="h-4 w-4 fill-slate-950" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-100">{t.showcase.methodVectra}</div>
                        <div className="text-[10px] text-emerald-400">{t.showcase.methodVectraSub}</div>
                      </div>
                    </div>
                    <Button size="sm" onClick={handleOpenCheckout} className="text-xs font-semibold px-4 py-2">
                      {t.showcase.btnPayNow}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* 右侧：Tabs 展示 JS / Python 接入代码 */}
            <div>
              <Tabs defaultValue="js" className="w-full">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
                    <Code2 className="h-4 w-4 text-purple-400" />
                    <span>SDK Integration Code</span>
                  </div>
                  <TabsList className="bg-slate-900/80 border border-white/10">
                    <TabsTrigger value="js">{t.showcase.tabJs}</TabsTrigger>
                    <TabsTrigger value="py">{t.showcase.tabPy}</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="js" className="relative group">
                  <div className="bg-[#0b0c16]/95 border border-white/10 rounded-2xl p-5 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto shadow-2xl">
                    <div className="absolute top-4 right-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyCode('js')}
                        className="h-7 px-2 text-[10px] text-slate-400 hover:text-white bg-slate-800/60"
                      >
                        {copiedJs ? <Check className="h-3.5 w-3.5 text-emerald-400 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                        {copiedJs ? 'Copied' : 'Copy'}
                      </Button>
                    </div>
                    <span className="text-purple-400">import</span> &#123; VectraCheckout &#125; <span className="text-purple-400">from</span> <span className="text-emerald-300">'@vectra/pay-sdk'</span>;<br /><br />
                    <span className="text-slate-500">// Mount official Vectra Checkout button</span><br />
                    <span className="text-blue-400">const</span> checkout = <span className="text-purple-400">new</span> <span className="text-yellow-300">VectraCheckout</span>(&#123;<br />
                    &nbsp;&nbsp;merchantAddress: <span className="text-emerald-300">'DDngT11XyxqbYi38nNv1sDNxw1K4er1WHQb7EyAQhcgg'</span>,<br />
                    &nbsp;&nbsp;amountVctr: <span className="text-cyan-300">20.0</span>,<br />
                    &nbsp;&nbsp;orderId: <span className="text-emerald-300">'AI-SUB-20261021'</span>,<br />
                    &nbsp;&nbsp;onSuccess: (signature) =&gt; &#123;<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;console.log(<span className="text-emerald-300">'✅ Payment confirmed on Solana:'</span>, signature);<br />
                    &nbsp;&nbsp;&#125;<br />
                    &#123;);<br /><br />
                    checkout.<span className="text-blue-400">render</span>(<span className="text-emerald-300">'#vectra-pay-button'</span>);
                  </div>
                </TabsContent>

                <TabsContent value="py" className="relative group">
                  <div className="bg-[#0b0c16]/95 border border-white/10 rounded-2xl p-5 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto shadow-2xl">
                    <div className="absolute top-4 right-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyCode('py')}
                        className="h-7 px-2 text-[10px] text-slate-400 hover:text-white bg-slate-800/60"
                      >
                        {copiedPy ? <Check className="h-3.5 w-3.5 text-emerald-400 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                        {copiedPy ? 'Copied' : 'Copy'}
                      </Button>
                    </div>
                    <span className="text-purple-400">from</span> fastapi <span className="text-purple-400">import</span> FastAPI<br />
                    <span className="text-purple-400">from</span> vectra_pay <span className="text-purple-400">import</span> VectraHTTP402Middleware<br /><br />
                    app = <span className="text-yellow-300">FastAPI</span>()<br /><br />
                    <span className="text-slate-500"># Attach Vectra Decentralized HTTP 402 Middleware</span><br />
                    app.<span className="text-blue-400">add_middleware</span>(<br />
                    &nbsp;&nbsp;VectraHTTP402Middleware,<br />
                    &nbsp;&nbsp;merchant_address=<span className="text-emerald-300">"DDngT11XyxqbYi38nNv1sDNxw1K4er1WHQb7EyAQhcgg"</span>,<br />
                    &nbsp;&nbsp;price_per_call=<span className="text-cyan-300">0.05</span>  <span className="text-slate-500"># 0.05 $VCTR per model inference</span><br />
                    )
                  </div>
                </TabsContent>
              </Tabs>
            </div>

          </div>
        </section>

        {/* 发展路线图 (Roadmap Cards) */}
        <section className="mb-14">
          <div className="text-center max-w-xl mx-auto mb-10">
            <Badge variant="purple" className="mb-2">
              <Layers className="h-3 w-3 mr-1.5 inline" />
              {t.roadmap.badge}
            </Badge>
            <h2 className="text-2xl font-bold">{t.roadmap.title}</h2>
            <p className="text-xs text-slate-400">{t.roadmap.subtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card-glass border-purple-500/40 rounded-2xl p-6 relative">
              <div className="text-purple-400 font-bold text-xs mb-1 font-mono">{t.roadmap.p1Phase}</div>
              <h3 className="text-base font-bold text-slate-100 mb-2">{t.roadmap.p1Title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">{t.roadmap.p1Desc}</p>
              <Badge variant="success" className="text-[10px]">
                <Check className="h-3 w-3 mr-1 inline" />
                {t.roadmap.p1Status}
              </Badge>
            </div>

            <div className="card-glass rounded-2xl p-6">
              <div className="text-slate-500 font-bold text-xs mb-1 font-mono">{t.roadmap.p2Phase}</div>
              <h3 className="text-base font-bold text-slate-100 mb-2">{t.roadmap.p2Title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">{t.roadmap.p2Desc}</p>
              <Badge variant="outline" className="text-[10px] text-slate-400 border-white/10">
                {t.roadmap.p2Status}
              </Badge>
            </div>

            <div className="card-glass rounded-2xl p-6">
              <div className="text-slate-500 font-bold text-xs mb-1 font-mono">{t.roadmap.p3Phase}</div>
              <h3 className="text-base font-bold text-slate-100 mb-2">{t.roadmap.p3Title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">{t.roadmap.p3Desc}</p>
              <Badge variant="outline" className="text-[10px] text-slate-400 border-white/10">
                {t.roadmap.p3Status}
              </Badge>
            </div>
          </div>
        </section>

      </main>

      {/* 支付模拟确认弹窗 (shadcn Dialog 组件) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md bg-[#0b0c16]/95 border-white/10 backdrop-blur-2xl">
          <DialogHeader>
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-emerald-400 flex items-center justify-center text-slate-950 font-bold">
                <Zap className="h-5 w-5 fill-slate-950" />
              </div>
              <div>
                <DialogTitle>{t.modal.title}</DialogTitle>
                <DialogDescription>{t.modal.subtitle}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {!payResult ? (
            <div className="space-y-4">
              <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4">
                <div className="text-xs text-slate-400 mb-1">{t.modal.serviceLabel}</div>
                <div className="font-semibold text-sm text-slate-200">{t.modal.serviceName}</div>
                <div className="mt-3 flex items-baseline justify-between border-t border-white/[0.08] pt-3">
                  <span className="text-xs text-slate-400">{t.modal.amountDue}</span>
                  <span className="text-2xl font-bold font-mono text-purple-400">20.0 $VCTR</span>
                </div>
              </div>

              {/* 0.20% 费率拆解展示 */}
              <div className="bg-purple-950/30 border border-purple-800/40 rounded-xl p-3.5 text-xs space-y-1.5 font-mono">
                <div className="flex justify-between text-purple-300 font-semibold mb-1">
                  <span>{t.modal.feeSplitTitle}</span>
                  <span>0.040 $VCTR</span>
                </div>
                <div className="flex justify-between text-rose-400">
                  <span>{t.modal.feeBurn}</span>
                  <span>0.020 $VCTR</span>
                </div>
                <div className="flex justify-between text-emerald-400">
                  <span>{t.modal.feeTreasury}</span>
                  <span>0.020 $VCTR</span>
                </div>
              </div>

              <Button
                size="lg"
                onClick={handleExecutePayment}
                disabled={isPaying}
                className="w-full rounded-xl"
              >
                {isPaying ? t.modal.btnConfirming : t.modal.btnConfirm}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          ) : (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 bg-emerald-500/20 border border-emerald-500 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-100">{t.modal.successTitle}</h4>
                <p className="text-xs text-slate-400 mt-1">{t.modal.successSubtitle}</p>
              </div>
              <Button variant="link" asChild className="text-purple-400">
                <a href={payResult.solanaExplorerUrl} target="_blank" rel="noreferrer">
                  {t.modal.viewExplorer}
                  <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                </a>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 页脚 (Footer) */}
      <footer className="border-t border-white/[0.08] bg-[#030712]/80 py-8 text-xs text-slate-500 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>{t.footer.copyright}</div>
          <div className="flex flex-wrap items-center gap-5 text-slate-400">
            <a href={GITHUB_REPO} target="_blank" rel="noreferrer" className="hover:text-white flex items-center transition-colors">
              <Code2 className="h-3.5 w-3.5 mr-1 text-slate-400" />
              {t.footer.openProtocol}
            </a>
            <a href={getPitchDeckUrl()} target="_blank" rel="noreferrer" className="hover:text-white flex items-center transition-colors">
              <Presentation className="h-3.5 w-3.5 mr-1 text-cyan-400" />
              {t.footer.pitchDeck}
            </a>
            <a href={getWhitepaperUrl('zh')} target="_blank" rel="noreferrer" className="hover:text-white flex items-center transition-colors">
              <BookOpen className="h-3.5 w-3.5 mr-1 text-purple-400" />
              {t.footer.whitepaperCn}
            </a>
            <a href={getWhitepaperUrl('en')} target="_blank" rel="noreferrer" className="hover:text-white flex items-center transition-colors">
              <BookOpen className="h-3.5 w-3.5 mr-1 text-purple-400" />
              {t.footer.whitepaperEn}
            </a>
            <a href="https://solana.com" target="_blank" rel="noreferrer" className="hover:text-white flex items-center transition-colors">
              <ExternalLink className="h-3 w-3 mr-1 text-emerald-400" />
              {t.footer.solanaEco}
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}
