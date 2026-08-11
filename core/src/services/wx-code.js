/**
 * 微信账号 Code 刷新服务（免扫码）
 * 通过 yyb-adapter 调用 yyb-go /wxapp/getCode 获取新的 wx.login code，
 * 并写回账号存储。供 HTTP 接口（admin.js）和运行时（worker-manager.js）复用。
 */

const fetch = require('node-fetch');
const store = require('../models/store');

async function refreshAccountCode(accountId) {
    const data = store.getAccounts ? store.getAccounts() : { accounts: [] };
    const accounts = Array.isArray(data.accounts) ? data.accounts : [];
    const target = accounts.find(a =>
        String(a.id) === String(accountId)
        || String(a.uin || '') === String(accountId)
        || String(a.qq || '') === String(accountId),
    );
    if (!target) {
        throw new Error('账号不存在');
    }
    if (String(target.platform || 'qq') !== 'wx') {
        throw new Error('仅支持微信账号刷新 Code');
    }

    const wxid = String(target.wxid || target.openid || '').trim();
    if (!wxid) {
        throw new Error('该账号未绑定微信 OpenID，请先在编辑弹窗中填写');
    }

    // 读取全局微信配置（面板里保存的 apiKey / proxyApiUrl / appId）
    const wxConfig = store.getGlobalWxConfig();
    const apiKey = String(wxConfig.apiKey || process.env.WX_PROXY_API_KEY || '').trim();
    const proxyApiUrl = String(wxConfig.proxyApiUrl || process.env.WX_PROXY_API_URL || 'http://127.0.0.1:8059/api').trim();
    const appId = String(wxConfig.appId || process.env.WX_PROXY_APP_ID || 'wx5306c5978fdb76e4').trim();

    if (!apiKey) {
        throw new Error('未配置 API 密钥，请在微信配置中填写');
    }

    const url = `${proxyApiUrl}?api_key=${encodeURIComponent(apiKey)}&action=jslogin`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wxid, appid: appId }),
    });
    const result = await response.json();

    if (!result || result.code !== 0 || !result.data || !result.data.code) {
        throw new Error((result && result.msg) || '获取 Code 失败');
    }

    const newCode = String(result.data.code);
    // 写回账号（保留 wxid/openid，避免覆盖）
    store.addOrUpdateAccount({
        id: String(target.id),
        code: newCode,
        wxid,
        openid: target.openid || wxid,
        platform: 'wx',
    });

    return { code: newCode, account: { ...target, code: newCode } };
}

module.exports = { refreshAccountCode };
