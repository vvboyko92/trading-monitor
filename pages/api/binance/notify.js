// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { WebSocket } from 'ws';
import axios from 'axios';

export default function monitorPrice(req, res) {
  const {
    symbol,
    chatId,
    ...notifications
  } = req.body;

  const notificationSettings = {};
  let totalNotificationCount = 0;
  for (const [key, value] of Object.entries(notifications)) {
    notificationSettings[key] = {count: parseInt(process.env.NOTIFICATION_COUNT), notified: false};
    totalNotificationCount += parseInt(process.env.NOTIFICATION_COUNT);
  }

  const ws = new WebSocket(`wss://fstream.binance.com/ws/${symbol}@aggTrade`);
  const sendNotification = (currentPrice, timeoutHandler, countDown) => {
    countDown();
    timeoutHandler(true);
    axios.get(`${process.env.TRADING_AGENT_API_HOST}/telegram/binance/notify`, {
      params: {
        price: currentPrice,
        symbol,
        chatId,
      },
    });
    setTimeout(() => {
      timeoutHandler(false)
    }, process.env.NOTIFICATION_TIMEOUT);
  }

  const shouldNotify = obj => {
    return Function('"use strict";return (' + obj + ')')();
  }

  ws.on('message', function message(data) {
    const currentPrice = parseFloat(JSON.parse(data).p);
    for (const [key, value] of Object.entries(notifications)) {
      let notifyString = value.formula.replace(/\[value]/igm, value.value);
      notifyString = notifyString.replace(/\[currentPrice]/igm, currentPrice);
      if (shouldNotify(notifyString) && !notificationSettings[key].notified && notificationSettings[key].count > 0) {
        sendNotification(
            currentPrice,
            boolState => { notificationSettings[key].notified = boolState; },
            () => { notificationSettings[key].count--; totalNotificationCount--}
        );
      }
    }
    if (totalNotificationCount <= 0) {
      ws.close();
    }
  });

  ws.on('ping', () => {
    ws.pong();
  });

  res.status(200).json({ status: 'Ok' })
}
