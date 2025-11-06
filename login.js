const axios = require('axios');
const { chromium } = require('playwright');

const token = process.env.BOT_TOKEN;
const chatId = process.env.CHAT_ID;
const accounts = (process.env.ACCOUNTS || "").split(",")
  .filter(x => x.trim())
  .map(item => {
    const [user, pass] = item.split(":");
    return { user: user?.trim(), pass: pass?.trim() };
  })
  .filter(acc => acc.user && acc.pass);

async function sendTelegram(message) {
  if (!token || !chatId) return;

  const now = new Date();
  const hkTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  const timeStr = hkTime.toISOString().replace('T', ' ').substr(0, 19) + " HKT";

  const fullMessage = `📌 Netlib 保活\n🕒 ${timeStr}\n\n${message}`;

  try {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text: fullMessage
    }, { timeout: 10000 });
    console.log('✅ Telegram 通知发送成功');
  } catch (e) {
    console.log('⚠️ Telegram 发送失败');
  }
}

async function main() {
  if (accounts.length === 0) {
    await sendTelegram('❌ 未配置账号');
    return;
  }

  console.log(`找到 ${accounts.length} 个账号`);
  let results = [];

  const browser = await chromium.launch({ headless: true });
  
  for (const { user, pass } of accounts) {
    try {
      const page = await browser.newPage();
      await page.goto('https://www.netlib.re/');
      await page.waitForTimeout(3000);
      
      await page.click('text=Login');
      await page.waitForTimeout(2000);
      
      await page.fill('input[name="username"]', user);
      await page.fill('input[name="password"]', pass);
      await page.click('button:has-text("Validate")');
      
      await page.waitForTimeout(5000);
      
      if (await page.$('text=exclusive owner')) {
        results.push(`✅ ${user}`);
        console.log(`${user} 登录成功`);
      } else {
        results.push(`❌ ${user}`);
        console.log(`${user} 登录失败`);
      }
      
      await page.close();
    } catch (e) {
      results.push(`❌ ${user} (错误)`);
      console.log(`${user} 登录异常: ${e.message}`);
    }
    
    await new Promise(r => setTimeout(r, 2000));
  }
  
  await browser.close();
  const message = `处理完成:\n${results.join('\n')}`;
  await sendTelegram(message);
}

main().catch(console.error);
