/**
 * 规则选择对话框组件 - 重构版本
 * 用于在暂停或提前完成任务时选择适用的例外规则
 * 
 * 主要改进：
 * - 移除全局规则支持，只显示链专属规则
 * - 优化布局稳定性，防止抖动
 * - 集成搜索优化器和缓存管理器
 * - 使用乐观更新提升响应速度
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  ExceptionRule, 
  ExceptionRuleType, 
  SessionContext,
  PauseOptions
} from '../types';
import { RuleSearchOptimizer, SearchResult } from '../utils/ruleSearchOptimizer';
import { ExceptionRuleCache } from '../utils/exceptionRuleCache';
import { useLayoutStability } from '../utils/LayoutStabilityMonitor';

import { VirtualizedRuleList } from './VirtualizedRuleList';
import { ConfirmationDialog } from './ConfirmationDialog';
import { exceptionRuleManager } from '../services/ExceptionRuleManager';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Search, 
  X
} from 'lucide-react';

interface RuleSelectionDialogProps {
  isOpen: boolean;
  actionType: 'pause' | 'early_completion';
  sessionContext: SessionContext;
  onRuleSelected: (rule: ExceptionRule, pauseOptions?: PauseOptions) => void;
  onCreateNewRule: (name: string, type: ExceptionRuleType) => void;
  onCancel: () => void;
}

export const RuleSelectionDialog: React.FC<RuleSelectionDialogProps> = ({
  isOpen,
  actionType,
  sessionContext,
  onRuleSelected,
  onCreateNewRule,
  onCancel
}) => {
  // 状态管理
  const [rules, setRules] = useState<ExceptionRule[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | undefined>(15);
  const [isIndefinite, setIsIndefinite] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{
    rule: ExceptionRule;
    isDefault: boolean;
  } | null>(null);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 工具实例
  const searchOptimizer = useMemo(() => new RuleSearchOptimizer(), []);
  const ruleCache = useMemo(() => new ExceptionRuleCache(), []);
  const { startMonitoring, stopMonitoring } = useLayoutStability(containerRef);

  // 创建默认预设规则
  const createDefaultPresetRules = useCallback(async (chainId: string, actionType: string): Promise<ExceptionRule[]> => {
    try {
      console.log('🏗️ 创建默认预设规则:', { chainId, actionType });
      
      const defaultRuleConfigs = actionType === 'pause' 
        ? [
            { name: '上厕所', description: '临时生理需求，短时间暂停任务' },
            { name: '接电话', description: '处理重要电话或紧急沟通' }
          ]
        : [
            { name: '提前达成目标', description: '任务目标已提前完成，可以结束当前任务' }
          ];

      const defaultRules: ExceptionRule[] = defaultRuleConfigs.map((config, index) => ({
        id: `default-${chainId}-${actionType}-${index}`,
        name: config.name,
        description: config.description,
        type: actionType === 'pause' ? ExceptionRuleType.PAUSE_ONLY : ExceptionRuleType.EARLY_COMPLETION_ONLY,
        chainId,
        scope: 'chain' as const,
        isActive: true,
        isArchived: false,
        createdAt: new Date(),
        usageCount: 0,
        lastUsedAt: undefined
      }));

      console.log('✅ 默认预设规则创建完成:', defaultRules.length, '个规则');
      return defaultRules;
    } catch (error) {
      console.error('❌ 创建默认预设规则失败:', error);
      // 即使创建默认规则失败，也返回空数组而不是抛出错误
      return [];
    }
  }, []);

  // 从实际存储获取规则
  const fetchChainRulesFromAPI = useCallback(async (chainId: string, actionType: string): Promise<ExceptionRule[]> => {
    try {
      console.log('🔄 开始获取规则:', { chainId, actionType });
      
      // 获取所有规则
      const allRules = await exceptionRuleManager.getAllRules();
      
      // 过滤出当前链的规则，并且适用于当前操作类型
      const applicableRules = allRules.filter(rule => {
        // 只显示活跃的规则
        if (!rule.isActive) {
          return false;
        }
        
        // 严格的链条ID验证：只显示当前链的专属规则，不包含全局规则
        // 这样可以防止规则跨链使用
        const isCurrentChainRule = rule.scope === 'chain' && rule.chainId === chainId;
        
        if (!isCurrentChainRule) {
          console.log('🚫 规则被过滤（链条不匹配）:', {
            规则名称: rule.name,
            规则链ID: rule.chainId,
            当前链ID: chainId,
            规则作用域: rule.scope,
            是否匹配: isCurrentChainRule
          });
          return false;
        }
        
        // 检查规则类型是否匹配
        const typeMatches = actionType === 'pause' 
          ? rule.type === ExceptionRuleType.PAUSE_ONLY
          : rule.type === ExceptionRuleType.EARLY_COMPLETION_ONLY;
          
        if (!typeMatches) {
          console.log('🚫 规则被过滤（类型不匹配）:', {
            规则名称: rule.name,
            规则类型: rule.type,
            期望类型: actionType === 'pause' ? 'PAUSE_ONLY' : 'EARLY_COMPLETION_ONLY'
          });
        }
          
        return typeMatches;
      });
      
      // 规则装载前的链条ID验证机制
      const validatedRules = applicableRules.filter(rule => {
        // 验证链专属规则的chainId是否与当前链匹配
        if (rule.scope === 'chain') {
          if (rule.chainId !== chainId) {
            console.error('🚨 发现跨链规则，已被阻止装载:', {
              规则名称: rule.name,
              规则链ID: rule.chainId,
              当前链ID: chainId,
              规则ID: rule.id
            });
            return false;
          }
          
          // 验证chainId格式
          if (!rule.chainId || rule.chainId.trim() === '') {
            console.error('🚨 发现无效链条ID的规则，已被阻止装载:', {
              规则名称: rule.name,
              规则链ID: rule.chainId,
              规则ID: rule.id
            });
            return false;
          }
        }
        
        return true;
      });
      
      console.log('🔍 规则过滤和验证结果:', {
        总规则数: allRules.length,
        活跃规则数: allRules.filter(r => r.isActive).length,
        过滤后规则数: applicableRules.length,
        验证后规则数: validatedRules.length,
        被阻止的跨链规则数: applicableRules.length - validatedRules.length,
        chainId,
        actionType,
        最终规则: validatedRules.map(r => ({ name: r.name, type: r.type, scope: r.scope, chainId: r.chainId }))
      });

      // 如果没有规则，创建一些默认的预设规则
      if (validatedRules.length === 0) {
        console.log('📝 没有找到适用规则，创建默认规则');
        const defaultRules = await createDefaultPresetRules(chainId, actionType);
        return defaultRules;
      }

      return validatedRules;
    } catch (error) {
      console.error('❌ 获取规则失败:', error);
      
      // 根据错误类型提供更详细的日志
      if (error instanceof Error) {
        if (error.message.includes('NETWORK_ERROR')) {
          console.error('网络连接失败，使用默认规则');
        } else if (error.message.includes('STORAGE_ERROR')) {
          console.error('存储访问失败，使用默认规则');
        } else {
          console.error('未知错误，使用默认规则:', error.message);
        }
      }
      
      // 如果获取失败，返回默认预设规则
      return createDefaultPresetRules(chainId, actionType);
    }
  }, [createDefaultPresetRules]);

  // 加载链专属规则
  const loadChainRules = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📋 开始加载规则列表:', { chainId: sessionContext.chainId, actionType });

      // 尝试从缓存获取
      let chainRules = ruleCache.getChainRules(sessionContext.chainId);
      
      if (!chainRules) {
        // 从实际的规则存储中获取规则
        chainRules = await fetchChainRulesFromAPI(sessionContext.chainId, actionType);
        ruleCache.setChainRules(sessionContext.chainId, chainRules);
      }

      setRules(chainRules);
      console.log('✅ 规则列表加载成功:', chainRules.length, '个规则');
    } catch (err) {
      console.error('❌ 加载规则失败:', err);
      
      let errorMessage = '加载规则失败';
      if (err instanceof Error) {
        if (err.message.includes('NETWORK_ERROR')) {
          errorMessage = '网络错误：无法连接到服务器，请检查网络连接';
        } else if (err.message.includes('PERMISSION_DENIED')) {
          errorMessage = '权限错误：无法访问规则数据';
        } else if (err.message.includes('STORAGE_ERROR')) {
          errorMessage = '存储错误：无法读取规则数据';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [sessionContext.chainId, actionType, ruleCache, fetchChainRulesFromAPI]);

  // 初始化和清理
  useEffect(() => {
    if (isOpen) {
      startMonitoring();
      loadChainRules();
      // 聚焦搜索框
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      stopMonitoring();
      // 重置状态
      setSearchQuery('');
      setError(null);
      // 清除搜索优化器的防抖定时器
      searchOptimizer.clearCache();
    }

    return () => {
      stopMonitoring();
      // 清除搜索优化器的防抖定时器
      searchOptimizer.clearCache();
    };
  }, [isOpen, sessionContext.chainId, loadChainRules, startMonitoring, stopMonitoring]);

  // 搜索处理
  useEffect(() => {
    if (rules.length === 0) return;

    const performSearch = () => {
      searchOptimizer.updateIndex(rules);
      
      if (searchQuery.trim()) {
        // 直接调用同步搜索，避免防抖延迟
        const results = searchOptimizer.searchRules(rules, searchQuery);
        setSearchResults(results);
      } else {
        // 无搜索时按使用频率排序
        const sortedRules = [...rules]
          .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
          .map(rule => ({
            rule,
            score: rule.usageCount || 0,
            matchType: 'exact' as const,
            highlightRanges: []
          }));
        setSearchResults(sortedRules);
      }
    };

    performSearch();
  }, [rules, searchQuery, searchOptimizer]);



  // 选择规则
  const handleRuleSelect = useCallback(async (rule: ExceptionRule) => {
    try {
      console.log('🎯 开始选择规则:', { rule: rule.name, actionType });
      
      let finalRule = rule;

      // 检查是否是默认规则（ID以default-开头），如果是则先保存为真实规则
      if (rule.id.startsWith('default-')) {
        try {
          console.log('💾 保存默认规则为真实规则:', rule.name);
          
          // 使用createChainRule确保创建链专属规则
          const result = await exceptionRuleManager.createChainRule(
            sessionContext.chainId,
            rule.name,
            rule.type,
            rule.description || `用户使用的默认规则: ${rule.name}`
          );
          finalRule = result.rule;
          
          // 更新规则列表，替换默认规则为真实规则
          setRules(prevRules => 
            prevRules.map(r => r.id === rule.id ? finalRule : r)
          );
          
          // 更新搜索结果
          setSearchResults(prevResults => 
            prevResults.map(result => 
              result.rule.id === rule.id 
                ? { ...result, rule: finalRule }
                : result
            )
          );
          
          // 清除缓存以确保下次加载时获取最新数据
          ruleCache.clearChainCache(sessionContext.chainId);
          
          console.log('✅ 默认规则已保存为链专属规则:', {
            ruleName: finalRule.name,
            ruleId: finalRule.id,
            chainId: finalRule.chainId,
            scope: finalRule.scope
          });
        } catch (error) {
          console.error('❌ 保存默认规则失败:', error);
          
          // 如果是重复名称错误，尝试查找已存在的规则
          if (error instanceof Error && error.message.includes('DUPLICATE')) {
            try {
              console.log('🔍 规则名称重复，尝试查找已存在的规则');
              const existingRules = await exceptionRuleManager.getAllRules();
              const existingRule = existingRules.find(r => 
                r.name === rule.name && 
                r.chainId === sessionContext.chainId && 
                r.type === rule.type
              );
              
              if (existingRule) {
                console.log('✅ 找到已存在的规则，使用该规则:', existingRule.name);
                finalRule = existingRule;
              } else {
                console.warn('⚠️ 未找到已存在的规则，继续使用默认规则');
              }
            } catch (searchError) {
              console.error('❌ 查找已存在规则失败:', searchError);
            }
          } else {
            // 其他错误，显示错误信息但继续使用默认规则
            setError(`保存规则失败: ${error instanceof Error ? error.message : '未知错误'}`);
          }
        }
      }
      
      const pauseOptions: PauseOptions | undefined = actionType === 'pause' ? {
        duration: isIndefinite ? undefined : (duration || 0) * 60,
        autoResume: !isIndefinite
      } : undefined;

      console.log('🚀 调用父组件回调:', { finalRule: finalRule.name, pauseOptions });

      // 调用父组件的回调
      if (actionType === 'pause') {
        onRuleSelected(finalRule, pauseOptions);
      } else {
        onRuleSelected(finalRule);
      }
      
      console.log('🎉 规则选择完成');
    } catch (err) {
      console.error('❌ 选择规则失败:', err);
      
      let errorMessage = '选择规则失败';
      if (err instanceof Error) {
        if (err.message.includes('VALIDATION_ERROR')) {
          errorMessage = '验证错误：规则数据无效';
        } else if (err.message.includes('STORAGE_ERROR')) {
          errorMessage = '存储错误：无法保存规则使用记录';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    }
  }, [actionType, duration, isIndefinite, onRuleSelected]);

  // 删除规则
  const handleDeleteRule = useCallback(async (rule: ExceptionRule) => {
    try {
      console.log('🗑️ 准备删除规则:', rule.name);
      
      // 检查是否是默认规则
      const isDefaultRule = rule.id.startsWith('default-') || 
                           ['上厕所', '接电话'].includes(rule.name);
      
      console.log('🔍 规则类型检查:', { isDefault: isDefaultRule, ruleId: rule.id });
      
      // 显示确认对话框
      setShowDeleteConfirm({ rule, isDefault: isDefaultRule });
    } catch (err) {
      console.error('❌ 准备删除规则失败:', err);
      
      let errorMessage = '删除规则失败';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    }
  }, []);

  // 确认删除规则
  const handleConfirmDelete = useCallback(async () => {
    if (!showDeleteConfirm) return;
    
    const { rule, isDefault } = showDeleteConfirm;
    
    try {
      if (isDefault) {
        // 默认规则不可删除
        setError('默认规则不可删除');
        setShowDeleteConfirm(null);
        return;
      }

      console.log('🗑️ 开始删除规则:', rule.name);
      await exceptionRuleManager.deleteRule(rule.id);
      
      // 清除缓存并重新加载规则列表
      ruleCache.clearChainCache(sessionContext.chainId);
      await loadChainRules();
      
      console.log('✅ 规则删除成功:', rule.name);
      setShowDeleteConfirm(null);
    } catch (err) {
      console.error('❌ 删除规则失败:', err);
      
      let errorMessage = '删除规则失败';
      if (err instanceof Error) {
        if (err.message.includes('STORAGE_ERROR')) {
          errorMessage = '存储错误：无法删除规则，请检查存储权限';
        } else if (err.message.includes('RULE_IN_USE')) {
          errorMessage = '规则正在使用中，无法删除';
        } else if (err.message.includes('NOT_FOUND')) {
          errorMessage = '规则不存在或已被删除';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      setShowDeleteConfirm(null);
    }
  }, [showDeleteConfirm, loadChainRules, ruleCache, sessionContext.chainId]);

  // 取消删除
  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirm(null);
  }, []);

  // 创建新规则
  const handleCreateNewRule = useCallback(async (inputName?: string) => {
    const name = inputName || searchQuery.trim();
    if (!name) return;

    try {
      const ruleType = actionType === 'pause' 
        ? ExceptionRuleType.PAUSE_ONLY 
        : ExceptionRuleType.EARLY_COMPLETION_ONLY;

      // 检查重复 - 确保name是字符串
      const cleanName = String(name).trim();
      if (!cleanName) {
        setError('规则名称不能为空');
        return;
      }
      
      // 使用后端的作用域感知重复检测
      const duplicateCheck = await exceptionRuleManager.checkRuleNameRealTime(
        cleanName, 
        undefined, // excludeId
        'chain', // scope
        sessionContext.chainId // chainId
      );
      
      console.log('🔍 重复检测结果:', {
        规则名称: cleanName,
        当前链ID: sessionContext.chainId,
        有冲突: duplicateCheck.hasConflict,
        冲突信息: duplicateCheck.conflictMessage
      });
      
      if (duplicateCheck.hasConflict) {
        setError(duplicateCheck.conflictMessage || `规则名称 "${cleanName}" 已存在于当前任务链中`);
        return;
      }

      // 创建链专属规则
      console.log('🚀 开始创建规则:', {
        name: cleanName,
        type: ruleType,
        actionType,
        chainId: sessionContext.chainId
      });
      
      const createResult = await exceptionRuleManager.createChainRule(
        sessionContext.chainId, 
        cleanName, 
        ruleType, 
        `用户创建的${actionType === 'pause' ? '暂停' : '提前完成'}规则`
      );
      
      console.log('✅ 链专属规则创建成功:', createResult.rule.name);
      
      // 显示警告信息（如果有）
      if (createResult.warnings && createResult.warnings.length > 0) {
        console.warn('创建规则时的警告:', createResult.warnings);
      }
      
      // 刷新规则列表
      await loadChainRules();
      
      // 通知父组件规则已创建
      onCreateNewRule(cleanName, ruleType);
      
      console.log('🎉 规则创建流程完成');
    } catch (err) {
      console.error('❌ 创建规则失败:', err);
      
      let errorMessage = '创建规则失败';
      if (err instanceof Error) {
        if (err.message.includes('STORAGE_ERROR')) {
          errorMessage = '存储错误：无法保存规则，请检查存储权限';
        } else if (err.message.includes('VALIDATION_ERROR')) {
          errorMessage = '验证错误：规则数据格式不正确';
        } else if (err.message.includes('DUPLICATE')) {
          errorMessage = '规则名称已存在，请使用其他名称';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    }
  }, [searchQuery, rules, actionType, sessionContext.chainId, onCreateNewRule, searchOptimizer, loadChainRules]);





  // 获取操作显示名称
  const getActionDisplayName = (): string => {
    return actionType === 'pause' ? '暂停计时' : '提前完成';
  };

  // 获取操作颜色
  const getActionColor = (): string => {
    return actionType === 'pause' 
      ? 'text-yellow-600 dark:text-yellow-400'
      : 'text-green-600 dark:text-green-400';
  };

  // 获取操作背景色
  const getActionBgColor = (): string => {
    return actionType === 'pause'
      ? 'bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/30'
      : 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-0 top-10 bottom-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9998] p-4">
      <div 
        ref={containerRef}
        className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-2xl max-h-[calc(100vh-2.5rem)] flex flex-col overflow-hidden shadow-2xl"
        style={{ maxWidth: 'min(640px, 100vw - 2rem)' }}
      >
        {/* 固定头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${getActionBgColor()}`}>
              {actionType === 'pause' ? (
                <Clock className={getActionColor()} size={20} />
              ) : (
                <CheckCircle className={getActionColor()} size={20} />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                选择例外规则
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                为{getActionDisplayName()}操作选择适用的规则
              </p>
            </div>
          </div>
          
          <button
            onClick={onCancel}
            className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* 固定的任务信息区域 */}
        <div className="flex-shrink-0">
          <div className={`mx-6 mt-4 p-4 rounded-2xl border ${getActionBgColor()}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {sessionContext.chainName}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  已进行 {Math.floor(sessionContext.elapsedTime / 60)} 分钟
                  {sessionContext.remainingTime && (
                    <span>，剩余 {Math.floor(sessionContext.remainingTime / 60)} 分钟</span>
                  )}
                </p>
              </div>
              <div className={`text-2xl font-mono ${getActionColor()}`}>
                {Math.floor(sessionContext.elapsedTime / 60)}:{(sessionContext.elapsedTime % 60).toString().padStart(2, '0')}
              </div>
            </div>
          </div>

          

          {/* 暂停时间设置（仅暂停操作显示） */}
          {actionType === 'pause' && (
            <div className="mx-6 mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl">
              <h3 className="font-medium text-gray-900 dark:text-white mb-3">暂停时长设置</h3>
              <div className="flex items-center space-x-4">
                <input
                  type="number"
                  min="1"
                  value={duration || ''}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  placeholder="输入分钟"
                  disabled={isIndefinite}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-200 dark:disabled:bg-gray-600"
                />
              </div>
              <div className="flex items-center justify-end mt-2">
                  <label htmlFor="isIndefinite" className="text-sm text-gray-600 dark:text-gray-400 mr-2">无限时间</label>
                  <input
                    type="checkbox"
                    id="isIndefinite"
                    checked={isIndefinite}
                    onChange={(e) => {
                        setIsIndefinite(e.target.checked);
                        if (e.target.checked) {
                            setDuration(undefined);
                        }
                    }}
                    className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
              </div>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="mx-6 mt-4 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-2xl">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                <div className="flex-1">
                  <div className="text-red-700 dark:text-red-300 font-medium mb-1">
                    操作失败
                  </div>
                  <div className="text-red-600 dark:text-red-400 text-sm">
                    {error}
                  </div>
                  <div className="text-red-500 dark:text-red-500 text-xs mt-2">
                    如果问题持续存在，请尝试刷新页面或联系技术支持
                  </div>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-red-500 hover:text-red-700 flex-shrink-0 p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                  title="关闭错误提示"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 可滚动内容区域 */}
        <div className="flex-1 overflow-y-auto" data-scroll-container>
          <div className="p-6">
            {/* 搜索栏 */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="搜索规则或输入新规则名称..."
                value={searchQuery}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearchQuery(value);
                  
                  // 立即处理搜索，避免防抖延迟
                  searchOptimizer.updateIndex(rules);
                  if (value.trim()) {
                    const results = searchOptimizer.searchRules(rules, value);
                    setSearchResults(results);
                  } else {
                    // 输入为空时立即重置搜索结果
                    const sortedRules = [...rules]
                      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
                      .map(rule => ({
                        rule,
                        score: rule.usageCount || 0,
                        matchType: 'exact' as const,
                        highlightRanges: []
                      }));
                    setSearchResults(sortedRules);
                  }
                }}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>



            {/* 虚拟化规则列表 */}
            <VirtualizedRuleList
              rules={searchResults}
              onSelect={handleRuleSelect}
              onDelete={handleDeleteRule}
              onCreateNew={searchQuery.trim() ? (name: string) => handleCreateNewRule(name) : undefined}
              searchQuery={searchQuery}
              isLoading={loading}
              itemHeight={60}
              containerHeight={300}
            />
          </div>
        </div>

        {/* 固定底部 */}
        <div className="flex-shrink-0 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {loading ? '正在加载...' : `${searchResults.length} 个可用规则`}
              {error && (
                <span className="text-red-500 ml-2">• 加载出错</span>
              )}
            </div>
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              取消操作
            </button>
          </div>
        </div>
      </div>
      
      {/* 删除确认对话框 */}
      <ConfirmationDialog
        isOpen={!!showDeleteConfirm}
        title={showDeleteConfirm?.isDefault ? "无法删除默认规则" : "确认删除规则"}
        message={
          showDeleteConfirm?.isDefault 
            ? `"${showDeleteConfirm.rule.name}" 是系统默认规则，不可删除。`
            : `确定要删除规则 "${showDeleteConfirm?.rule.name}" 吗？此操作无法撤销。`
        }
        confirmText={showDeleteConfirm?.isDefault ? "我知道了" : "删除"}
        cancelText="取消"
        confirmButtonClass={
          showDeleteConfirm?.isDefault 
            ? "bg-blue-500 hover:bg-blue-600" 
            : "bg-red-500 hover:bg-red-600"
        }
        onConfirm={showDeleteConfirm?.isDefault ? handleCancelDelete : handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
};