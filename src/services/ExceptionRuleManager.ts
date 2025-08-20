/**
 * 核心例外规则管理器
 * 集成存储、重复检测、分类和统计功能的主要业务逻辑层
 */

import {
  ExceptionRule,
  ExceptionRuleType,
  RuleUsageRecord,
  SessionContext,
  RuleUsageStats,
  OverallUsageStats,
  ExceptionRuleError,
  ExceptionRuleException
} from '../types';
import { exceptionRuleStorage } from './ExceptionRuleStorage';
import { ruleDuplicationDetector } from './RuleDuplicationDetector';
import { ruleClassificationService } from './RuleClassificationService';
import { ruleUsageTracker } from './RuleUsageTracker';
import { enhancedDuplicationHandler } from './EnhancedDuplicationHandler';
import { ruleStateManager } from './RuleStateManager';
import { enhancedRuleValidationService } from './EnhancedRuleValidationService';
import { dataIntegrityChecker } from './DataIntegrityChecker';
import { errorRecoveryManager } from './ErrorRecoveryManager';
import { userFeedbackHandler } from './UserFeedbackHandler';
import { errorClassificationService } from './ErrorClassificationService';

export class ExceptionRuleManager {
  private initialized = false;

  /**
   * 初始化管理器
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // 运行数据完整性检查
      const integrityReport = await dataIntegrityChecker.checkRuleDataIntegrity();
      
      if (integrityReport.issues.length > 0) {
        console.warn('发现数据完整性问题:', integrityReport.summary);
        
        // 自动修复可修复的问题
        const autoFixableIssues = integrityReport.issues.filter(issue => issue.autoFixable);
        if (autoFixableIssues.length > 0) {
          const fixResults = await dataIntegrityChecker.autoFixIssues(autoFixableIssues);
          const successCount = fixResults.filter(r => r.success).length;
          console.log(`已自动修复 ${successCount} 个数据问题`);
        }
      }

      // 同步规则状态
      await ruleStateManager.syncRuleStates();

      // 清理过期缓存
      enhancedRuleValidationService.cleanupExpiredCache();
      enhancedDuplicationHandler.cleanupExpiredCache();

      this.initialized = true;
      console.log('ExceptionRuleManager 初始化完成');

    } catch (error) {
      console.error('ExceptionRuleManager 初始化失败:', error);
      throw error;
    }
  }
  /**
   * 创建新的例外规则（完全增强版本）
   */
  async createRule(
    name: string, 
    type: ExceptionRuleType, 
    description?: string,
    userChoice?: 'use_existing' | 'modify_name' | 'create_anyway'
  ): Promise<{
    rule: ExceptionRule;
    warnings: string[];
  }> {
    // 确保初始化
    await this.initialize();

    try {
      // 验证输入（创建模式）
      console.log('🔧 ExceptionRuleManager.createRule 验证参数:', { name, type, description });
      exceptionRuleStorage.validateRule({ name, type, description }, true);

      // 使用增强的重复处理机制
      const result = await enhancedDuplicationHandler.handleDuplicateCreation(
        name, 
        type, 
        description, 
        userChoice
      );

      // 验证创建的规则
      const validationResult = await enhancedRuleValidationService.validateRulesIntegrity([result.rule]);
      if (validationResult.invalidRules.length > 0) {
        console.warn('创建的规则存在问题:', validationResult.invalidRules);
      }

      return {
        rule: result.rule,
        warnings: result.warnings
      };

    } catch (error) {
      // 使用错误分类服务分析错误
      const analysis = errorClassificationService.analyzeError(
        error instanceof ExceptionRuleException 
          ? error 
          : new ExceptionRuleException(ExceptionRuleError.STORAGE_ERROR, '创建规则失败', error)
      );

      // 尝试错误恢复
      const recoveryResult = await errorRecoveryManager.attemptRecovery(
        analysis.error, 
        { name, type, description, userChoice },
        'create_rule'
      );

      if (recoveryResult.success && recoveryResult.recoveredData) {
        return {
          rule: recoveryResult.recoveredData,
          warnings: ['通过错误恢复创建了规则']
        };
      }

      throw analysis.error;
    }
  }

