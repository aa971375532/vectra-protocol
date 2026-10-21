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
  // 默认英文 (English by default as requested)
  const [lang, setLang] = useState('en');
  const t = translations[lang];

  // 钱包真实连接状态
  const [walletAddress, setWalletAddress] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // 模拟支付弹窗状态
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [payResult, setPayResult] = useState(null);

  // 初始化监听 Phantom 钱包事件
  useEffect(() => {
    if (typeof window !== 'undefined' && window.solana) {
      if (window.solana.isConnected && window.solana.publicKey) {
        setWalletAddress(window.solana.publicKey.toString());
      }

      const handleAccountChange = (publicKey) => {
        if (publicKey) {
          setWalletAddress(publicKey.toString());
        } else {
          setWalletAddress(null);
        }
      };

      const handleDisconnect = () => {
        setWalletAddress(null);
      };

      window.solana.on('accountChanged', handleAccountChange);
      window.solana.on('disconnect', handleDisconnect);

      return () => {
        window.solana.removeListener('accountChanged', handleAccountChange);
        window.solana.removeListener('disconnect', handleDisconnect);
      };
    }
  }, []);

  // 真实连接 Phantom 钱包
  const connectWallet = async () => {
    if (typeof window === 'undefined') return;

    if (!window.solana || !window.solana.isPhantom) {
      alert(
        lang === 'en'
          ? '⚠️ Phantom wallet extension not detected! Opening download page...'
          : '⚠️ 未检测到 Phantom 钱包扩展，正在为你打开官网...'
      );
      window.open('https://phantom.app/', '_blank');
      return;
    }

    if (walletAddress) {
      try {
        await window.solana.disconnect();
        setWalletAddress(null);
      } catch (err) {
        console.error('Disconnect error:', err);
      }
      return;
    }

    try {
      setIsConnecting(true);
      const resp = await window.solana.connect();
      setWalletAddress(resp.publicKey.toString());
    } catch (err) {
      console.warn('User rejected connection:', err);
    } finally {
      setIsConnecting(false);
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

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-purple-600 selection:text-white bg-[#090a0f] text-slate-100">
      
      {/* 顶部导航栏 (Navbar) */}
      <header className="border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Zap className="h-5 w-5 text-slate-950 font-bold fill-slate-950" />
            </div>
            <div>
              <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-purple-400 to-emerald-400 bg-clip-text text-transparent">
                VECTRA
              </span>
              <Badge variant="purple" className="ml-2 font-mono text-[10px]">
                Token-2022
              </Badge>
            </div>
          </div>

          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Solana Devnet 状态徽章 */}
            <div className="hidden sm:flex items-center space-x-2 text-xs bg-secondary/80 border border-border px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-muted-foreground">{t.nav.networkBadge}</span>
            </div>

            {/* 中英文无缝切换按钮 (English / 中文) */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}
              className="text-xs font-semibold px-3 py-1 rounded-full border-border hover:bg-secondary"
            >
              <Globe className="h-3.5 w-3.5 mr-1.5 text-purple-400" />
              {lang === 'en' ? '中文' : 'English'}
            </Button>

            {/* 真实 Phantom 钱包连接按钮 */}
            <Button
              variant="default"
              size="sm"
              onClick={connectWallet}
              disabled={isConnecting}
              className="rounded-xl font-medium"
            >
              <Wallet className="h-4 w-4 mr-1.5" />
              {walletAddress
                ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)} (${t.nav.connected})`
                : t.nav.connectWallet}
            </Button>
          </div>
        </div>
      </header>

      {/* 主体内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full">
        
        {/* Hero 区域 */}
        <section className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="purple" className="mb-4 px-3.5 py-1 text-xs">
            <Sparkles className="h-3 w-3 mr-1.5 inline" />
            {t.hero.badge}
          </Badge>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
            {t.hero.titleLine1} <br />
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-emerald-400 bg-clip-text text-transparent">
              {t.hero.titleLine2}
            </span>
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mb-8">
            {t.hero.subtitle}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={handleOpenCheckout}
              className="rounded-xl shadow-lg shadow-purple-600/30"
            >
              {t.hero.btnSimulate}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              asChild
              className="rounded-xl border-border hover:bg-secondary"
            >
              <a
                href={lang === 'en' ? '/VECTRA_WHITEPAPER_EN.md' : '/VECTRA_WHITEPAPER_CN.md'}
                target="_blank"
                rel="noreferrer"
              >
                {t.hero.btnWhitepaper}
                <ExternalLink className="h-4 w-4 ml-2 text-muted-foreground" />
              </a>
            </Button>
          </div>
        </section>

        {/* 链上核心指标看板 (Card 组件) */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          <Card className="glow-solana">
            <CardHeader className="p-5 pb-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>{t.metrics.totalSupply}</span>
                <Coins className="h-4 w-4 text-purple-400" />
              </div>
              <CardTitle className="text-2xl font-bold font-mono">1,000,000,000</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <span className="text-xs text-purple-400 font-mono">{t.metrics.totalSupplySub}</span>
            </CardContent>
          </Card>

          <Card className="glow-solana">
            <CardHeader className="p-5 pb-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>{t.metrics.burnRate}</span>
                <Flame className="h-4 w-4 text-rose-500" />
              </div>
              <CardTitle className="text-2xl font-bold font-mono text-rose-400">0.10%</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <span className="text-xs text-rose-500">{t.metrics.burnRateSub}</span>
            </CardContent>
          </Card>

          <Card className="glow-solana">
            <CardHeader className="p-5 pb-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>{t.metrics.treasuryRate}</span>
                <Landmark className="h-4 w-4 text-emerald-400" />
              </div>
              <CardTitle className="text-2xl font-bold font-mono text-emerald-400">0.10%</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <span className="text-xs text-emerald-500">{t.metrics.treasuryRateSub}</span>
            </CardContent>
          </Card>

          <Card className="glow-solana">
            <CardHeader className="p-5 pb-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>{t.metrics.transferTax}</span>
                <Percent className="h-4 w-4 text-cyan-400" />
              </div>
              <CardTitle className="text-2xl font-bold font-mono text-cyan-400">0.00%</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <span className="text-xs text-muted-foreground">{t.metrics.transferTaxSub}</span>
            </CardContent>
          </Card>
        </section>

        {/* 三大核心支柱 (Card 组件) */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <Card className="p-6">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4">
              <Bot className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold mb-2">{t.features.f1Title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t.features.f1Desc}
            </p>
          </Card>

          <Card className="p-6">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
              <Globe className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold mb-2">{t.features.f2Title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t.features.f2Desc}
            </p>
          </Card>

          <Card className="p-6">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold mb-2">{t.features.f3Title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t.features.f3Desc}
            </p>
          </Card>
        </section>

        {/* AI 平台官网收银台集成预览与 SDK Tabs */}
        <section className="bg-card border border-border rounded-3xl p-6 sm:p-8 mb-16 shadow-xl">
          <div className="max-w-2xl mb-8">
            <Badge variant="success" className="mb-3">
              {t.showcase.badge}
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">
              {t.showcase.title}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {t.showcase.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            
            {/* 左侧：模拟 AI 平台官方收银台 */}
            <Card className="bg-[#0b0c14] border-border/80 p-5 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-border mb-4 text-xs text-muted-foreground">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span className="ml-2 font-mono text-[11px]">{t.showcase.mockUrl}</span>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {t.showcase.mockTag}
                </Badge>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-sm">{t.showcase.mockItem}</div>
                    <div className="text-[11px] text-muted-foreground">{t.showcase.mockCycle}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm">{t.showcase.mockPriceUsd}</div>
                    <div className="text-[11px] text-purple-400 font-mono">{t.showcase.mockPriceVctr}</div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2.5">
                  <div className="text-xs text-muted-foreground">{t.showcase.selectMethod}</div>

                  {/* 传统信用卡 (灰显对比) */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border opacity-50 text-xs">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      <span>{t.showcase.methodCredit}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{t.showcase.methodCreditSub}</span>
                  </div>

                  {/* Vectra Pay (高亮) */}
                  <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-emerald-400 flex items-center justify-center text-slate-950 font-bold">
                        <Zap className="h-4 w-4 fill-slate-950" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-100">{t.showcase.methodVectra}</div>
                        <div className="text-[10px] text-emerald-400">{t.showcase.methodVectraSub}</div>
                      </div>
                    </div>
                    <Button size="sm" onClick={handleOpenCheckout} className="text-xs">
                      {t.showcase.btnPayNow}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* 右侧：shadcn Tabs 组件展示 JS/Python 接入代码 */}
            <div>
              <Tabs defaultValue="js" className="w-full">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-muted-foreground font-mono flex items-center gap-1.5">
                    <Code2 className="h-4 w-4 text-purple-400" />
                    <span>SDK Integration Code</span>
                  </div>
                  <TabsList>
                    <TabsTrigger value="js">{t.showcase.tabJs}</TabsTrigger>
                    <TabsTrigger value="py">{t.showcase.tabPy}</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="js">
                  <div className="bg-[#0b0c14] border border-border rounded-2xl p-5 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto shadow-inner">
                    <span className="text-purple-400">import</span> &#123; VectraCheckout &#125; <span className="text-purple-400">from</span> <span className="text-emerald-300">'@vectra/pay-sdk'</span>;<br /><br />
                    <span className="text-muted-foreground">// Mount official Vectra Checkout button</span><br />
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

                <TabsContent value="py">
                  <div className="bg-[#0b0c14] border border-border rounded-2xl p-5 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto shadow-inner">
                    <span className="text-purple-400">from</span> fastapi <span className="text-purple-400">import</span> FastAPI<br />
                    <span className="text-purple-400">from</span> vectra_pay <span className="text-purple-400">import</span> VectraHTTP402Middleware<br /><br />
                    app = <span className="text-yellow-300">FastAPI</span>()<br /><br />
                    <span className="text-muted-foreground"># Attach Vectra Decentralized HTTP 402 Middleware</span><br />
                    app.<span className="text-blue-400">add_middleware</span>(<br />
                    &nbsp;&nbsp;VectraHTTP402Middleware,<br />
                    &nbsp;&nbsp;merchant_address=<span className="text-emerald-300">"DDngT11XyxqbYi38nNv1sDNxw1K4er1WHQb7EyAQhcgg"</span>,<br />
                    &nbsp;&nbsp;price_per_call=<span className="text-cyan-300">0.05</span>  <span className="text-muted-foreground"># 0.05 $VCTR per model inference</span><br />
                    )
                  </div>
                </TabsContent>
              </Tabs>
            </div>

          </div>
        </section>

        {/* 发展路线图 (Roadmap Cards) */}
        <section className="mb-10">
          <div className="text-center max-w-xl mx-auto mb-10">
            <Badge variant="purple" className="mb-2">
              <Layers className="h-3 w-3 mr-1.5 inline" />
              {t.roadmap.badge}
            </Badge>
            <h2 className="text-2xl font-bold">{t.roadmap.title}</h2>
            <p className="text-xs text-muted-foreground">{t.roadmap.subtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 border-purple-500/30">
              <div className="text-purple-400 font-bold text-xs mb-1 font-mono">{t.roadmap.p1Phase}</div>
              <h3 className="text-base font-bold mb-2">{t.roadmap.p1Title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">{t.roadmap.p1Desc}</p>
              <Badge variant="success" className="text-[10px]">
                <Check className="h-3 w-3 mr-1 inline" />
                {t.roadmap.p1Status}
              </Badge>
            </Card>

            <Card className="p-6">
              <div className="text-muted-foreground font-bold text-xs mb-1 font-mono">{t.roadmap.p2Phase}</div>
              <h3 className="text-base font-bold mb-2">{t.roadmap.p2Title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">{t.roadmap.p2Desc}</p>
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                {t.roadmap.p2Status}
              </Badge>
            </Card>

            <Card className="p-6">
              <div className="text-muted-foreground font-bold text-xs mb-1 font-mono">{t.roadmap.p3Phase}</div>
              <h3 className="text-base font-bold mb-2">{t.roadmap.p3Title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">{t.roadmap.p3Desc}</p>
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                {t.roadmap.p3Status}
              </Badge>
            </Card>
          </div>
        </section>

      </main>

      {/* 支付模拟确认弹窗 (shadcn Dialog 组件) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
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
              <div className="bg-secondary/40 border border-border rounded-2xl p-4">
                <div className="text-xs text-muted-foreground mb-1">{t.modal.serviceLabel}</div>
                <div className="font-semibold text-sm">{t.modal.serviceName}</div>
                <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
                  <span className="text-xs text-muted-foreground">{t.modal.amountDue}</span>
                  <span className="text-2xl font-bold font-mono text-purple-400">20.0 $VCTR</span>
                </div>
              </div>

              {/* 0.20% 费率拆解展示 */}
              <div className="bg-purple-950/20 border border-purple-800/40 rounded-xl p-3.5 text-xs space-y-1.5 font-mono">
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
                <h4 className="text-lg font-bold">{t.modal.successTitle}</h4>
                <p className="text-xs text-muted-foreground mt-1">{t.modal.successSubtitle}</p>
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
      <footer className="border-t border-border bg-card/40 py-8 text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>{t.footer.copyright}</div>
          <div className="flex space-x-6 text-muted-foreground">
            <a href="https://github.com/aa971375532/vectra-protocol" target="_blank" rel="noreferrer" className="hover:text-foreground">
              {t.footer.openProtocol}
            </a>
            <a href="/PITCH_DECK.md" target="_blank" rel="noreferrer" className="hover:text-foreground">
              {t.footer.pitchDeck}
            </a>
            <a href="/VECTRA_WHITEPAPER_CN.md" target="_blank" rel="noreferrer" className="hover:text-foreground">
              {t.footer.whitepaperCn}
            </a>
            <a href="/VECTRA_WHITEPAPER_EN.md" target="_blank" rel="noreferrer" className="hover:text-foreground">
              {t.footer.whitepaperEn}
            </a>
            <a href="https://solana.com" target="_blank" rel="noreferrer" className="hover:text-foreground">
              {t.footer.solanaEco}
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}
