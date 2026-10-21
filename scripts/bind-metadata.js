// scripts/bind-metadata.js
// 为 Vectra ($VCTR) 写入链上 Metaplex 元数据，使 Phantom 钱包正式显示名称与代号

const { setGlobalDispatcher, ProxyAgent } = require('undici');
try {
  setGlobalDispatcher(new ProxyAgent('http://127.0.0.1:7897'));
} catch (e) {}

const { createUmi } = require('@metaplex-foundation/umi-bundle-defaults');
const {
  mplTokenMetadata,
  createMetadataAccountV3,
  findMetadataPda,
} = require('@metaplex-foundation/mpl-token-metadata');
const { fromWeb3JsKeypair } = require('@metaplex-foundation/umi-web3js-adapters');
const { keypairIdentity, publicKey } = require('@metaplex-foundation/umi');
const { Keypair } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('======================================================================');
  console.log('🏷️ 开始为 Vectra ($VCTR) 写入链上元数据 (名称: Vectra, 符号: VCTR)...');
  console.log('======================================================================');

  const keyFilePath = path.join(__dirname, '..', 'config', 'keys.json');
  const deployFilePath = path.join(__dirname, '..', 'config', 'deployment.json');

  const keys = JSON.parse(fs.readFileSync(keyFilePath, 'utf-8'));
  const deploy = JSON.parse(fs.readFileSync(deployFilePath, 'utf-8'));

  const web3Founder = Keypair.fromSecretKey(Uint8Array.from(keys.founderSecretKey));
  const mintAddress = deploy.vectraMintAddress;

  console.log('🪙 目标代币 Mint 地址:', mintAddress);
  console.log('👤 创始人权限签名者:', web3Founder.publicKey.toBase58());

  // 初始化 Umi 并注入创始人身份
  const umi = createUmi('https://api.devnet.solana.com').use(mplTokenMetadata());
  const umiFounder = fromWeb3JsKeypair(web3Founder);
  umi.use(keypairIdentity(umiFounder));

  const mint = publicKey(mintAddress);
  const metadataPda = findMetadataPda(umi, { mint });

  console.log('📍 链上 Metaplex 账户 PDA 地址:', metadataPda.toString());

  console.log('📡 正在向 Solana 链广播创建元数据交易...');

  const tx = createMetadataAccountV3(umi, {
    metadata: metadataPda,
    mint: mint,
    mintAuthority: umi.identity,
    payer: umi.identity,
    updateAuthority: umi.identity.publicKey,
    data: {
      name: 'Vectra',
      symbol: 'VCTR',
      uri: 'https://raw.githubusercontent.com/vectra-protocol/assets/main/metadata.json',
      sellerFeeBasisPoints: 0,
      creators: null,
      collection: null,
      uses: null,
    },
    isMutable: true,
    collectionDetails: null,
  });

  const result = await tx.sendAndConfirm(umi);
  console.log('======================================================================');
  console.log('🎉 链上元数据写入成功！');
  console.log('======================================================================');
  console.log('🏷️ 代币官方名称: Vectra');
  console.log('🔤 代币官方代码: VCTR');
  console.log('🔍 查看 Metaplex 链上数据: https://explorer.solana.com/address/' + metadataPda.toString() + '?cluster=devnet');
  console.log('======================================================================\n');
}

main().catch((err) => {
  console.error('❌ 执行失败:', err);
});