  /**
   * 创建链专属规则
   */
  async createChainRule(
    chainId: string,
    name: string, 
    type: ExceptionRuleType, 
    description?: string
  ): Promise<{
    rule: ExceptionRule;
    warnings: string[];
  }> {
    // 确保初始化
    await this.initialize();

    try {
      // 验证输入
      console.log('🔧 ExceptionRuleManager.createChainRule 验证参数:', { chainId, name, type, description });
      exceptionRuleStorage.validateRule({ name, type, description }, true);

      // 使用增强的重复处理机制创建链专属规则
      const result = await enhancedDuplicationHandler.handleDuplicateCreation(
        name, 
        type, 
        description, 
        undefined, // userChoice
        'chain', // scope
        chainId
      );

      const rule = result.rule;

      // 验证创建的规则
      const validationResult = await enhancedRuleValidationService.validateRulesIntegrity([rule]);
      if (validationResult.invalidRules.length > 0) {
        console.warn('创建的链专属规则存在问题:', validationResult.invalidRules);
      }

      return {
        rule,
        warnings: []
      };

    } catch (error) {
      if (error instanceof ExceptionRuleException) {
        throw error;
      }
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        '创建链专属规则失败',
        error
      );
    }
  }

  /**
   * 实时检查规则名称重复（用于用户输入时）
   */
  async checkRuleNameRealTime(
    name: string, 
    excludeId?: string, 
    scope?: 'global' | 'chain', 
    chainId?: string
  ): Promise<{
    hasConflict: boolean;
    conflictMessage?: string;
    suggestions: Array<{
      type: string;
      title: string;
      description: string;
      suggestedName?: string;
    }>;
  }> {
    try {
      const result = await enhancedDuplicationHandler.checkDuplicationRealTime(name, excludeId, scope, chainId);
      
      return {
        hasConflict: result.hasConflict,
        conflictMessage: result.conflictMessage,
        suggestions: result.suggestions.map(s => ({
          type: s.type,
          title: s.title,
          description: s.description,
          suggestedName: s.suggestedName
        }))
      };
    } catch (error) {
      return {
        hasConflict: false,
        suggestions: []
      };
    }
  }

  /**
   * 更新例外规则
   */
  async updateRule(
    id: string, 
    updates: Partial<Pick<ExceptionRule, 'name' | 'type' | 'description'>>
  ): Promise<{
    rule: ExceptionRule;
    warnings: string[];
  }> {
    try {
      const warnings: string[] = [];

      // 验证更新数据
      if (updates.name !== undefined || updates.type !== undefined || updates.description !== undefined) {
        exceptionRuleStorage.validateRule(updates);
      }

      // 如果更新名称，检查重复
      if (updates.name) {
        const duplicationReport = await ruleDuplicationDetector.getDuplicationReport(updates.name, id);
        
        if (duplicationReport.hasExactMatch) {
          throw new ExceptionRuleException(
            ExceptionRuleError.DUPLICATE_RULE_NAME,
            `规则名称 "${updates.name}" 已存在`,
            { existingRules: duplicationReport.exactMatches }
          );
        }

        if (duplicationReport.hasSimilarRules) {
          warnings.push(`发现相似规则: ${duplicationReport.similarRules.map(r => r.rule.name).join(', ')}`);
        }
      }

      // 更新规则
      const rule = await exceptionRuleStorage.updateRule(id, updates);

      return { rule, warnings };
    } catch (error) {
      if (error instanceof ExceptionRuleException) {
        throw error;
      }
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        '更新规则失败',
        error
      );
    }
  }

  /**
   * 删除例外规则
   */
  async deleteRule(id: string): Promise<void> {
    try {
      await exceptionRuleStorage.deleteRule(id);
    } catch (error) {
      if (error instanceof ExceptionRuleException) {
        throw error;
      }
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        '删除规则失败',
        error
      );
    }
  }

  /**
   * 获取规则详情
   */
  async getRuleById(id: string): Promise<ExceptionRule | null> {
    try {
      return await exceptionRuleStorage.getRuleById(id);
    } catch (error) {
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        '获取规则失败',
        error
      );
    }
  }

  /**
   * 获取所有规则
   */
  async getAllRules(): Promise<ExceptionRule[]> {
    try {
      return await exceptionRuleStorage.getRules();
    } catch (error) {
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        '获取规则列表失败',
        error
      );
    }
  }

  /**
   * 根据类型获取规则
   */
  async getRulesByType(type: ExceptionRuleType): Promise<ExceptionRule[]> {
    try {
      return await ruleClassificationService.getRulesByType(type);
    } catch (error) {
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        '获取分类规则失败',
        error
      );
    }
  }

  /**
   * 获取适用于指定操作的规则
   */
  async getRulesForAction(actionType: 'pause' | 'early_completion'): Promise<ExceptionRule[]> {
    try {
      return await ruleClassificationService.getRulesForAction(actionType);
    } catch (error) {
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        '获取操作规则失败',
        error
      );
    }
  }

  /**
   * 验证规则是否可用于指定操作
   */
  async validateRuleForAction(ruleId: string, actionType: 'pause' | 'early_completion'): Promise<boolean> {
    try {
      await ruleClassificationService.validateRuleForAction(ruleId, actionType);
      return true;
    } catch (error) {
      if (error instanceof ExceptionRuleException) {
        return false;
      }
      throw error;
    }
  }

  /**
   * 使用规则执行操作（增强版本）
   */
  async useRule(
    ruleId: string, 
    sessionContext: SessionContext, 
    actionType: 'pause' | 'early_completion',
    pauseOptions?: any
  ): Promise<{
    record: RuleUsageRecord;
    rule: ExceptionRule;
  }> {
    try {
      // 验证规则ID，如果失败则重试
      console.log('🔧 验证规则ID:', ruleId);
      let validation = await ruleStateManager.validateRuleId(ruleId);
      console.log('🔧 验证结果:', validation);
      
      // 如果验证失败且规则ID看起来是新创建的，等待一段时间后重试
      if (!validation.isValid && ruleId.includes('_')) {
        console.log('🔧 规则验证失败，等待后重试...');
        await new Promise(resolve => setTimeout(resolve, 500)); // 等待500ms
        validation = await ruleStateManager.validateRuleId(ruleId);
        console.log('🔧 重试验证结果:', validation);
      }
      
      if (!validation.isValid) {
        console.error('❌ 规则ID验证失败:', validation);
        throw new ExceptionRuleException(
          ExceptionRuleError.RULE_NOT_FOUND,
          validation.error || `规则 ID ${ruleId} 无效`
        );
      }

      // 获取真实规则ID
      const realRuleId = validation.realId || ruleId;

      // 如果是临时ID，等待创建完成
      let rule: ExceptionRule | null = null;
      if (validation.isTemporary) {
        rule = await ruleStateManager.waitForRuleCreation(ruleId);
      } else {
        rule = await exceptionRuleStorage.getRuleById(realRuleId);
      }

      if (!rule) {
        throw new ExceptionRuleException(
          ExceptionRuleError.RULE_NOT_FOUND,
          `规则 ID ${ruleId} 不存在`
        );
      }

      // 验证规则是否可用于此操作
      await ruleClassificationService.validateRuleForAction(realRuleId, actionType);

      // 记录使用
      const record = await ruleUsageTracker.recordUsage(realRuleId, sessionContext, actionType);

      return { record, rule };
    } catch (error) {
      if (error instanceof ExceptionRuleException) {
        throw error;
      }
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        '使用规则失败',
        error
      );
    }
  }

  /**
   * 创建规则（乐观更新版本）
   */
  createRuleOptimistic(
    name: string, 
    type: ExceptionRuleType, 
    description?: string
  ): { temporaryRule: ExceptionRule; temporaryId: string; promise: Promise<ExceptionRule> } {
    const { temporaryRule, temporaryId } = ruleStateManager.startOptimisticCreation(name, type, description);
    
    const promise = ruleStateManager.waitForRuleCreation(temporaryId);
    
    return { temporaryRule, temporaryId, promise };
  }

  /**
   * 搜索规则
   */
  async searchRules(
    query: string, 
    type?: ExceptionRuleType, 
    actionType?: 'pause' | 'early_completion'
  ): Promise<ExceptionRule[]> {
    try {
      // 如果指定了操作类型，转换为规则类型
      let searchType = type;
      if (!searchType && actionType) {
        searchType = actionType === 'pause' 
          ? ExceptionRuleType.PAUSE_ONLY 
          : ExceptionRuleType.EARLY_COMPLETION_ONLY;
      }

      return await ruleClassificationService.searchRules(query, searchType);
    } catch (error) {
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        '搜索规则失败',
        error
      );
    }
  }

  /**
   * 获取规则使用建议
   */
  async getRuleUsageSuggestions(actionType: 'pause' | 'early_completion'): Promise<{
    mostUsed: ExceptionRule[];
    recentlyUsed: ExceptionRule[];
    suggested: ExceptionRule[];
  }> {
    try {
      return await ruleClassificationService.getRuleUsageSuggestions(actionType);
    } catch (error) {
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        '获取使用建议失败',
        error
      );
    }
  }

  /**
   * 获取规则统计信息
   */
  async getRuleStats(ruleId: string): Promise<RuleUsageStats> {
    try {
      return await ruleUsageTracker.getRuleUsageStats(ruleId);
    } catch (error) {
      if (error instanceof ExceptionRuleException) {
        throw error;
      }
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        '获取规则统计失败',
        error
      );
    }
  }

  /**
   * 获取整体统计信息
   */
  async getOverallStats(): Promise<OverallUsageStats> {
    try {
      return await ruleUsageTracker.getOverallUsageStats();
    } catch (error) {
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        '获取整体统计失败',
        error
      );
    }
  }

  /**
   * 获取规则使用历史
   */
  async getRuleUsageHistory(ruleId: string, limit?: number): Promise<RuleUsageRecord[]> {
    try {
      return await ruleUsageTracker.getRuleUsageHistory(ruleId, limit);
    } catch (error) {
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        '获取使用历史失败',
        error
      );
    }
  }

  /**
   * 获取重复检测建议
   */
  async getDuplicationSuggestions(name: string, excludeId?: string): Promise<{
    hasExactMatch: boolean;
    exactMatches: ExceptionRule[];
    hasSimilarRules: boolean;
    similarRules: Array<{ rule: ExceptionRule; similarity: number }>;
    suggestion: ExceptionRule | null;
    nameSuggestions: string[];
  }> {
    try {
      const report = await ruleDuplicationDetector.getDuplicationReport(name, excludeId);
      const existingNames = (await this.getAllRules()).map(r => r.name);
      const nameSuggestions = ruleDuplicationDetector.generateNameSuggestions(name, existingNames);

      return {
        ...report,
        nameSuggestions
      };
    } catch (error) {
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        '获取重复检测建议失败',
        error
      );
    }
  }

  /**
   * 批量导入规则
   */
  async importRules(
    rules: Array<Pick<ExceptionRule, 'name' | 'type' | 'description'>>,
    options: {
      skipDuplicates?: boolean;
      updateExisting?: boolean;
    } = {}
  ): Promise<{
    imported: ExceptionRule[];
    skipped: Array<{ name: string; reason: string }>;
    errors: Array<{ name: string; error: string }>;
  }> {
    const imported: ExceptionRule[] = [];
    const skipped: Array<{ name: string; reason: string }> = [];
    const errors: Array<{ name: string; error: string }> = [];

    for (const ruleData of rules) {
      try {
        // 检查重复
        const duplicates = await ruleDuplicationDetector.checkDuplication(ruleData.name);
        
        if (duplicates.length > 0) {
          if (options.skipDuplicates) {
            skipped.push({ 
              name: ruleData.name, 
              reason: '规则名称已存在' 
            });
            continue;
          } else if (options.updateExisting) {
            // 更新现有规则
            const existingRule = duplicates[0];
            const updated = await this.updateRule(existingRule.id, {
              type: ruleData.type,
              description: ruleData.description
            });
            imported.push(updated.rule);
            continue;
          } else {
            errors.push({ 
              name: ruleData.name, 
              error: '规则名称已存在' 
            });
            continue;
          }
        }

        // 创建新规则
        const result = await this.createRule(
          ruleData.name, 
          ruleData.type, 
          ruleData.description
        );
        imported.push(result.rule);

      } catch (error) {
        errors.push({ 
          name: ruleData.name, 
          error: error instanceof Error ? error.message : '未知错误' 
        });
      }
    }

    return { imported, skipped, errors };
  }

  /**
   * 导出规则数据
   */
  async exportRules(includeUsageData: boolean = false): Promise<{
    rules: ExceptionRule[];
    usageRecords?: RuleUsageRecord[];
    exportedAt: Date;
    summary: {
      totalRules: number;
      totalUsageRecords: number;
    };
  }> {
    try {
      const rules = await this.getAllRules();
      const activeRules = rules.filter(r => r.isActive);
      
      let usageRecords: RuleUsageRecord[] | undefined;
      if (includeUsageData) {
        usageRecords = await exceptionRuleStorage.getUsageRecords();
      }

      return {
        rules: activeRules,
        usageRecords,
        exportedAt: new Date(),
        summary: {
          totalRules: activeRules.length,
          totalUsageRecords: usageRecords?.length || 0
        }
      };
    } catch (error) {
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        '导出规则数据失败',
        error
      );
    }
  }

  /**
   * 获取规则类型统计
   */
  async getRuleTypeStats(): Promise<{
    total: number;
    pauseOnly: number;
    earlyCompletionOnly: number;
    mostUsedType: ExceptionRuleType | null;
    leastUsedType: ExceptionRuleType | null;
  }> {
    try {
      return await ruleClassificationService.getRuleTypeStats();
    } catch (error) {
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        '获取规则类型统计失败',
        error
      );
    }
  }

  /**
   * 获取推荐的规则类型
   */
  async getRecommendedRuleType(basedOnUsage: boolean = true): Promise<ExceptionRuleType> {
    try {
      return await ruleClassificationService.getRecommendedRuleType(basedOnUsage);
    } catch (error) {
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        '获取推荐规则类型失败',
        error
      );
    }
  }

  /**
   * 清理系统数据
   */
  async cleanupData(options: {
    removeExpiredRecords?: boolean;
    retentionDays?: number;
  } = {}): Promise<{
    removedRecords: number;
    cleanedAt: Date;
  }> {
    try {
      let removedRecords = 0;

      if (options.removeExpiredRecords) {
        removedRecords = await ruleUsageTracker.cleanupExpiredRecords(
          options.retentionDays || 90
        );
      }

      // 清理存储中的过期数据
      await exceptionRuleStorage.cleanupExpiredData();

      return {
        removedRecords,
        cleanedAt: new Date()
      };
    } catch (error) {
      throw new ExceptionRuleException(
        ExceptionRuleError.STORAGE_ERROR,
        '清理数据失败',
        error
      );
    }
  }

  /**
   * 获取系统健康状态
   */
  async getSystemHealth(): Promise<{
    status: 'healthy' | 'warning' | 'error';
    totalRules: number;
    activeRules: number;
    totalUsageRecords: number;
    lastUsedAt?: Date;
    issues: string[];
  }> {
    try {
      const allRules = await this.getAllRules();
      const activeRules = allRules.filter(r => r.isActive);
      const usageRecords = await exceptionRuleStorage.getUsageRecords();
      
      const issues: string[] = [];
      let status: 'healthy' | 'warning' | 'error' = 'healthy';

      // 检查规则数量
      if (activeRules.length === 0) {
        issues.push('没有活跃的例外规则');
        status = 'warning';
      }

      // 检查使用记录
      if (usageRecords.length === 0 && activeRules.length > 0) {
        issues.push('有规则但没有使用记录');
        status = 'warning';
      }

      // 检查最近使用时间
      const lastUsedAt = usageRecords.length > 0 
        ? new Date(Math.max(...usageRecords.map(r => r.usedAt.getTime())))
        : undefined;

      if (lastUsedAt) {
        const daysSinceLastUse = (Date.now() - lastUsedAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceLastUse > 30) {
          issues.push('超过30天未使用任何规则');
          status = 'warning';
        }
      }

      // 检查重复规则
      const ruleNames = activeRules.map(r => r.name);
      const duplicateNames = ruleNames.filter((name, index) => ruleNames.indexOf(name) !== index);
      if (duplicateNames.length > 0) {
        issues.push(`发现重复规则名称: ${duplicateNames.join(', ')}`);
        status = 'error';
      }

      return {
        status,
        totalRules: allRules.length,
        activeRules: activeRules.length,
        totalUsageRecords: usageRecords.length,
        lastUsedAt,
        issues
      };
    } catch (error) {
      return {
        status: 'error',
        totalRules: 0,
        activeRules: 0,
        totalUsageRecords: 0,
        issues: ['系统检查失败: ' + (error instanceof Error ? error.message : '未知错误')]
      };
    }
  }
}

// 创建全局实例
export const exceptionRuleManager = new ExceptionRuleManager();