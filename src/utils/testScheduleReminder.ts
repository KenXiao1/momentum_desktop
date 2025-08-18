/**
 * 手动测试预约提醒功能
 * 仅用于开发测试，生产环境中不会使用
 */

import { scheduleTimerManager } from './scheduleTimer';
import { notificationManager } from './notifications';

export const testScheduleReminder = () => {
  console.log('🧪 开始测试预约提醒功能...');

  // 检查通知权限
  if (!notificationManager.isSupported()) {
    console.error('❌ 浏览器不支持通知功能');
    return;
  }

  if (!notificationManager.isNotificationsEnabled()) {
    console.warn('⚠️ 通知功能未启用，请先启用桌面通知');
    return;
  }

  // 测试1：立即触发3分钟警告（设置2分钟后过期）
  const testChain1 = {
    id: 'test-reminder-1',
    name: '测试任务-2分钟后过期',
    expiresAt: new Date(Date.now() + 2 * 60 * 1000) // 2分钟后过期
  };

  scheduleTimerManager.addSchedule(
    testChain1.id,
    testChain1.name,
    testChain1.expiresAt
  );

  console.log(`✅ 添加了测试任务1: ${testChain1.name}`);
  console.log(`📅 过期时间: ${testChain1.expiresAt.toLocaleString()}`);
  console.log(`⏱️ 剩余时间: ${scheduleTimerManager.formatRemainingTime(testChain1.id)}`);
  console.log(`🔔 应该立即收到3分钟提醒通知`);

  // 测试2：30秒后过期的任务（测试过期通知）
  const testChain2 = {
    id: 'test-reminder-2',
    name: '测试任务-30秒后过期',
    expiresAt: new Date(Date.now() + 30 * 1000) // 30秒后过期
  };

  scheduleTimerManager.addSchedule(
    testChain2.id,
    testChain2.name,
    testChain2.expiresAt
  );

  console.log(`✅ 添加了测试任务2: ${testChain2.name}`);
  console.log(`📅 过期时间: ${testChain2.expiresAt.toLocaleString()}`);
  console.log(`⏱️ 剩余时间: ${scheduleTimerManager.formatRemainingTime(testChain2.id)}`);
  console.log(`🔔 应该在30秒后收到过期通知`);

  // 设置过期回调
  scheduleTimerManager.setOnExpiredCallback((chainId: string) => {
    console.log(`🚨 任务过期回调被触发: ${chainId}`);
  });

  // 5分钟后自动清理测试数据
  setTimeout(() => {
    scheduleTimerManager.removeSchedule(testChain1.id);
    scheduleTimerManager.removeSchedule(testChain2.id);
    console.log('🧹 测试数据已清理');
  }, 5 * 60 * 1000);

  console.log('');
  console.log('📝 测试说明:');
  console.log('1. 你应该立即收到第一个任务的3分钟提醒通知');
  console.log('2. 你应该在30秒后收到第二个任务的过期通知');
  console.log('3. 通知会自动显示在桌面右上角');
  console.log('4. 点击通知可以聚焦到应用窗口');
  console.log('5. 测试数据会在5分钟后自动清理');
  console.log('');
  console.log('🎯 如果收到了预期的通知，说明功能正常工作！');
};

// 在开发环境中添加到全局对象，方便控制台调用
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).testScheduleReminder = testScheduleReminder;
  console.log('🔧 开发工具已加载，可在控制台执行 testScheduleReminder() 进行测试');
}
