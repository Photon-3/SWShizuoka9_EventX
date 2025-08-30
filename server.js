// server.js

const express = require('express');
const app = express();
const path = require('path');
const PORT = 3000;

// JSON形式のリクエストボディを扱えるようにする
app.use(express.json());
// 静的ファイル（HTMLやCSS）を配信するフォルダを指定
app.use(express.static(path.join(__dirname, 'public')));

// --- データストア（簡易的なデータベースの代わり） ---
// 本来はデータベースで管理しますが、今回はサーバーのメモリ上で管理します
const events = {}; // イベント情報を格納するオブジェクト
const booths = {}; // 出店情報を格納するオブジェクト

// --- ヘルパー関数 ---
// ランダムなIDを生成する関数
const generateId = (length = 8) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
};

// --- APIエンドポイント ---

// 1. 新しいイベント（祭）を作成するAPI
app.post('/api/events', (req, res) => {
    const { eventName } = req.body;
    if (!eventName) {
        return res.status(400).json({ error: 'イベント名が必要です' });
    }

    const adminId = generateId(10); // 管理用ID
    const publicId = generateId(6);  // 公開用ID

    const newEvent = {
        eventName,
        adminId,
        publicId,
        booths: [] // このイベントに属する出店のIDリスト
    };

    events[adminId] = newEvent;
    console.log(`[イベント作成] ${eventName} (管理ID: ${adminId})`);

    res.status(201).json({ adminId, publicId });
});

// 2. 特定のイベントに出店を登録するAPI
app.post('/api/events/:adminId/booths', (req, res) => {
    const { adminId } = req.params;
    const { boothName, location } = req.body;

    const event = events[adminId];
    if (!event) {
        return res.status(404).json({ error: 'イベントが見つかりません' });
    }

    if (!boothName || !location) {
        return res.status(400).json({ error: '出店名と場所は必須です' });
    }

    const boothId = generateId(12);
    const newBooth = {
        id: boothId,
        name: boothName,
        location: location,
        congestion: 1, // 1:空き, 2:やや混雑, 3:混雑
        eventId: adminId
    };

    booths[boothId] = newBooth;
    event.booths.push(boothId);
    console.log(`[出店登録] ${boothName} (イベント: ${event.eventName})`);


    res.status(201).json(newBooth);
});

// 3. 出店の混雑度を更新するAPI
app.put('/api/booths/:boothId', (req, res) => {
    const { boothId } = req.params;
    const { congestion } = req.body; // 1, 2, or 3

    const booth = booths[boothId];
    if (!booth) {
        return res.status(404).json({ error: '出店が見つかりません' });
    }

    if (![1, 2, 3].includes(congestion)) {
        return res.status(400).json({ error: '無効な混雑度です' });
    }

    booth.congestion = congestion;
    console.log(`[混雑度更新] ${booth.name} -> ${congestion}`);

    res.status(200).json(booth);
});


// 4. 来場者向けに公開イベント情報を取得するAPI
app.get('/api/events/:publicId', (req, res) => {
    const { publicId } = req.params;
    // publicIdからadminIdを逆引きする
    const adminId = Object.keys(events).find(key => events[key].publicId === publicId);
    const event = events[adminId];

    if (!event) {
        return res.status(404).json({ error: 'イベントが見つかりません' });
    }

    // 出店情報の詳細を取得
    const boothDetails = event.booths.map(boothId => booths[boothId]);

    res.status(200).json({
        eventName: event.eventName,
        booths: boothDetails
    });
});

// 5. 管理者向けにイベント情報を取得するAPI
app.get('/api/manage/:adminId', (req, res) => {
    const { adminId } = req.params;
    const event = events[adminId];

    if (!event) {
        return res.status(404).json({ error: 'イベントが見つかりません' });
    }

    const boothDetails = event.booths.map(boothId => booths[boothId]);

    res.status(200).json({
        eventName: event.eventName,
        publicId: event.publicId,
        booths: boothDetails
    });
});


// --- サーバー起動 ---
app.listen(PORT, () => {
    console.log(`サーバーが http://localhost:${PORT} で起動しました`);
});